//app/dashboard/mis-ninos/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
// Importamos guardarEnCola para que el padre también tenga el superpoder offline
import { guardarEnCola } from '@/lib/offline-sync';
import { User, Calendar, Activity, ArrowRight, MapPin, Clock, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface Nino {
  id: string;
  nombres: string;
  apellidos: string;
  cod_historia_clinica: string;
}

interface Cita {
  id: string;
  fecha_hora: string;
  motivo: string;
  estado: string;
  nino_id: string;
}

export default function MisNinosPage() {
  const [misNinos, setMisNinos] = useState<Nino[]>([]);
  const [proximasCitas, setProximasCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- NUEVOS ESTADOS PARA AGENDAR ---
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const hoyISO = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    nino_id: '',
    fecha: hoyISO,
    hora: '',
    motivo: 'Control Rutinario'
  });

  const cargarDatos = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar perfil de cuidador
    const { data: cuidador } = await supabase
      .from('tbl_cuidadores')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (cuidador) {
      // 2. Buscar niños asociados
      const { data: relaciones } = await supabase
        .from('tbl_ninos_cuidadores')
        .select('*, tbl_ninos(*)')
        .eq('cuidador_id', cuidador.id);
      
      const listaNinos: Nino[] = [];
      const idsNinos: string[] = [];

      if (relaciones) {
          relaciones.forEach((r: any) => {
            if(r.tbl_ninos) {
              listaNinos.push(r.tbl_ninos);
              idsNinos.push(r.tbl_ninos.id);
            }
          });
          setMisNinos(listaNinos);

          // 3. Citas futuras (Programadas, Confirmadas o Canceladas)
          if (idsNinos.length > 0) {
            const hoy = new Date().toISOString();
            const { data: citas } = await supabase
              .from('tbl_citas')
              .select('*')
              .in('nino_id', idsNinos)
              .gte('fecha_hora', hoy) 
              .in('estado', ['PROGRAMADA', 'CONFIRMADA', 'CANCELADA']) 
              .order('fecha_hora', { ascending: true });
            
            if (citas) setProximasCitas(citas as any);
          }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const confirmarAsistencia = async (citaId: string) => {
    const { error } = await supabase
      .from('tbl_citas')
      .update({ estado: 'CONFIRMADA' })
      .eq('id', citaId);

    if (!error) {
      alert("¡Gracias! Hemos confirmado tu asistencia.");
      cargarDatos(); // Recargar para ver el cambio de color
    } else {
      alert("Error al confirmar.");
    }
  };

  // --- NUEVA FUNCIÓN: AGENDAR CITA COMO PADRE ---
  const handleAgendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Crear fecha combinada
    const fechaHoraCombinada = new Date(`${formData.fecha}T${formData.hora}`).toISOString();
    
    const payload = {
        nino_id: formData.nino_id,
        fecha_hora: fechaHoraCombinada,
        motivo: formData.motivo,
        estado: 'PROGRAMADA' // Se crea como programada
    };

    // Validar conexión para Offline/Online
    if (navigator.onLine) {
        const { error } = await supabase.from('tbl_citas').insert([payload]);
        if (error) {
            await guardarEnCola('tbl_citas', payload);
            alert('⚠️ Sin conexión estable. Tu solicitud se guardó en el teléfono y se enviará luego.');
        } else {
            alert('✅ ¡Cita solicitada con éxito!');
            cargarDatos();
        }
    } else {
        await guardarEnCola('tbl_citas', payload);
        // Feedback optimista (simulamos que aparece en la lista)
        const citaTemp: Cita = {
            id: 'temp-' + Date.now(),
            fecha_hora: fechaHoraCombinada,
            motivo: formData.motivo,
            estado: 'PROGRAMADA',
            nino_id: formData.nino_id
        };
        setProximasCitas([...proximasCitas, citaTemp]);
        alert('📦 Modo Offline: Solicitud guardada en tu dispositivo.');
    }

    setShowModal(false);
    setFormData({ ...formData, fecha: hoyISO, hora: '', motivo: '' });
    setSaving(false);
  };

  // Helper para encontrar la cita de un niño específico
  const getCitaNino = (ninoId: string) => {
    return proximasCitas.find(c => c.nino_id === ninoId);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando tu familia...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Cabecera con Botón de Agendar */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">Mi Familia</h1>
            <p className="text-gray-600">Gestiona la salud y citas de tus niños.</p>
        </div>
        {/* Solo mostramos el botón si tiene niños asociados */}
        {misNinos.length > 0 && (
            <button 
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl shadow-md hover:bg-blue-700 flex items-center gap-2 font-bold transition transform hover:scale-105"
            >
                <Plus size={20} /> Solicitar Cita
            </button>
        )}
      </div>

      {misNinos.length === 0 ? (
        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-center">
            <h3 className="text-yellow-800 font-bold mb-2">No tienes niños asociados</h3>
            <p className="text-sm text-yellow-700">Acércate al centro de salud y pide que vinculen tu correo con el DNI de tu niño.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {misNinos.map((nino) => {
            const cita = getCitaNino(nino.id);

            return (
              <div key={nino.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition flex flex-col">
                {/* Cabecera del Niño */}
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-full">
                          <User size={24} className="text-white"/>
                      </div>
                      <div>
                          <h3 className="font-bold text-lg">{nino.nombres}</h3>
                          <p className="text-blue-100 text-xs">H.C: {nino.cod_historia_clinica || '---'}</p>
                      </div>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col gap-4">
                   {/* TARJETA DE CITA INTELIGENTE */}
                   {cita ? (
                     <div className={`p-4 rounded-xl border ${
                        cita.estado === 'CANCELADA' ? 'bg-red-50 border-red-200' :
                        cita.estado === 'CONFIRMADA' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-100'
                     }`}>
                        <h4 className={`font-bold flex items-center gap-2 mb-2 ${cita.estado === 'CANCELADA' ? 'text-red-700' : 'text-gray-700'}`}>
                           <Calendar size={18} className={cita.estado === 'CANCELADA' ? 'text-red-600' : 'text-blue-600'}/>
                           {cita.estado === 'CANCELADA' ? 'Cita Cancelada' : 'Próxima Cita'}
                        </h4>
                        
                        <div className="space-y-2 text-sm text-gray-600 mb-3">
                           <div className="flex gap-2">
                              <Clock size={16}/> 
                              {new Date(cita.fecha_hora).toLocaleDateString()} - {new Date(cita.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                           <div className="flex gap-2">
                              <MapPin size={16}/> Consultorio Nutrición
                           </div>
                           <div className="text-xs italic bg-white/50 p-1 rounded">
                              "{cita.motivo}"
                           </div>
                        </div>

                        {cita.estado === 'PROGRAMADA' && (
                           <button 
                              onClick={() => confirmarAsistencia(cita.id)}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition"
                           >
                              <CheckCircle size={16} /> Confirmar que iré
                           </button>
                        )}
                        
                        {cita.estado === 'CONFIRMADA' && (
                           <div className="w-full py-2 text-green-700 font-medium text-sm flex items-center justify-center gap-2 border border-green-200 rounded-lg bg-white">
                              <CheckCircle size={16} /> ¡Te esperamos!
                           </div>
                        )}

                        {cita.estado === 'CANCELADA' && (
                           <div className="w-full py-2 text-red-700 font-medium text-sm flex items-center justify-center gap-2 border border-red-200 rounded-lg bg-white">
                              <XCircle size={16} /> Cancelada por el médico
                           </div>
                        )}
                     </div>
                   ) : (
                     <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center py-6">
                        <p className="text-gray-400 text-sm">No hay citas programadas próximamente.</p>
                     </div>
                   )}

                   {/* Botón para ver detalles (Historial) */}
                   <Link 
                      href={`/dashboard/ninos/${nino.id}`} 
                      className="mt-auto flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition group"
                   >
                      <div className="flex items-center gap-3 text-gray-700">
                          <Activity size={20} className="text-gray-400 group-hover:text-blue-600"/>
                          <span className="font-medium text-sm">Ver Historial de Peso y Talla</span>
                      </div>
                      <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-600"/>
                   </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL PARA AGENDAR CITA (SOLO PARA PADRES) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-gray-800">Solicitar Cita</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition"><X size={24} className="text-gray-500"/></button>
                </div>
                
                <form onSubmit={handleAgendar} className="p-6 space-y-5">
                    {/* 1. Seleccionar Niño (Solo muestra los asociados) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">¿Para quién es la cita?</label>
                        <select 
                            required 
                            className="w-full border-2 border-gray-200 rounded-xl p-3 text-black focus:border-blue-500 focus:ring-0 transition"
                            value={formData.nino_id}
                            onChange={e => setFormData({...formData, nino_id: e.target.value})}
                        >
                            <option value="">Selecciona a tu niño...</option>
                            {misNinos.map(n => (
                                <option key={n.id} value={n.id}>{n.nombres} {n.apellidos}</option>
                            ))}
                        </select>
                    </div>

                    {/* 2. Fecha y Hora */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Fecha</label>
                            <input 
                                type="date" 
                                required 
                                min={hoyISO}
                                className="w-full border-2 border-gray-200 rounded-xl p-3 text-black"
                                value={formData.fecha} 
                                onChange={e => setFormData({...formData, fecha: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Hora</label>
                            <input 
                                type="time" 
                                required
                                className="w-full border-2 border-gray-200 rounded-xl p-3 text-black"
                                value={formData.hora} 
                                onChange={e => setFormData({...formData, hora: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 3. Motivo */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Motivo de la visita</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="Ej: Fiebre, Control, etc."
                            className="w-full border-2 border-gray-200 rounded-xl p-3 text-black"
                            value={formData.motivo} 
                            onChange={e => setFormData({...formData, motivo: e.target.value})}
                        />
                    </div>

                    {/* Botones */}
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg hover:shadow-xl flex justify-center items-center gap-2"
                        >
                            {saving ? 'Enviando solicitud...' : 'Confirmar Solicitud'}
                        </button>
                        <p className="text-xs text-center text-gray-400 mt-3">La cita quedará sujeta a confirmación del médico.</p>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}