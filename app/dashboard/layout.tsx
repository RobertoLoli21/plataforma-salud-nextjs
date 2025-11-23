//app/dashboard/layout.tsx
'use client';
import { useState, useEffect } from 'react'; // Importamos useEffect
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import OfflineStatus from '@/components/OfflineStatus';
import InstallPWA from '@/components/InstallPWA';

import { 
  Users, 
  Calendar, 
  Activity, 
  LogOut, 
  Menu,
  X,
  Home,
  AlertTriangle,
  Package,
  ShieldCheck, // Importamos el escudo para la pantalla de carga
  BarChart3
} from 'lucide-react'; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<number | null>(null);
  // --- ESTADOS DE SEGURIDAD (NUEVO) ---
  const [isAuthorized, setIsAuthorized] = useState(false); // ¿Puede pasar?
  const [checkingAuth, setCheckingAuth] = useState(true);  // ¿Estamos revisando?

  // --- EL GUARDIA DE SEGURIDAD 👮‍♂️ (NUEVO) ---
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.replace('/'); 
        } else {
          // NUEVO: Buscamos qué rol tiene este usuario en la base de datos
          const { data: perfil } = await supabase
            .from('tbl_usuarios')
            .select('rol_id')
            .eq('id', session.user.id)
            .single();
            
          setUserRole(perfil?.rol_id || null); // Guardamos el rol (2 = Admin)
          setIsAuthorized(true);
        }
      } catch (error) {
        router.replace('/');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // 1. PANTALLA DE CARGA (Mientras el guardia revisa)
  if (checkingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-blue-600">
        <ShieldCheck size={48} className="animate-bounce mb-4" />
        <p className="font-bold text-lg">Verificando credenciales...</p>
      </div>
    );
  }

  // 2. SI NO TIENE PERMISO (No mostramos nada mientras se redirige)
  if (!isAuthorized) {
    return null; 
  }

  // 3. SI PASÓ LA SEGURIDAD (Mostramos tu diseño original)
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para Desktop */}
      <aside className={`bg-white w-64 min-h-screen flex flex-col border-r transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30`}>
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-blue-600">SaludApp</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                <Home size={20} className="mr-3" />
                Inicio
            </Link>
          
          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Módulos</p>
          </div>

            <Link href="/dashboard/ninos" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                <Users size={20} className="mr-3" />
                Niños y Cuidadores
            </Link>

            <Link href="/dashboard/alertas" className="flex items-center p-3 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition">
                <AlertTriangle size={20} className="mr-3" />
                Alertas
            </Link>

            <Link href="/dashboard/citas" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                <Calendar size={20} className="mr-3" />
                Agenda de Citas
            </Link>
            <Link href="/dashboard/stock" className="flex items-center p-3 text-gray-700 hover:bg-purple-50 rounded-lg transition">
                <Package size={20} className="mr-3" />
                Farmacia
            </Link>

            <Link href="/dashboard/reportes" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                <Activity size={20} className="mr-3" />
                Reportes
            </Link>
            {userRole === 2 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Administración</p>
              </div>
              
              <Link href="/dashboard/usuarios" className="flex items-center p-3 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition border border-yellow-100 bg-yellow-50/50">
                <ShieldCheck size={20} className="mr-3" />
                Gestión Usuarios
              </Link>
                 <Link href="/dashboard/metricas" className="flex items-center p-3 text-gray-700 hover:bg-blue-50 rounded-lg transition">
                    <BarChart3 size={20} className="mr-3" />
                    Métricas Offline
                </Link>
                <Link href="/dashboard/evaluacion-alertas" className="flex items-center p-3 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition">
                    <BarChart3 size={20} className="mr-3" />
                    Evaluación Alertas
                </Link>
            </>
          )}
          {userRole === 3 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Administración</p>
              </div>
              
              <Link href="/dashboard/mis-ninos" className="flex items-center p-3 text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition border border-yellow-100 bg-yellow-50/50">
                <ShieldCheck size={20} className="mr-3" />
                Inicio
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="mb-4 px-3 py-2 bg-blue-50 rounded text-xs text-blue-800">
            <p className="font-bold">Usuario Seguro</p>
            <p>Sesión activa</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior móvil */}
        <header className="bg-white shadow-sm p-4 md:hidden flex items-center">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-700">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-lg">Plataforma Salud</span>
        </header>
        
        <OfflineStatus />
        
        {/* Aquí se cargan las páginas (children) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
      <InstallPWA />
    </div>
  );
}