'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Shield, User, Lock } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    setLoading(true);
    // Traemos usuarios y su rol (unimos tablas)
    const { data } = await supabase
      .from('tbl_usuarios')
      .select('*, tbl_roles(nombre)')
      .order('created_at', { ascending: false });
    
    if (data) setUsuarios(data);
    setLoading(false);
  };

  const cambiarRol = async (userId: string, nuevoRolId: number) => {
    const confirmar = confirm("¿Seguro que deseas cambiar el rol de este usuario?");
    if (!confirmar) return;

    const { error } = await supabase
      .from('tbl_usuarios')
      .update({ rol_id: nuevoRolId })
      .eq('id', userId);

    if (!error) fetchUsuarios();
    else alert("Error: " + error.message);
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Shield className="text-blue-600" /> Gestión de Usuarios
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Usuario</th>
              <th className="p-4">Email</th>
              <th className="p-4">Rol Actual</th>
              <th className="p-4">Cambiar Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center">Cargando...</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 text-black">
                  <td className="p-4 font-medium flex items-center gap-2">
                    <User size={16} className="text-gray-400"/>
                    {u.nombres || 'Sin nombre'} {u.apellidos}
                  </td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold 
                      ${u.rol_id === 2 ? 'bg-purple-100 text-purple-700' : 
                        u.rol_id === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {u.tbl_roles?.nombre || 'Sin Rol'}
                    </span>
                  </td>
                  <td className="p-4">
                    <select 
                      className="border rounded p-1 text-sm text-black bg-white"
                      value={u.rol_id || ''}
                      onChange={(e) => cambiarRol(u.id, parseInt(e.target.value))}
                    >
                      <option value="1">Personal Salud</option>
                      <option value="2">Admin</option>
                      <option value="3">Cuidador</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        <Lock size={12} className="inline mr-1"/>
        Para crear un nuevo usuario, debe registrarse en el Login. Luego aparecerá aquí y podrás asignarle su rol.
      </p>
    </div>
  );
}