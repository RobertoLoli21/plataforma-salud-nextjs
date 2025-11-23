// lib/offline-sync.ts
import { openDB } from 'idb';
import { supabase } from './supabase/client';
import { registrarIntentoSync } from './sync-metrics';

const dbPromise = openDB('salud-offline-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('cola_sync')) {
      db.createObjectStore('cola_sync', { keyPath: 'id', autoIncrement: true });
    }
  },
});

export const guardarEnCola = async (tabla: string, datos: any) => {
  const db = await dbPromise;
  await db.add('cola_sync', {
    tabla,
    payload: datos,
    fecha: new Date().toISOString(),
    status: 'PENDIENTE',
    attempt_count: 0 // 🆕 Contador de intentos
  });
  console.log('📦 Guardado en cola local (sin internet)');
};

export const sincronizarCola = async () => {
  const db = await dbPromise;
  const pendientes = await db.getAll('cola_sync');
  
  if (pendientes.length === 0) return 0;

  console.log(`🔄 Iniciando sincronización de ${pendientes.length} elementos...`);
  let sincronizados = 0;

  for (const item of pendientes) {
    const intentoActual = (item.attempt_count || 0) + 1;
    const inicioSync = Date.now(); // ⏱️ Iniciar cronómetro

    try {
      const { error } = await supabase.from(item.tabla).insert([item.payload]);

      const duracionMs = Date.now() - inicioSync; // ⏱️ Calcular duración

      if (!error) {
        // ✅ SINCRONIZACIÓN EXITOSA
        await db.delete('cola_sync', item.id);
        sincronizados++;
        
        // 📊 Registrar métrica de éxito
        await registrarIntentoSync(
          item.tabla,
          true,
          intentoActual,
          duracionMs
        );

        console.log(`✅ [Intento ${intentoActual}] Sincronizado en ${duracionMs}ms`);
      } else {
        // ❌ ERROR EN SINCRONIZACIÓN
        console.error(`❌ [Intento ${intentoActual}] Error al sincronizar:`, error);
        
        // Actualizar contador de intentos
        await db.put('cola_sync', {
          ...item,
          attempt_count: intentoActual,
          last_error: error.message
        });

        // 📊 Registrar métrica de fallo
        await registrarIntentoSync(
          item.tabla,
          false,
          intentoActual,
          duracionMs,
          error.message
        );

        // Si ya intentó 2 veces, marcar como fallido definitivo
        if (intentoActual >= 2) {
          console.error(`🚫 Item ${item.id} falló después de 2 intentos. Marcando como error permanente.`);
        }
      }
    } catch (err) {
      const duracionMs = Date.now() - inicioSync;
      console.error('❌ Error de red al intentar sincronizar', err);
      
      // 📊 Registrar métrica de error de red
      await registrarIntentoSync(
        item.tabla,
        false,
        intentoActual,
        duracionMs,
        'Error de red'
      );
    }
  }

  return sincronizados;
};

export const useOnlineStatus = () => {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
};

// 🆕 Función para obtener el conteo de items pendientes
export const contarPendientes = async (): Promise<number> => {
  const db = await dbPromise;
  const pendientes = await db.getAll('cola_sync');
  return pendientes.length;
};

// 🆕 Función para limpiar cola (útil para empezar prueba desde cero)
export const limpiarCola = async () => {
  const db = await dbPromise;
  const tx = db.transaction('cola_sync', 'readwrite');
  await tx.objectStore('cola_sync').clear();
  console.log('🧹 Cola de sincronización limpiada');
};