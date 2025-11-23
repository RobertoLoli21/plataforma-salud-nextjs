// components/RegisterServiceWorker.tsx
'use client';
import { useEffect } from 'react';

export default function RegisterServiceWorker() {
  useEffect(() => {
    // Solo registrar en producción y si el navegador soporta service workers
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope);
          
          // Verificar actualizaciones cada 1 hora
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('❌ Error al registrar Service Worker:', error);
        });
    }
  }, []);

  return null; // Este componente no renderiza nada
}