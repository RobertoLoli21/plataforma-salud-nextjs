'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { guardarEnCola } from '@/lib/offline-sync';
import { Calendar, Clock, Check, X, Plus, User, CloudOff, CheckCircle } from 'lucide-react';

interface Cita {
  id: string;
  fecha_hora: string;
  estado: string;
  motivo: string;
  nino_id: string;
  tbl_ninos: {
    nombres: string;
    apellidos: string;
  };
  offline?: boolean;
}

interface NinoSimple {
  id: string;
  nombres: string;
  apellidos: string;
}

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [ninos, setNinos] = useState<NinoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const hoyISO = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    nino_id: '',
    fecha: hoyISO, 
    hora: '',
    motivo: 'Control Nutricional'
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: dataCitas } = await supabase
      .from('tbl_citas')
      .select('*, tbl_ninos(nombres, apellidos)')
      .order('fecha_hora', { ascending: true });
    
    if (dataCitas) setCitas(dataCitas as any);

    const { data: dataNinos } = await supabase.from('tbl_ninos').select('id, nombres, apellidos');
    if (dataNinos) setNinos(dataNinos);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const fechaHoraCombinada = new Date(`${formData.fecha}T${formData.hora}`).toISOString();

    const payload = {
      nino_id: formData.nino_id,
      fecha_hora: fechaHoraCombinada,
      motivo: formData.motivo,
      estado: 'PROGRAMADA'
    };

    if (navigator.onLine) {
      const { error } = await supabase.from('tbl_citas').insert([payload]);
      if (error) {
         console.log("Fallo red, guardando offline");
         await guardarEnCola('tbl_citas', payload);
         alert('⚠️ Sin señal. Cita guardada en el dispositivo.');
      } else {
         fetchData();
      }
    } else {
      await guardarEnCola('tbl_citas', payload);
      
      const ninoSeleccionado = ninos.find(n => n.id === formData.nino_id);
      const citaTemp: Cita = {
        id: 'temp-' + Date.now(),
        fecha_hora: fechaHoraCombinada,
        estado: 'PROGRAMADA',
        motivo: formData.motivo,
        nino_id: formData.nino_id,
        tbl_ninos: {
            nombres: ninoSeleccionado?.nombres || 'Paciente',
            apellidos: ninoSeleccionado?.apellidos || 'Temporal'
        },
        offline: true
      };
      
      setCitas([citaTemp, ...citas]);
      alert('📦 Modo Offline: Cita agendada en el dispositivo.');
    }

    setShowModal(false);
    setFormData({ ...formData, nino_id: '', fecha: hoyISO, hora: '' });
    setSaving(false);
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    if (!navigator.onLine) {
        alert("Para cambiar estados necesitas conexión a internet.");
        return;
    }
    
    if (nuevoEstado === 'CANCELADA' && !confirm("¿Estás seguro de cancelar esta cita? El cuidador verá el estado cancelado.")) return;

    await supabase.from('tbl_citas').update({ estado: nuevoEstado }).eq('id', id);
    fetchData();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="text-blue-600" />
          Agenda de Citas
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Agendar Cita
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-gray-500">Cargando agenda...</p>
        ) : citas.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center py-8">No hay citas programadas.</p>
        ) : (
          citas.map((cita) => {
            const fechaObj = new Date(cita.fecha_hora);
            const esHoy = new Date().toDateString() === new Date().toDateString();

            let borderClass = 'border-blue-500';
            if (cita.estado === 'CONFIRMADA') borderClass = 'border-green-500 bg-green-50/30';
            else if (cita.estado === 'ATENDIDA') borderClass = 'border-gray-400 opacity-70 bg-gray-50';
            else if (cita.estado === 'CANCELADA') borderClass = 'border-red-500 opacity-70 bg-red-50';
            if (cita.offline) borderClass = 'border-yellow-400 bg-yellow-50';

            return (
              <div 
                key={cita.id} 
                className={`bg-white p-4 rounded-lg shadow border-l-4 relative ${borderClass}`}
              >
                {cita.offline && (
                    <div className="absolute top-2 right-2 text-yellow-600 animate-pulse" title="Pendiente de subir">
                        <CloudOff size={16} />
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-gray-700 font-bold">
                    <User size={16} />
                    {cita.tbl_ninos?.nombres} {cita.tbl_ninos?.apellidos}
                  </div>
                  
                  {cita.estado === 'CONFIRMADA' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle size={10}/> Confirmada
                    </span>
                  )}
                  
                  {esHoy && cita.estado === 'PROGRAMADA' && !cita.offline && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">HOY</span>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {fechaObj.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    {fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs bg-gray-100 inline-block px-2 py-1 rounded">
                    {cita.motivo}
                  </div>
                </div>

                {/* --- CORRECCIÓN: Botones visibles si es PROGRAMADA o CONFIRMADA --- */}
                {(cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA') && !cita.offline && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    <button 
                      onClick={() => cambiarEstado(cita.id, 'ATENDIDA')}
                      className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm hover:bg-green-700 flex justify-center items-center gap-1 font-medium shadow-sm"
                    >
                      <Check size={14} /> Atender
                    </button>
                    <button 
                      onClick={() => cambiarEstado(cita.id, 'CANCELADA')}
                      className="flex-1 bg-white border border-red-200 text-red-600 py-1.5 rounded text-sm hover:bg-red-50 flex justify-center items-center gap-1 font-medium"
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                )}
                
                {(cita.estado === 'ATENDIDA' || cita.estado === 'CANCELADA') && (
                  <div className="mt-2 text-center text-sm font-bold text-gray-400 uppercase tracking-wide">
                    {cita.estado}
                  </div>
                )}

                {cita.offline && (
                    <div className="mt-2 text-xs text-yellow-700 font-semibold text-center bg-yellow-100 py-1 rounded">
                        ⏳ Pendiente de sincronización
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Nueva Cita</h3>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                <select 
                  required
                  className="w-full border rounded-lg p-2 text-black"
                  value={formData.nino_id}
                  onChange={e => setFormData({...formData, nino_id: e.target.value})}
                >
                  <option value="">Seleccione un niño...</option>
                  {ninos.map(n => (
                    <option key={n.id} value={n.id}>{n.nombres} {n.apellidos}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    min={hoyISO} 
                    className="w-full border rounded-lg p-2 text-black"
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
                  <input 
                    type="time" required
                    className="w-full border rounded-lg p-2 text-black"
                    value={formData.hora}
                    onChange={e => setFormData({...formData, hora: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2 text-black"
                  value={formData.motivo}
                  onChange={e => setFormData({...formData, motivo: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mt-4"
              >
                {saving ? 'Agendando...' : 'Confirmar Cita'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}