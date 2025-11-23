//app/dashboard/reportes/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users, AlertTriangle, Package, TrendingUp, Download } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
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
  
  // Datos RAW para exportar
  const [controlesParaExportar, setControlesParaExportar] = useState<any[]>([]);

  const calcularReportes = async () => {
    setLoading(true);

    // 1. Contar Niños
    const { count: ninosCount } = await supabase.from('tbl_ninos').select('*', { count: 'exact', head: true });
    
    // 2. Detectar Anemia (Último control de cada niño con Hb < 11)
    const { data: controles } = await supabase
      .from('tbl_controles_nutricionales')
      .select(`
        *,
        tbl_ninos (nombres, apellidos)
      `)
      .order('fecha_control', { ascending: false })
      .limit(100);

    let conAnemia = 0;
    let sanos = 0;

    if (controles) {
      // Guardamos para exportar después
      setControlesParaExportar(controles);
      
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
      totalCitas: 0,
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

  // 🆕 FUNCIÓN DE EXPORTACIÓN A EXCEL
  const exportarExcel = () => {
    if (controlesParaExportar.length === 0) {
      alert('⚠️ No hay datos para exportar.');
      return;
    }

    setExporting(true);

    try {
      // 1. Preparar datos limpios para Excel
      const datosLimpios = controlesParaExportar.map(c => ({
        'Fecha Control': new Date(c.fecha_control).toLocaleDateString(),
        'Nombre Niño': c.tbl_ninos?.nombres || 'N/A',
        'Apellido': c.tbl_ninos?.apellidos || 'N/A',
        'Peso (kg)': c.peso,
        'Talla (cm)': c.talla,
        'Hemoglobina': c.hemoglobina,
        'Estado': c.hemoglobina < 11 ? 'ANEMIA' : 'NORMAL',
        'Observaciones': c.observaciones || '-'
      }));

      // 2. Crear hoja de Excel
      const ws = XLSX.utils.json_to_sheet(datosLimpios);
      
      // 3. Ajustar anchos de columna
      const columnWidths = [
        { wch: 15 }, // Fecha
        { wch: 20 }, // Nombre
        { wch: 20 }, // Apellido
        { wch: 10 }, // Peso
        { wch: 10 }, // Talla
        { wch: 12 }, // Hemoglobina
        { wch: 10 }, // Estado
        { wch: 30 }  // Observaciones
      ];
      ws['!cols'] = columnWidths;

      // 4. Crear libro y agregar hoja
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Controles Nutricionales');

      // 5. Generar nombre con fecha
      const fechaHoy = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Reporte_Anemia_${fechaHoy}.xlsx`;

      // 6. Descargar
      XLSX.writeFile(wb, nombreArchivo);

      // Feedback visual
      setTimeout(() => {
        alert(`✅ Archivo "${nombreArchivo}" descargado exitosamente.`);
        setExporting(false);
      }, 500);

    } catch (error) {
      console.error('Error al exportar:', error);
      alert('❌ Error al generar el archivo Excel.');
      setExporting(false);
    }
  };

  const COLORS = ['#EF4444', '#10B981'];

  if (loading) return <div className="p-8">Calculando estadísticas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="text-blue-600" />
          Reportes Generales
        </h1>
        
        {/* 🆕 BOTÓN DE EXPORTAR */}
        <button
          onClick={exportarExcel}
          disabled={exporting || controlesParaExportar.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Generando...
            </>
          ) : (
            <>
              <Download size={20} />
              Exportar a Excel
            </>
          )}
        </button>
      </div>

      {/* TARJETAS KPI */}
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

        {/* 🆕 KPI de Controles Disponibles */}
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-500 text-sm">Controles en Reporte</p>
              <h2 className="text-3xl font-bold text-green-600">{controlesParaExportar.length}</h2>
            </div>
            <Download className="text-green-200" size={32} />
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
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
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