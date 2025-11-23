//app/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { Calendar, AlertTriangle, Users, Activity, ArrowRight, Clock } from 'lucide-react';

export default function DashboardHome() {
  const [citasHoy, setCitasHoy] = useState<any[]>([]);
  const [alertasActivas, setAlertasActivas] = useState<number>(0);
  const [totalPacientes, setTotalPacientes] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase.from('tbl_usuarios').select('nombres').eq('id', user.id).single();
        setUserName(perfil?.nombres || 'Doctor');
      }

      // 2. Citas de HOY
      const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { data: citas } = await supabase
        .from('tbl_citas')
        .select('*, tbl_ninos(nombres, apellidos)')
        .eq('estado', 'PROGRAMADA')
        .gte('fecha_hora', `${hoy}T00:00:00`)
        .lte('fecha_hora', `${hoy}T23:59:59`)
        .order('fecha_hora', { ascending: true });
      
      if (citas) setCitasHoy(citas);

      // 3. Conteo Alertas
      const { count: alertas } = await supabase
        .from('tbl_alertas')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'ACTIVA');
      setAlertasActivas(alertas || 0);

      // 4. Total Pacientes
      const { count: ninos } = await supabase
        .from('tbl_ninos')
        .select('*', { count: 'exact', head: true });
      setTotalPacientes(ninos || 0);

      setLoading(false);
    };

    cargarDatos();
  }, []);

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Hola, {userName} 👋</h1>
        <p className="opacity-90">Aquí tienes el resumen operativo del día.</p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Pacientes Totales</p>
            <h3 className="text-3xl font-bold text-gray-800">{totalPacientes}</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Users size={24} /></div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:shadow-md transition">
          <div>
            <p className="text-gray-500 text-sm font-medium">Alertas Activas</p>
            <h3 className="text-3xl font-bold text-red-600">{alertasActivas}</h3>
          </div>
          <div className="bg-red-50 p-3 rounded-full text-red-600"><AlertTriangle size={24} /></div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">Citas para Hoy</p>
            <h3 className="text-3xl font-bold text-green-600">{citasHoy.length}</h3>
          </div>
          <div className="bg-green-50 p-3 rounded-full text-green-600"><Calendar size={24} /></div>
        </div>
      </div>

      {/* Sección Dividida: Agenda y Accesos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Agenda del Día (Ocupa 2 espacios) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" /> Agenda de Hoy
            </h3>
            <Link href="/dashboard/citas" className="text-sm text-blue-600 hover:underline flex items-center">
              Ver todo <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Cargando agenda...</div>
            ) : citasHoy.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>🎉 No hay citas pendientes para hoy.</p>
              </div>
            ) : (
              citasHoy.map((cita) => (
                <div key={cita.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded text-sm">
                      {new Date(cita.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{cita.tbl_ninos.nombres} {cita.tbl_ninos.apellidos}</p>
                      <p className="text-sm text-gray-500">{cita.motivo}</p>
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/ninos/${cita.nino_id}`}
                    className="px-3 py-1 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 text-gray-600"
                  >
                    Atender
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Accesos Directos */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Accesos Rápidos</h3>
            <div className="space-y-2">
              <Link href="/dashboard/ninos" className="block w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition flex items-center gap-3 text-gray-700">
                <div className="bg-white p-2 rounded shadow-sm"><Users size={16} className="text-blue-600"/></div>
                <div>
                    <span className="block font-bold text-sm">Buscar Paciente</span>
                    <span className="text-xs text-gray-500">Ver historial o registrar control</span>
                </div>
              </Link>
              <Link href="/dashboard/citas" className="block w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition flex items-center gap-3 text-gray-700">
                <div className="bg-white p-2 rounded shadow-sm"><Calendar size={16} className="text-green-600"/></div>
                <div>
                    <span className="block font-bold text-sm">Nueva Cita</span>
                    <span className="text-xs text-gray-500">Agendar consulta futura</span>
                </div>
              </Link>
              <Link href="/dashboard/reportes" className="block w-full p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-left transition flex items-center gap-3 text-gray-700">
                <div className="bg-white p-2 rounded shadow-sm"><Activity size={16} className="text-purple-600"/></div>
                <div>
                    <span className="block font-bold text-sm">Ver Métricas</span>
                    <span className="text-xs text-gray-500">Reportes de anemia y stock</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}