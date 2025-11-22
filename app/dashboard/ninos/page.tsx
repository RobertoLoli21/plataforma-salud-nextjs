'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Search, X, Save } from 'lucide-react';
import Link from 'next/link';

// Definimos los tipos de datos
interface Nino {
  id: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string;
  dni?: string;
}

export default function NinosPage() {
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para el formulario
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: 'M', // Valor por defecto
    dni: ''
  });

  // Función para cargar niños de la BD
  const fetchNinos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tbl_ninos')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setNinos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNinos();
  }, []);

  // Función para guardar el nuevo niño
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // 1. Insertar en Supabase
    const { error } = await supabase
      .from('tbl_ninos')
      .insert([
        {
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          fecha_nacimiento: formData.fecha_nacimiento,
          sexo: formData.sexo,
          // Nota: dni no está en la tabla SQL original, asegúrate de haberlo creado o quita esta línea si falla.
          // Si usaste mi script SQL anterior, la tabla no tiene DNI. Lo omitiremos por ahora para evitar errores.
        }
      ]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      // 2. Si todo sale bien: cerrar modal, limpiar form y recargar lista
      setShowModal(false);
      setFormData({ nombres: '', apellidos: '', fecha_nacimiento: '', sexo: 'M', dni: '' });
      fetchNinos(); 
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Padrón de Niños</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuevo Niño
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o apellido..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
          />
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="p-4">Nombres</th>
              <th className="p-4">Apellidos</th>
              <th className="p-4">Nacimiento</th>
              <th className="p-4">Sexo</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-black">Cargando padrón...</td></tr>
            ) : ninos.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay niños registrados aún.</td></tr>
            ) : (
              ninos.map((nino) => (
                <tr key={nino.id} className="hover:bg-gray-50 text-black">
                  <td className="p-4 font-medium">{nino.nombres}</td>
                  <td className="p-4">{nino.apellidos}</td>
                  <td className="p-4">{nino.fecha_nacimiento}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${nino.sexo === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                      {nino.sexo}
                    </span>
                  </td>
                    <td className="p-4">
                        <Link 
                            href={`/dashboard/ninos/${nino.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                            Ver Ficha
                        </Link>
                    </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL - VENTANA FLOTANTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Registrar Nuevo Niño</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                <input 
                  type="text" 
                  required
                  className="w-full border rounded-lg p-2 text-black"
                  value={formData.nombres}
                  onChange={e => setFormData({...formData, nombres: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                <input 
                  type="text" 
                  required
                  className="w-full border rounded-lg p-2 text-black"
                  value={formData.apellidos}
                  onChange={e => setFormData({...formData, apellidos: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                  <input 
                    type="date" 
                    required
                    className="w-full border rounded-lg p-2 text-black"
                    value={formData.fecha_nacimiento}
                    onChange={e => setFormData({...formData, fecha_nacimiento: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select 
                    className="w-full border rounded-lg p-2 text-black"
                    value={formData.sexo}
                    onChange={e => setFormData({...formData, sexo: e.target.value})}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex justify-center items-center gap-2"
                >
                  {saving ? 'Guardando...' : <><Save size={18} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}