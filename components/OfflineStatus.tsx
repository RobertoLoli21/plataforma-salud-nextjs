'use client';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { sincronizarCola } from '@/lib/offline-sync';

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // 1. Detectar estado inicial
    setIsOnline(navigator.onLine);

    // 2. Escuchar cambios de red (se va o vuelve internet)
    const handleOnline = () => {
      setIsOnline(true);
      handleSync(); // Intentar sincronizar apenas vuelva
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const count = await sincronizarCola();
    if (count > 0) {
      alert(`✅ Se sincronizaron ${count} registros pendientes.`);
    }
    setSyncing(false);
  };

  // Si está online y no está sincronizando, no mostramos nada (o solo un icono pequeño)
  if (isOnline && !syncing) return null;

  return (
    <div className={`w-full p-2 text-sm font-bold text-center flex justify-center items-center gap-2 transition-colors
      ${isOnline ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
      
      {!isOnline && (
        <>
          <WifiOff size={18} />
          <span>MODO SIN CONEXIÓN: Los datos se guardarán en tu dispositivo.</span>
        </>
      )}

      {isOnline && syncing && (
        <>
          <RefreshCw size={18} className="animate-spin" />
          <span>Sincronizando datos con la nube...</span>
        </>
      )}
    </div>
  );
}