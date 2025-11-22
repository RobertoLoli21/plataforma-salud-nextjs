'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users, AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  
  // Estadísticas
  const [stats, setStats] = useState({
    totalNinos: 0,
    casosAnemia: 0,
    totalCitas: 0,
    stockCritico: 0
  });

  // Datos para gráficos
  const [dataAnemia, setDataAnemia] = useState<any[]>([]);
  const [dataStock, setDataStock] = useState<any[]>([]);

  const calcularReportes = async () => {
    setLoading(true);

    // 1. Contar Niños
    const { count: ninosCount } = await supabase.from('tbl_ninos').select('*', { count: 'exact', head: true });
    
    // 2. Detectar Anemia (Último control de cada niño con Hb < 11)
    // Nota: Para este demo haremos un conteo simple de controles con anemia reciente
    const { data: controles } = await supabase
      .from('tbl_controles_nutricionales')
      .select('hemoglobina')
      .order('fecha_control', { ascending: false })
      .limit(100); // Analizamos los últimos 100 controles para la muestra

    let conAnemia = 0;
    let sanos = 0;

    if (controles) {
      controles.forEach(c => {
        if (c.hemoglobina < 11) conAnemia++;
        else sanos++;
      });
    }

    // 3. Stock Crítico
    const { data: lotes } = await supabase.from('tbl_lotes_mmn').select('codigo_lote, stock_actual');
    let lowStock = 0;
    if (lotes) {
      lowStock = lotes.filter(l => l.stock_actual < 20).length;
    }

    setStats({
      totalNinos: ninosCount || 0,
      casosAnemia: conAnemia,
      totalCitas: 0, // Pendiente implementar conteo citas
      stockCritico: lowStock
    });

    // Preparar datos para Gráfico de Torta
    setDataAnemia([
      { name: 'Con Anemia', value: conAnemia },
      { name: 'Sanos', value: sanos },
    ]);

    // Preparar datos para Gráfico de Barras (Stock)
    if (lotes) {
      setDataStock(lotes.map(l => ({
        name: l.codigo_lote,
        cantidad: l.stock_actual
      })));
    }

    setLoading(false);
  };

  useEffect(() => {
    calcularReportes();
  }, []);

  // Colores para los gráficos
  const COLORS = ['#EF4444', '#10B981']; // Rojo, Verde

  if (loading) return <div className="p-8">Calculando estadísticas...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <TrendingUp className="text-blue-600" />
        Reportes Generales
      </h1>

      {/* TARJETAS KPI (Indicadores Clave) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Total Niños</p>
              <h2 className="text-3xl font-bold text-gray-800">{stats.totalNinos}</h2>
            </div>
            <Users className="text-blue-200" size={32} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Casos Anemia (Muestra)</p>
              <h2 className="text-3xl font-bold text-red-600">{stats.casosAnemia}</h2>
            </div>
            <AlertTriangle className="text-red-200" size={32} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Lotes Stock Bajo</p>
              <h2 className="text-3xl font-bold text-purple-600">{stats.stockCritico}</h2>
            </div>
            <Package className="text-purple-200" size={32} />
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Prevalencia de Anemia */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-700 mb-4">Estado Nutricional (Últimos controles)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataAnemia}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataAnemia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Stock de Vitaminas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-gray-700 mb-4">Stock de Vitaminas por Lote</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataStock}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" name="Cajas Disponibles" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}