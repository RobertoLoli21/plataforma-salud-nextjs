// components/InstallPWA.tsx
'use client';
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Detectar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App ya instalada');
      return;
    }

    // Escuchar el evento beforeinstallprompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
      console.log('💡 Prompt de instalación disponible');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Mostrar prompt nativo
    deferredPrompt.prompt();

    // Esperar respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar');
    } else {
      console.log('❌ Usuario rechazó instalar');
    }

    setDeferredPrompt(null);
    setShowButton(false);
  };

  if (!showButton) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-2xl flex items-start gap-3">
        <Download size={24} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold mb-1">Instalar Aplicación</h3>
          <p className="text-sm text-blue-100 mb-3">
            Accede más rápido y trabaja sin conexión instalando la app en tu dispositivo.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-white text-blue-600 px-4 py-2 rounded font-bold text-sm hover:bg-blue-50 transition"
            >
              Instalar Ahora
            </button>
            <button
              onClick={() => setShowButton(false)}
              className="text-white hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              Más tarde
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowButton(false)}
          className="text-white hover:bg-blue-700 p-1 rounded transition"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}