//app/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  // Aquí está el cambio clave: <string | null>
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Intentar loguearse con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciales incorrectas.');
      setLoading(false);
      return;
    }

    if (!authData.user) {
        setError('Error desconocido al obtener usuario.');
        setLoading(false);
        return;
    }

    // 2. Si pasa, consultar qué rol tiene este usuario en nuestra tabla
    const { data: userData, error: userError } = await supabase
      .from('tbl_usuarios')
      .select('rol_id, nombres')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      setError('Usuario sin rol asignado. Contacte soporte.');
      await supabase.auth.signOut(); // Sacarlo si no tiene rol
      setLoading(false);
      return;
    }

    // 3. Redirigir según el rol
    if (userData.rol_id === 2 || userData.rol_id === 1) {
       router.push('/dashboard'); // Doctores y Admin
    } else if (userData.rol_id === 3) {
       router.push('/dashboard/mis-ninos'); // Cuidadores
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">Plataforma Salud</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-black"
              placeholder="admin@salud.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-black"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}