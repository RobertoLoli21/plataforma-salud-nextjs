// app/dashboard/metricas/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { 
  obtenerMetricas, 
  obtenerDetalleIntentos, 
  limpiarMetricas, 
  exportarMetricasCSV 
} from '@/lib/sync-metrics';
import { limpiarCola, contarPendientes } from '@/lib/offline-sync';
import { BarChart3, Download, Trash2, RefreshCw, Clock } from 'lucide-react';

export default function MetricasPage() {
  const [metricas, setMetricas] = useState<any>(null);
  const [detalleIntentos, setDetalleIntentos] = useState<any[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async () => {
    setLoading(true);
    const metrics = await obtenerMetricas();
    const detalle = await obtenerDetalleIntentos();
    const count = await contarPendientes();
    
    setMetricas(metrics);
    setDetalleIntentos(detalle);
    setPendientes(count);
    setLoading(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleLimpiar = async () => {
    if (!confirm('⚠️ ¿Estás seguro de limpiar TODAS las métricas y la cola de sincronización? Esta acción no se puede deshacer.')) {
      return;
    }
    
    await limpiarMetricas();
    await limpiarCola();
    alert('✅ Métricas y cola limpiadas. Listo para nueva prueba.');
    cargarDatos();
  };

  const handleExportar = async () => {
    const csv = await exportarMetricasCSV();
    
    // Crear archivo y descargarlo
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metricas_sync_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* CABECERA */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BarChart3 className="text-blue-600" />
          Métricas de Sincronización Offline
        </h1>
        <div className="flex gap-2">
          <button
            onClick={cargarDatos}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <RefreshCw size={18} /> Actualizar
          </button>
          <button
            onClick={handleExportar}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Download size={18} /> Exportar CSV
          </button>
          <button
            onClick={handleLimpiar}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
          >
            <Trash2 size={18} /> Limpiar Todo
          </button>
        </div>
      </div>

      {/* ALERTA DE ITEMS PENDIENTES */}
      {pendientes > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-800 font-bold">
            ⚠️ Hay {pendientes} items pendientes de sincronizar en la cola.
          </p>
        </div>
      )}

      {/* TABLA DE MÉTRICAS PRINCIPALES */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">📊 Tabla 6: Resultados de Sincronización Offline</h2>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="p-4 border-b">Indicador</th>
              <th className="p-4 border-b text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700">Total offline actions</td>
              <td className="p-4 text-right text-2xl font-bold text-blue-600">
                {metricas.total_offline_actions}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700">Successful first attempt syncs</td>
              <td className="p-4 text-right text-2xl font-bold text-green-600">
                {metricas.successful_first_attempt}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700">Successful second attempt syncs</td>
              <td className="p-4 text-right text-2xl font-bold text-yellow-600">
                {metricas.successful_second_attempt}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700">Failed syncs (después de 2 intentos)</td>
              <td className="p-4 text-right text-2xl font-bold text-red-600">
                {metricas.failed_syncs}
              </td>
            </tr>
            <tr className="hover:bg-blue-50 bg-blue-50">
              <td className="p-4 font-bold text-blue-900">Overall sync success rate (%)</td>
              <td className="p-4 text-right text-3xl font-bold text-blue-700">
                {metricas.overall_success_rate.toFixed(2)}%
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-medium text-gray-700 flex items-center gap-2">
                <Clock size={18} /> Average time to sync (seconds)
              </td>
              <td className="p-4 text-right text-2xl font-bold text-purple-600">
                {metricas.average_sync_time_seconds.toFixed(2)}s
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* INSTRUCCIONES DE PRUEBA */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-3">📝 Cómo realizar la prueba:</h3>
        <ol className="space-y-2 text-blue-800">
          <li><strong>1.</strong> Haz clic en "Limpiar Todo" para empezar desde cero.</li>
          <li><strong>2.</strong> Desconecta tu WiFi/datos móviles.</li>
          <li><strong>3.</strong> Ve a "Niños" → Selecciona un niño → "Nuevo Control".</li>
          <li><strong>4.</strong> Registra 10 controles nutricionales (puedes usar datos de prueba).</li>
          <li><strong>5.</strong> Reactiva el WiFi.</li>
          <li><strong>6.</strong> Espera a que se sincronicen automáticamente (o recarga la página).</li>
          <li><strong>7.</strong> Vuelve aquí y presiona "Actualizar" para ver los resultados.</li>
          <li><strong>8.</strong> Exporta a CSV para incluir en tu informe.</li>
        </ol>
      </div>

      {/* DETALLE DE INTENTOS */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="font-bold text-lg text-gray-800">📋 Detalle de Intentos de Sincronización</h2>
          <p className="text-sm text-gray-500 mt-1">
            Total de registros: {detalleIntentos.length}
          </p>
        </div>

        {detalleIntentos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay datos de sincronización aún. Realiza la prueba siguiendo las instrucciones arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 font-medium">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Tabla</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Intento</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detalleIntentos.map((intento) => (
                  <tr key={intento.id} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-gray-500">{intento.id}</td>
                    <td className="p-3 text-xs">
                      {new Date(intento.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">{intento.tabla}</td>
                    <td className="p-3">
                      {intento.success ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                          ✓ Éxito
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                          ✗ Fallo
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        intento.attempt_number === 1 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {intento.attempt_number}°
                      </span>
                    </td>
                    <td className="p-3 font-mono text-purple-600">
                      {intento.sync_duration_ms}ms
                    </td>
                    <td className="p-3 text-xs text-red-600">
                      {intento.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}