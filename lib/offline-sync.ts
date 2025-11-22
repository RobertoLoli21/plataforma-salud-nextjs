import { openDB } from 'idb';
import { supabase } from './supabase/client';

// 1. Configuración de la Base de Datos Local (IndexedDB)
const dbPromise = openDB('salud-offline-db', 1, {
  upgrade(db) {
    // Creamos una "caja" llamada 'cola_sync' para guardar lo pendiente
    if (!db.objectStoreNames.contains('cola_sync')) {
      db.createObjectStore('cola_sync', { keyPath: 'id', autoIncrement: true });
    }
  },
});

// 2. Función para guardar algo cuando NO hay internet
export const guardarEnCola = async (tabla: string, datos: any) => {
  const db = await dbPromise;
  await db.add('cola_sync', {
    tabla,
    payload: datos,
    fecha: new Date().toISOString(),
    status: 'PENDIENTE' // Estado inicial
  });
  console.log('📦 Guardado en cola local (sin internet)');
};

// 3. Función para subir los datos cuando VUELVE el internet
export const sincronizarCola = async () => {
  const db = await dbPromise;
  // Obtenemos todo lo pendiente
  const pendientes = await db.getAll('cola_sync');
  
  if (pendientes.length === 0) return 0; // Nada que hacer

  console.log(`🔄 Iniciando sincronización de ${pendientes.length} elementos...`);
  let sincronizados = 0;

  for (const item of pendientes) {
    try {
      // Intentamos insertar en Supabase
      const { error } = await supabase.from(item.tabla).insert([item.payload]);

      if (!error) {
        // Si subió bien, lo borramos de la cola local
        await db.delete('cola_sync', item.id);
        sincronizados++;
      } else {
        console.error('Error al sincronizar item:', error);
      }
    } catch (err) {
      console.error('Error de red al intentar sincronizar', err);
    }
  }

  return sincronizados;
};

// 4. Hook para saber si el usuario está Online u Offline (Esto ayuda a la UI)
export const useOnlineStatus = () => {
  // Nota: Esto lo usaremos dentro de los componentes React
  if (typeof window === 'undefined') return true; // En servidor siempre "online"
  return navigator.onLine;
};