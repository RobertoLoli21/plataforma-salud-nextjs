//app/dashboard/evaluacion-alertas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface AlertMetrics {
  total_alertas: number;
  alertas_activas: number;
  alertas_cerradas: number;
  alertas_anemia: number;
  alertas_bajo_peso: number;
  tiempo_promedio_resolucion: number;
  tiempo_min_resolucion: number;
  tiempo_max_resolucion: number;
}

interface AlertaDetalle {
  id: string;
  tipo_alerta: string;
  severidad: string;
  estado: string;
  fecha_generacion: string;
  fecha_cierre: string | null;
  tiempo_resolucion_minutos: number | null;
  nota_cierre: string | null;
  nino_nombre: string;
}

export default function EvaluacionAlertasPage() {
  const [metricas, setMetricas] = useState<AlertMetrics | null>(null);
  const [alertasDetalle, setAlertasDetalle] = useState<AlertaDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);

    // 1. Obtener todas las alertas con detalles
    const { data: alertas } = await supabase
      .from('tbl_alertas')
      .select(`
        *,
        tbl_ninos (nombres, apellidos)
      `)
      .order('fecha_generacion', { ascending: false });

    if (alertas) {
      // Formatear detalles
      const detalles: AlertaDetalle[] = alertas.map((a: any) => ({
        id: a.id,
        tipo_alerta: a.tipo_alerta,
        severidad: a.severidad,
        estado: a.estado,
        fecha_generacion: a.fecha_generacion,
        fecha_cierre: a.fecha_cierre,
        tiempo_resolucion_minutos: a.tiempo_resolucion_minutos,
        nota_cierre: a.nota_cierre,
        nino_nombre: `${a.tbl_ninos?.nombres || ''} ${a.tbl_ninos?.apellidos || ''}`.trim()
      }));
      setAlertasDetalle(detalles);

      // 2. Calcular métricas
      const totalAlertas = alertas.length;
      const activas = alertas.filter(a => a.estado === 'ACTIVA').length;
      const cerradas = alertas.filter(a => a.estado === 'CERRADA').length;
      const anemia = alertas.filter(a => a.tipo_alerta === 'ANEMIA').length;
      const bajoPeso = alertas.filter(a => a.tipo_alerta === 'BAJO_PESO').length;

      // Calcular tiempos de resolución (solo alertas cerradas)
      const alertasCerradas = alertas.filter(a => a.estado === 'CERRADA' && a.tiempo_resolucion_minutos);
      const tiempos = alertasCerradas.map(a => a.tiempo_resolucion_minutos);
      
      const tiempoPromedio = tiempos.length > 0 
        ? tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length 
        : 0;
      const tiempoMin = tiempos.length > 0 ? Math.min(...tiempos) : 0;
      const tiempoMax = tiempos.length > 0 ? Math.max(...tiempos) : 0;

      setMetricas({
        total_alertas: totalAlertas,
        alertas_activas: activas,
        alertas_cerradas: cerradas,
        alertas_anemia: anemia,
        alertas_bajo_peso: bajoPeso,
        tiempo_promedio_resolucion: tiempoPromedio,
        tiempo_min_resolucion: tiempoMin,
        tiempo_max_resolucion: tiempoMax
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const exportarExcel = () => {
    if (alertasDetalle.length === 0) {
      alert('⚠️ No hay datos para exportar.');
      return;
    }

    // Preparar datos para Excel
    const datosExport = alertasDetalle.map(a => ({
      'ID Alerta': a.id.slice(0, 8),
      'Paciente': a.nino_nombre,
      'Tipo': a.tipo_alerta,
      'Severidad': a.severidad,
      'Estado': a.estado,
      'Fecha Generación': new Date(a.fecha_generacion).toLocaleString(),
      'Fecha Cierre': a.fecha_cierre ? new Date(a.fecha_cierre).toLocaleString() : '-',
      'Tiempo Resolución (min)': a.tiempo_resolucion_minutos || '-',
      'Nota Cierre': a.nota_cierre || '-'
    }));

    // Agregar hoja de resumen
    const resumen = [
      ['RESUMEN DE EVALUACIÓN DEL SISTEMA DE ALERTAS'],
      [''],
      ['Indicador', 'Valor'],
      ['Total de alertas generadas', metricas?.total_alertas || 0],
      ['Alertas activas', metricas?.alertas_activas || 0],
      ['Alertas cerradas', metricas?.alertas_cerradas || 0],
      ['Alertas por anemia', metricas?.alertas_anemia || 0],
      ['Alertas por bajo peso', metricas?.alertas_bajo_peso || 0],
      ['Tiempo promedio de resolución (minutos)', metricas?.tiempo_promedio_resolucion?.toFixed(2) || 0],
      ['Tiempo mínimo de resolución (minutos)', metricas?.tiempo_min_resolucion?.toFixed(2) || 0],
      ['Tiempo máximo de resolución (minutos)', metricas?.tiempo_max_resolucion?.toFixed(2) || 0]
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
    wsResumen['!cols'] = [{ wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 2: Detalle
    const wsDetalle = XLSX.utils.json_to_sheet(datosExport);
    wsDetalle['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, 
      { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Alertas');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Evaluacion_Alertas_${fecha}.xlsx`);
    alert('✅ Archivo exportado correctamente.');
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando evaluación de alertas...</div>;
  }

  if (!metricas) {
    return <div className="p-8 text-center text-red-600">Error al cargar datos.</div>;
  }

  // Datos para gráficos
  const dataTipoAlerta = [
    { name: 'Anemia', value: metricas.alertas_anemia },
    { name: 'Bajo Peso', value: metricas.alertas_bajo_peso }
  ];

  const dataEstado = [
    { name: 'Activas', value: metricas.alertas_activas },
    { name: 'Cerradas', value: metricas.alertas_cerradas }
  ];

  const COLORS_TIPO = ['#EF4444', '#F59E0B'];
  const COLORS_ESTADO = ['#DC2626', '#10B981'];

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="text-red-600" />
          Evaluación del Sistema de Alertas Clínicas
        </h1>
        <button
          onClick={exportarExcel}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-md"
        >
          <Download size={18} /> Exportar a Excel
        </button>
      </div>

      {/* INSTRUCCIONES */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">📋 Table 2: Clinical Alert System Evaluation</h3>
        <p className="text-blue-800 text-sm">
          Los valores de esta página se obtienen automáticamente desde la base de datos. 
          Registra controles con Hemoglobina &lt; 11 para generar alertas automáticas, 
          resuélvelas desde el módulo "Alertas", y los tiempos se calcularán automáticamente.
        </p>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Alertas Generadas</p>
              <h2 className="text-4xl font-bold text-gray-800 mt-1">{metricas.total_alertas}</h2>
            </div>
            <AlertTriangle className="text-red-200" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Alertas Activas</p>
              <h2 className="text-4xl font-bold text-yellow-600 mt-1">{metricas.alertas_activas}</h2>
            </div>
            <Clock className="text-yellow-200" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Alertas Cerradas</p>
              <h2 className="text-4xl font-bold text-green-600 mt-1">{metricas.alertas_cerradas}</h2>
            </div>
            <CheckCircle className="text-green-200" size={40} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm font-medium">Tiempo Promedio Resolución</p>
              <h2 className="text-4xl font-bold text-purple-600 mt-1">
                {metricas.tiempo_promedio_resolucion.toFixed(1)}
              </h2>
              <p className="text-xs text-gray-500 mt-1">minutos</p>
            </div>
            <TrendingUp className="text-purple-200" size={40} />
          </div>
        </div>
      </div>

      {/* TABLA DE RESULTADOS PARA EL INFORME */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">
            📊 Table 2: Clinical Alert System Evaluation Results
          </h2>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="p-4 border-b">Indicator</th>
              <th className="p-4 border-b text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium">Total active alerts generated</td>
              <td className="p-4 text-right text-2xl font-bold text-red-600">{metricas.total_alertas}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium">Alerts associated with low hemoglobin</td>
              <td className="p-4 text-right text-2xl font-bold text-red-600">{metricas.alertas_anemia}</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium">Alerts associated with low Z-score (weight/height)</td>
              <td className="p-4 text-right text-2xl font-bold text-yellow-600">{metricas.alertas_bajo_peso}</td>
            </tr>
            <tr className="hover:bg-blue-50 bg-blue-50">
              <td className="p-4 font-bold text-blue-900">Average time to resolve alert (minutes)</td>
              <td className="p-4 text-right text-3xl font-bold text-blue-700">
                {metricas.tiempo_promedio_resolucion.toFixed(2)}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-sm text-gray-600">• Minimum resolution time</td>
              <td className="p-4 text-right text-lg font-bold text-green-600">
                {metricas.tiempo_min_resolucion.toFixed(2)} min
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-sm text-gray-600">• Maximum resolution time</td>
              <td className="p-4 text-right text-lg font-bold text-red-600">
                {metricas.tiempo_max_resolucion.toFixed(2)} min
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Distribución por Tipo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-700 mb-4">Distribución por Tipo de Alerta</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dataTipoAlerta}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dataTipoAlerta.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_TIPO[index % COLORS_TIPO.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Estado de Alertas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-700 mb-4">Estado de Alertas</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataEstado}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Cantidad" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* TABLA DETALLADA */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">📋 Detalle de Alertas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 font-medium">
              <tr>
                <th className="p-3">Paciente</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Severidad</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Fecha Generación</th>
                <th className="p-3">Tiempo Resolución</th>
                <th className="p-3">Nota Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alertasDetalle.map((alerta) => (
                <tr key={alerta.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{alerta.nino_nombre}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                      {alerta.tipo_alerta}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      alerta.severidad === 'SEVERA' ? 'bg-red-200 text-red-800' :
                      alerta.severidad === 'MODERADA' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {alerta.severidad}
                    </span>
                  </td>
                  <td className="p-3">
                    {alerta.estado === 'ACTIVA' ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                        🟡 ACTIVA
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                        ✓ CERRADA
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {new Date(alerta.fecha_generacion).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-purple-600 font-bold">
                    {alerta.tiempo_resolucion_minutos 
                      ? `${alerta.tiempo_resolucion_minutos.toFixed(1)} min` 
                      : '-'}
                  </td>
                  <td className="p-3 text-xs max-w-xs truncate">
                    {alerta.nota_cierre || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}