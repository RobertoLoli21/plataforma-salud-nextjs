//app/dashboard/alertas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { auditarCierreAlerta } from '@/lib/audit';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Alerta {
  id: string;
  tipo_alerta: string;
  severidad: string;
  fecha_generacion: string;
  tbl_ninos: {
    id: string;
    nombres: string;
    apellidos: string;
  };
  tbl_controles_nutricionales: {
    hemoglobina: number;
  };
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  // 🆕 ESTADO PARA MODAL DE CONFIRMACIÓN
  const [showModalResolver, setShowModalResolver] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<string | null>(null);
  const [notaCierre, setNotaCierre] = useState('');

  const fetchAlertas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tbl_alertas')
      .select(`
        *,
        tbl_ninos (id, nombres, apellidos),
        tbl_controles_nutricionales (hemoglobina)
      `)
      .eq('estado', 'ACTIVA')
      .order('fecha_generacion', { ascending: false });

    if (error) console.error(error);
    if (data) setAlertas(data as any);
    setLoading(false);
  };

  // 🆕 ABRIR MODAL DE RESOLUCIÓN
  const abrirModalResolver = (id: string) => {
    setAlertaSeleccionada(id);
    setNotaCierre('');
    setShowModalResolver(true);
  };

  // 🆕 RESOLVER ALERTA CON AUDITORÍA
  const resolverAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alertaSeleccionada || !notaCierre.trim()) {
      alert('⚠️ Debe escribir una nota de resolución.');
      return;
    }

    setResolviendo(alertaSeleccionada);

    try {
      const { error } = await supabase
        .from('tbl_alertas')
        .update({ 
          estado: 'CERRADA', 
          nota_cierre: notaCierre.trim() 
        })
        .eq('id', alertaSeleccionada);

      if (error) {
        alert('❌ Error al resolver alerta: ' + error.message);
      } else {
        // 🆕 Auditar el cierre
        await auditarCierreAlerta(alertaSeleccionada, notaCierre.trim());
        
        alert('✅ Alerta resuelta correctamente.');
        setShowModalResolver(false);
        setAlertaSeleccionada(null);
        setNotaCierre('');
        fetchAlertas();
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      alert('❌ Error inesperado al resolver alerta.');
    } finally {
      setResolviendo(null);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <AlertTriangle className="text-red-600" />
        Monitor de Alertas Activas
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Fecha</th>
              <th className="p-4">Paciente</th>
              <th className="p-4">Alerta</th>
              <th className="p-4">Valor Crítico</th>
              <th className="p-4">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Buscando riesgos...</td></tr>
            ) : alertas.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-green-600 font-bold">¡Todo excelente! No hay alertas activas.</td></tr>
            ) : (
              alertas.map((alerta) => (
                <tr key={alerta.id} className="hover:bg-red-50 transition text-black">
                  <td className="p-4 text-sm">
                    {new Date(alerta.fecha_generacion).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-medium">
                    <Link href={`/dashboard/ninos/${alerta.tbl_ninos.id}`} className="hover:underline text-blue-600">
                      {alerta.tbl_ninos.nombres} {alerta.tbl_ninos.apellidos}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold 
                      ${alerta.severidad === 'SEVERA' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {alerta.tipo_alerta} ({alerta.severidad})
                    </span>
                  </td>
                  <td className="p-4 font-mono text-red-700">
                    Hb: {alerta.tbl_controles_nutricionales.hemoglobina}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => abrirModalResolver(alerta.id)}
                      disabled={resolviendo === alerta.id}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1 disabled:bg-gray-400"
                    >
                      {resolviendo === alerta.id ? (
                        <>Procesando...</>
                      ) : (
                        <>
                          <CheckCircle size={14} /> Resolver
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 🆕 MODAL DE RESOLUCIÓN */}
      {showModalResolver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Resolver Alerta</h3>
              <button 
                onClick={() => setShowModalResolver(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={resolverAlerta} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Escriba una nota explicando cómo se resolvió esta alerta (ej: "Se entregó suplemento de hierro", "Control de seguimiento programado").
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota de Resolución *
                </label>
                <textarea 
                  required
                  rows={3}
                  className="w-full border rounded-lg p-2 text-black"
                  placeholder="Escriba aquí las acciones tomadas..."
                  value={notaCierre}
                  onChange={e => setNotaCierre(e.target.value)}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowModalResolver(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!notaCierre.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Confirmar Resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}