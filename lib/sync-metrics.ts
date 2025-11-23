// lib/sync-metrics.ts
import { openDB } from 'idb';

interface SyncAttempt {
  id: number;
  timestamp: string;
  tabla: string;
  success: boolean;
  attempt_number: number; // 1 = primer intento, 2 = segundo intento
  sync_duration_ms: number; // Tiempo que tardó en sincronizar
  error_message?: string;
}

interface SyncMetrics {
  total_offline_actions: number;
  successful_first_attempt: number;
  successful_second_attempt: number;
  failed_syncs: number;
  overall_success_rate: number;
  average_sync_time_seconds: number;
  total_sync_time_ms: number;
}

// Base de datos para métricas
const metricsDBPromise = openDB('sync-metrics-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('sync_attempts')) {
      db.createObjectStore('sync_attempts', { keyPath: 'id', autoIncrement: true });
    }
  },
});

/**
 * Registra un intento de sincronización
 */
export const registrarIntentoSync = async (
  tabla: string,
  success: boolean,
  attemptNumber: number,
  durationMs: number,
  errorMessage?: string
) => {
  const db = await metricsDBPromise;
  
  const attempt: Omit<SyncAttempt, 'id'> = {
    timestamp: new Date().toISOString(),
    tabla,
    success,
    attempt_number: attemptNumber,
    sync_duration_ms: durationMs,
    error_message: errorMessage
  };

  await db.add('sync_attempts', attempt);
  console.log('📊 Métrica registrada:', attempt);
};

/**
 * Obtiene todas las métricas de sincronización
 */
export const obtenerMetricas = async (): Promise<SyncMetrics> => {
  const db = await metricsDBPromise;
  const attempts = await db.getAll('sync_attempts') as SyncAttempt[];

  if (attempts.length === 0) {
    return {
      total_offline_actions: 0,
      successful_first_attempt: 0,
      successful_second_attempt: 0,
      failed_syncs: 0,
      overall_success_rate: 0,
      average_sync_time_seconds: 0,
      total_sync_time_ms: 0
    };
  }

  // Calcular estadísticas
  const successfulFirstAttempt = attempts.filter(a => a.success && a.attempt_number === 1).length;
  const successfulSecondAttempt = attempts.filter(a => a.success && a.attempt_number === 2).length;
  const failedSyncs = attempts.filter(a => !a.success).length;
  const totalSuccessful = successfulFirstAttempt + successfulSecondAttempt;
  const totalSyncTimeMs = attempts
    .filter(a => a.success)
    .reduce((sum, a) => sum + a.sync_duration_ms, 0);

  const metrics: SyncMetrics = {
    total_offline_actions: attempts.length,
    successful_first_attempt: successfulFirstAttempt,
    successful_second_attempt: successfulSecondAttempt,
    failed_syncs: failedSyncs,
    overall_success_rate: attempts.length > 0 
      ? (totalSuccessful / attempts.length) * 100 
      : 0,
    average_sync_time_seconds: totalSuccessful > 0
      ? totalSyncTimeMs / totalSuccessful / 1000
      : 0,
    total_sync_time_ms: totalSyncTimeMs
  };

  return metrics;
};

/**
 * Exporta las métricas en formato CSV
 */
export const exportarMetricasCSV = async (): Promise<string> => {
  const db = await metricsDBPromise;
  const attempts = await db.getAll('sync_attempts') as SyncAttempt[];

  if (attempts.length === 0) {
    return 'No hay datos de sincronización disponibles';
  }

  // Crear CSV
  let csv = 'ID,Timestamp,Tabla,Exitoso,Intento #,Duración (ms),Error\n';
  
  attempts.forEach(a => {
    csv += `${a.id},"${a.timestamp}","${a.tabla}",${a.success ? 'Sí' : 'No'},${a.attempt_number},${a.sync_duration_ms},"${a.error_message || '-'}"\n`;
  });

  return csv;
};

/**
 * Limpia todas las métricas (útil para empezar pruebas desde cero)
 */
export const limpiarMetricas = async () => {
  const db = await metricsDBPromise;
  const tx = db.transaction('sync_attempts', 'readwrite');
  await tx.objectStore('sync_attempts').clear();
  console.log('🧹 Métricas limpiadas');
};

/**
 * Obtiene el detalle de todos los intentos
 */
export const obtenerDetalleIntentos = async (): Promise<SyncAttempt[]> => {
  const db = await metricsDBPromise;
  return await db.getAll('sync_attempts');
};