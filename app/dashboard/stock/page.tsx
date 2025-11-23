//app/dashboard/stock/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Package, Plus, AlertCircle } from 'lucide-react';

interface Lote {
  id: number;
  codigo_lote: string;
  fecha_vencimiento: string;
  stock_actual: number;
  stock_inicial: number;
}

export default function StockPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Formulario nuevo lote
  const [formData, setFormData] = useState({
    codigo: '',
    vencimiento: '',
    cantidad: ''
  });

  const fetchLotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tbl_lotes_mmn')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (data) setLotes(data);
    setLoading(false);
  };

  useEffect(() => { fetchLotes(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = parseInt(formData.cantidad);
    
    const { error } = await supabase.from('tbl_lotes_mmn').insert([{
      codigo_lote: formData.codigo,
      fecha_vencimiento: formData.vencimiento,
      stock_inicial: cantidad,
      stock_actual: cantidad // Al inicio son iguales
    }]);

    if (!error) {
      setShowModal(false);
      setFormData({ codigo: '', vencimiento: '', cantidad: '' });
      fetchLotes();
    } else {
      alert(error.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="text-purple-600" />
          Inventario de Vitaminas (MMN)
        </h1>
        <button onClick={() => setShowModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700">
          <Plus size={20} /> Recibir Lote
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {lotes.map(lote => (
          <div key={lote.id} className="bg-white p-6 rounded-lg shadow border border-gray-100 relative overflow-hidden">
            {/* Barra de progreso visual del stock */}
            <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full">
              <div 
                className={`h-full ${lote.stock_actual < 10 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${(lote.stock_actual / lote.stock_inicial) * 100}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{lote.codigo_lote}</h3>
                <p className="text-sm text-gray-500">Vence: {lote.fecha_vencimiento}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${lote.stock_actual < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {lote.stock_actual} unid.
              </span>
            </div>

            {lote.stock_actual < 10 && (
              <div className="flex items-center gap-2 text-red-600 text-xs font-bold mt-2">
                <AlertCircle size={12} /> STOCK CRÍTICO
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg mb-4 text-black">Registrar Ingreso de MMN</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input 
                className="w-full border p-2 rounded text-black" placeholder="Código de Lote (ej: L-2024)" 
                required value={formData.codigo} onChange={e=>setFormData({...formData, codigo: e.target.value})}
              />
              <div className="text-xs text-gray-500">Fecha de Vencimiento</div>
              <input 
                type="date" className="w-full border p-2 rounded text-black" required 
                value={formData.vencimiento} onChange={e=>setFormData({...formData, vencimiento: e.target.value})}
              />
              <input 
                type="number" className="w-full border p-2 rounded text-black" placeholder="Cantidad de cajas" required 
                value={formData.cantidad} onChange={e=>setFormData({...formData, cantidad: e.target.value})}
              />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border p-2 rounded text-black">Cancelar</button>
                <button type="submit" className="flex-1 bg-purple-600 text-white p-2 rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}