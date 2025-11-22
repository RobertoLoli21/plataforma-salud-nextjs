'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle, Filter } from 'lucide-react';
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

  const fetchAlertas = async () => {
    setLoading(true);
    // Traemos la alerta + datos del niño + datos del control
    const { data, error } = await supabase
      .from('tbl_alertas')
      .select(`
        *,
        tbl_ninos (id, nombres, apellidos),
        tbl_controles_nutricionales (hemoglobina)
      `)
      .eq('estado', 'ACTIVA') // Solo queremos las pendientes
      .order('fecha_generacion', { ascending: false });

    if (error) console.error(error);
    if (data) setAlertas(data as any);
    setLoading(false);
  };

  const resolverAlerta = async (id: string) => {
    const nota = prompt("Escriba una nota de resolución (Ej: Se entregó hierro):");
    if (!nota) return;

    const { error } = await supabase
      .from('tbl_alertas')
      .update({ estado: 'CERRADA', nota_cierre: nota })
      .eq('id', id);

    if (!error) {
      alert("Alerta resuelta correctamente");
      fetchAlertas(); // Recargar lista
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
              <tr><td colSpan={5} className="p-8 text-center text-green-600">¡Todo excelente! No hay alertas activas.</td></tr>
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
                      onClick={() => resolverAlerta(alerta.id)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                    >
                      <CheckCircle size={14} /> Resolver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}