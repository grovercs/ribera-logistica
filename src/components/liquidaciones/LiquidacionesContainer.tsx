'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, User, FileText, CheckCircle2, XCircle, Download, CreditCard, ChevronRight, Search, Check, RefreshCw, Euro, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

interface Reporte {
  id: string;
  orden_id: number;
  creador_id: string;
  horas_trabajadas: number;
  creado_en: string;
  estado_liquidacion: string;
  fecha_pago: string | null;
  medio_pago: string | null;
  notas_pago: string | null;
  servicios: {
    codigo_servicio: string;
    nombre_cliente: string;
    dest_direccion: string | null;
    dest_observaciones: string | null;
    num_documento: string | null;
    tipos_servicios: {
      nombre: string;
    } | null;
    servicios_materiales: {
      id: number;
      codigo: string | null;
      descripcion: string;
      cantidad: number;
    }[];
  };
  empleado_nombre: string;
  tarifa_hora: number;
  tipo_empleado: string;
}

interface Empleado {
  id: number;
  nombre: string;
  tipo: string;
  tarifa_hora: number;
}

interface LiquidacionesContainerProps {
  initialReportes: Reporte[];
  empleados: Empleado[];
}

export default function LiquidacionesContainer({ initialReportes, empleados }: LiquidacionesContainerProps) {
  const [reportes, setReportes] = useState<Reporte[]>(initialReportes);
  const [tab, setTab] = useState<'obra' | 'tecnico' | 'global'>('obra');
  const [loading, setLoading] = useState(false);

  // Filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Pago
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0]);
  const [pagoMedio, setPagoMedio] = useState('Transferencia');
  const [pagoNotas, setPagoNotas] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);

  // Modal Detalle del Servicio
  const [selectedServicioDetalle, setSelectedServicioDetalle] = useState<Reporte | null>(null);

  // Refrescar lista de reportes
  const refreshData = async () => {
    setLoading(true);
    const supabase = createClient();
    const [
      { data: reportesData },
      { data: empleadosData }
    ] = await Promise.all([
      supabase
        .from('reportes')
        .select(`
          id, orden_id, creador_id, horas_trabajadas, creado_en,
          estado_liquidacion, fecha_pago, medio_pago, notas_pago,
          servicios!inner(
            codigo_servicio,
            nombre_cliente,
            dest_direccion,
            dest_observaciones,
            num_documento,
            tipos_servicios(nombre),
            servicios_materiales(id, codigo, descripcion, cantidad)
          )
        `)
        .order('creado_en', { ascending: false }),
      supabase
        .from('empleados')
        .select('*')
    ]);

    if (reportesData && empleadosData) {
      const merged = reportesData.map((rep: any) => {
        const empleado = empleadosData.find(emp => emp.perfil_id === rep.creador_id);
        return {
          ...rep,
          empleado_nombre: empleado ? empleado.nombre : 'Técnico Desconocido',
          tarifa_hora: empleado ? Number(empleado.tarifa_hora || 0) : 0,
          tipo_empleado: empleado ? empleado.tipo : 'interno'
        };
      });
      setReportes(merged);
    }
    setLoading(false);
  };

  // Filtrado de reportes
  const filteredReportes = useMemo(() => {
    return reportes.filter((rep) => {
      // Filtro de fecha
      const fechaRep = new Date(rep.creado_en).toISOString().split('T')[0];
      if (desde && fechaRep < desde) return false;
      if (hasta && fechaRep > hasta) return false;

      // Filtro de Técnico
      if (tecnicoFilter && rep.creador_id !== tecnicoFilter) return false;

      // Filtro de Estado
      if (estadoFilter && rep.estado_liquidacion !== estadoFilter) return false;

      // Filtro de Búsqueda texto (código de servicio u obra/cliente)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const code = rep.servicios?.codigo_servicio?.toLowerCase() || '';
        const client = rep.servicios?.nombre_cliente?.toLowerCase() || '';
        const tech = rep.empleado_nombre?.toLowerCase() || '';
        if (!code.includes(q) && !client.includes(q) && !tech.includes(q)) return false;
      }

      return true;
    });
  }, [reportes, desde, hasta, tecnicoFilter, estadoFilter, searchQuery]);

  // Cálculos agregados
  const stats = useMemo(() => {
    let horas = 0;
    let coste = 0;
    let pagado = 0;
    let pendiente = 0;

    filteredReportes.forEach((rep) => {
      const h = Number(rep.horas_trabajadas || 0);
      const tarifa = Number(rep.tarifa_hora || 0);
      const total = h * tarifa;

      horas += h;
      coste += total;
      if (rep.estado_liquidacion === 'Pagado') {
        pagado += total;
      } else {
        pendiente += total;
      }
    });

    return { horas, coste, pagado, pendiente };
  }, [filteredReportes]);

  // Agrupamiento por Obra (Servicio)
  const reportesAgrupadosObra = useMemo(() => {
    const map = new Map<string, { codigo: string; cliente: string; horas: number; coste: number; reportes: Reporte[] }>();
    
    filteredReportes.forEach((rep) => {
      const key = rep.servicios?.codigo_servicio || rep.orden_id.toString();
      const h = Number(rep.horas_trabajadas || 0);
      const total = h * Number(rep.tarifa_hora || 0);

      if (!map.has(key)) {
        map.set(key, {
          codigo: key,
          cliente: rep.servicios?.nombre_cliente || 'Cliente no registrado',
          horas: 0,
          coste: 0,
          reportes: []
        });
      }

      const item = map.get(key)!;
      item.horas += h;
      item.coste += total;
      item.reportes.push(rep);
    });

    return Array.from(map.values()).sort((a,b) => b.coste - a.coste);
  }, [filteredReportes]);

  // Agrupamiento por Técnico
  const reportesAgrupadosTecnico = useMemo(() => {
    const map = new Map<string, { creador_id: string; nombre: string; tipo: string; tarifa: number; horas: number; coste: number; reportes: Reporte[] }>();

    filteredReportes.forEach((rep) => {
      const key = rep.creador_id;
      const h = Number(rep.horas_trabajadas || 0);
      const total = h * Number(rep.tarifa_hora || 0);

      if (!map.has(key)) {
        map.set(key, {
          creador_id: key,
          nombre: rep.empleado_nombre,
          tipo: rep.tipo_empleado,
          tarifa: Number(rep.tarifa_hora || 0),
          horas: 0,
          coste: 0,
          reportes: []
        });
      }

      const item = map.get(key)!;
      item.horas += h;
      item.coste += total;
      item.reportes.push(rep);
    });

    return Array.from(map.values()).sort((a,b) => b.coste - a.coste);
  }, [filteredReportes]);

  // Abrir Modal para Registrar Pago
  const openPagoModal = (rep: Reporte) => {
    setSelectedReporte(rep);
    setPagoFecha(new Date().toISOString().split('T')[0]);
    setPagoMedio('Transferencia');
    setPagoNotas('');
    setIsPagoModalOpen(true);
  };

  // Registrar el Pago en la Base de Datos
  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReporte) return;

    setGuardandoPago(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('reportes')
      .update({
        estado_liquidacion: 'Pagado',
        fecha_pago: pagoFecha,
        medio_pago: pagoMedio,
        notas_pago: pagoNotas.trim() || null
      })
      .eq('id', selectedReporte.id);

    setGuardandoPago(false);

    if (error) {
      alert("Error al registrar el pago: " + error.message);
    } else {
      setIsPagoModalOpen(false);
      await refreshData();
    }
  };

  // Revertir el Pago a Pendiente
  const handleRevertirPago = async (repId: string) => {
    if (!window.confirm("¿Estás seguro de marcar esta liquidación nuevamente como PENDIENTE de pago?")) return;

    setLoading(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('reportes')
      .update({
        estado_liquidacion: 'Pendiente',
        fecha_pago: null,
        medio_pago: null,
        notas_pago: null
      })
      .eq('id', repId);

    if (error) {
      alert("Error al actualizar la liquidación: " + error.message);
    } else {
      await refreshData();
    }
    setLoading(false);
  };

  // Exportar liquidación a Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Detalle plano
    const rawData = filteredReportes.map((r, i) => ({
      'Nº': i + 1,
      'Código Servicio': r.servicios?.codigo_servicio || '-',
      'Cliente / Obra': r.servicios?.nombre_cliente || '-',
      'Técnico / Colaborador': r.empleado_nombre,
      'Tipo Técnico': r.tipo_empleado === 'interno' ? 'Plantilla' : r.tipo_empleado === 'autonomo' ? 'Autónomo' : 'Empresa Externa',
      'Horas Trabajadas': r.horas_trabajadas,
      'Tarifa Pactada (€/h)': r.tarifa_hora,
      'Total a Liquidar (€)': Number(r.horas_trabajadas * r.tarifa_hora).toFixed(2),
      'Estado Cobro': r.estado_liquidacion,
      'Fecha Pago': r.fecha_pago ? new Date(r.fecha_pago).toLocaleDateString('es-ES') : '-',
      'Medio Pago': r.medio_pago || '-',
      'Referencia / Notas Pago': r.notas_pago || '-',
      'Fecha Registro': new Date(r.creado_en).toLocaleDateString('es-ES')
    }));

    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Detalle Intervenciones');

    // Hoja 2: Resumen por Técnico
    const summaryTechData = reportesAgrupadosTecnico.map((t, i) => ({
      'Nº': i + 1,
      'Nombre Colaborador': t.nombre,
      'Tipo Técnico': t.tipo === 'interno' ? 'Plantilla' : t.tipo === 'autonomo' ? 'Autónomo' : 'Empresa Externa',
      'Tarifa Pactada': t.tarifa,
      'Horas Totales': t.horas,
      'Total a Pagar (€)': Number(t.coste).toFixed(2),
      'Partes Registrados': t.reportes.length
    }));

    const wsTech = XLSX.utils.json_to_sheet(summaryTechData);
    XLSX.utils.book_append_sheet(wb, wsTech, 'Resumen por Técnico');

    // Hoja 3: Resumen por Servicio/Obra
    const summaryObraData = reportesAgrupadosObra.map((o, i) => ({
      'Nº': i + 1,
      'Código Servicio': o.codigo,
      'Cliente / Obra': o.cliente,
      'Horas Totales': o.horas,
      'Total Liquidación (€)': Number(o.coste).toFixed(2),
      'Intervenciones': o.reportes.length
    }));

    const wsObra = XLSX.utils.json_to_sheet(summaryObraData);
    XLSX.utils.book_append_sheet(wb, wsObra, 'Resumen por Obra');

    // Guardar archivo Excel
    XLSX.writeFile(wb, `Liquidaciones_Ribera_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Horas Totales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas Trabajadas</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.horas.toFixed(1)}h</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">Horas acumuladas filtradas</p>
        </div>

        {/* Coste Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Coste Estimado</span>
            <Euro size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.coste.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">Valor devengado de las horas</p>
        </div>

        {/* Importe Pagado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20 border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Pagado</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{stats.pagado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
          <p className="text-[10px] text-emerald-600/70 mt-1 font-semibold">Liquidaciones ya procesadas</p>
        </div>

        {/* Importe Pendiente */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm bg-amber-50/20 border-amber-100">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Pendiente</span>
            <XCircle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{stats.pendiente.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
          <p className="text-[10px] text-amber-600/70 mt-1 font-semibold">Pendiente de abono / facturación</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Settings size={14} />
            <span>Filtros de Liquidación</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all border border-slate-200 bg-white"
              title="Refrescar datos"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-600/10 cursor-pointer transition-all"
            >
              <Download size={13} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Buscar */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Búsqueda rápida</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Servicio, cliente o técnico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Fecha Desde */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Inicio</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Fin</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Técnico */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Técnico / Colaborador</label>
            <select
              value={tecnicoFilter}
              onChange={(e) => setTecnicoFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="">Todos los técnicos</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id.toString() || ''}>
                  {emp.nombre} {emp.tipo !== 'interno' ? `(Ext)` : `(Int)`}
                </option>
              ))}
            </select>
          </div>

          {/* Estado Pago */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Estado de Cobro</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            >
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente de Pago</option>
              <option value="Pagado">Pagados</option>
            </select>
          </div>
        </div>
      </div>

      {/* PESTAÑAS Y LISTADO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Selector de Pestaña */}
        <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('obra')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                tab === 'obra' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agrupado por Obra / Servicio
            </button>
            <button
              onClick={() => setTab('tecnico')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                tab === 'tecnico' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resumen por Técnico
            </button>
            <button
              onClick={() => setTab('global')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                tab === 'global' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Detalle Global de Intervenciones
            </button>
          </div>
        </div>

        {/* CONTENIDO TAB 1: AGRUPADO POR OBRA */}
        {tab === 'obra' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-40">Cód. Servicio</th>
                  <th className="px-5 py-3">Cliente / Obra</th>
                  <th className="px-5 py-3 w-32 text-center">Intervenciones</th>
                  <th className="px-5 py-3 w-32 text-right">Horas Totales</th>
                  <th className="px-5 py-3 w-36 text-right">Total Liquidación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {reportesAgrupadosObra.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                      -- No hay datos de liquidaciones --
                    </td>
                  </tr>
                ) : (
                  reportesAgrupadosObra.map((obra) => (
                    <tr key={obra.codigo} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-sm">{obra.codigo}</td>
                      <td className="px-5 py-3.5 text-slate-800 text-sm font-bold">{obra.cliente}</td>
                      <td className="px-5 py-3.5 text-center text-slate-500">{obra.reportes.length} partes</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">{obra.horas.toFixed(1)}h</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">{obra.coste.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTENIDO TAB 2: RESUMEN POR TÉCNICO */}
        {tab === 'tecnico' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Nombre del Técnico / Colaborador</th>
                  <th className="px-5 py-3 w-32 text-center">Tipo</th>
                  <th className="px-5 py-3 w-28 text-right">Tarifa pactada</th>
                  <th className="px-5 py-3 w-32 text-center">Partes</th>
                  <th className="px-5 py-3 w-32 text-right">Horas Totales</th>
                  <th className="px-5 py-3 w-36 text-right">Total a Liquidar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {reportesAgrupadosTecnico.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                      -- No hay datos de liquidaciones --
                    </td>
                  </tr>
                ) : (
                  reportesAgrupadosTecnico.map((t) => (
                    <tr key={t.creador_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-900 font-bold text-sm">{t.nombre}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          t.tipo === 'empresa_externa' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                          t.tipo === 'autonomo' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                          'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {t.tipo === 'empresa_externa' ? 'Empresa' : t.tipo === 'autonomo' ? 'Autónomo' : 'Interno'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">{t.tarifa.toFixed(2)}€/h</td>
                      <td className="px-5 py-3.5 text-center text-slate-500">{t.reportes.length} partes</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">{t.horas.toFixed(1)}h</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">{t.coste.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTENIDO TAB 3: DETALLE GLOBAL PLANO */}
        {tab === 'global' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-32">Servicio</th>
                  <th className="px-5 py-3">Cliente / Obra</th>
                  <th className="px-5 py-3">Técnico / Colaborador</th>
                  <th className="px-5 py-3 w-28 text-right">Horas</th>
                  <th className="px-5 py-3 w-32 text-right">Total Parte</th>
                  <th className="px-5 py-3 w-36 text-center">Estado Liquidación</th>
                  <th className="px-5 py-3 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {filteredReportes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 italic">
                      -- No hay intervenciones que coincidan con los filtros --
                    </td>
                  </tr>
                ) : (
                  filteredReportes.map((rep) => {
                    const totalParte = Number(rep.horas_trabajadas || 0) * Number(rep.tarifa_hora || 0);
                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{rep.servicios?.codigo_servicio}</td>
                        <td className="px-5 py-3.5 text-slate-800 font-bold">{rep.servicios?.nombre_cliente}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800">{rep.empleado_nombre}</p>
                          <p className="text-[10px] text-slate-400 font-normal">Tarifa: {rep.tarifa_hora.toFixed(2)}€/h</p>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">{rep.horas_trabajadas.toFixed(1)}h</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{totalParte.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                        <td className="px-5 py-3.5 text-center">
                          {rep.estado_liquidacion === 'Pagado' ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                                PAGADO
                              </span>
                              {rep.fecha_pago && (
                                <span className="text-[8px] text-slate-400 font-medium mt-0.5">
                                  {new Date(rep.fecha_pago).toLocaleDateString('es-ES')} - {rep.medio_pago}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                              PENDIENTE
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedServicioDetalle(rep)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer transition-all flex items-center gap-1"
                              title="Ver detalle del servicio"
                            >
                              <FileText size={10} />
                              <span>Detalle</span>
                            </button>
                            {rep.estado_liquidacion === 'Pagado' ? (
                              <button
                                type="button"
                                onClick={() => handleRevertirPago(rep.id)}
                                className="text-red-500 hover:text-red-700 text-[10px] font-bold hover:underline transition-all cursor-pointer px-1"
                                title="Marcar nuevamente como Pendiente"
                              >
                                Revertir
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPagoModal(rep)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-md shadow-blue-600/10 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                              >
                                <CreditCard size={10} />
                                <span>Pagar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE DEL SERVICIO */}
      {selectedServicioDetalle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-400" />
                <h3 className="text-sm font-bold">Detalle del Servicio</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServicioDetalle(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Servicio / Cliente</p>
                <p className="text-slate-900 font-bold text-sm">{selectedServicioDetalle.servicios?.codigo_servicio} — {selectedServicioDetalle.servicios?.nombre_cliente}</p>
                <p className="text-slate-600">{selectedServicioDetalle.servicios?.dest_direccion || 'Sin dirección registrada'}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    {selectedServicioDetalle.servicios?.tipos_servicios?.nombre || 'General'}
                  </span>
                  {selectedServicioDetalle.servicios?.num_documento && (
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Ref. {selectedServicioDetalle.servicios.num_documento}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trabajo a realizar / Notas</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {selectedServicioDetalle.servicios?.dest_observaciones ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedServicioDetalle.servicios.dest_observaciones}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin notas registradas</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText size={12} />
                  Materiales / Artículos
                </p>
                {selectedServicioDetalle.servicios?.servicios_materiales && selectedServicioDetalle.servicios.servicios_materiales.length > 0 ? (
                  <ul className="space-y-1.5">
                    {selectedServicioDetalle.servicios.servicios_materiales.map((mat) => (
                      <li key={mat.id} className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                        <span className="flex-1">{mat.descripcion}</span>
                        <span className="shrink-0 text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">x{Number(mat.cantidad || 1).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                    Sin materiales registrados — consulte con oficina
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Intervención registrada</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{selectedServicioDetalle.empleado_nombre}</span>
                  <span className="text-slate-500">{selectedServicioDetalle.horas_trabajadas.toFixed(1)}h · {Number(selectedServicioDetalle.horas_trabajadas * selectedServicioDetalle.tarifa_hora).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR PAGO */}
      {isPagoModalOpen && selectedReporte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
              <CreditCard size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold">Registrar Pago de Liquidación</h3>
            </div>

            <form onSubmit={handleRegistrarPago} className="p-5 space-y-4">
              
              {/* Información del Parte */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Detalle del Servicio</p>
                <p className="text-slate-800 font-bold">Servicio: {selectedReporte.servicios?.codigo_servicio} — {selectedReporte.servicios?.nombre_cliente}</p>
                <p className="text-slate-800 font-medium">Técnico: {selectedReporte.empleado_nombre}</p>
                <p className="text-blue-700 font-black text-sm pt-1.5 border-t border-slate-200 mt-1.5 flex justify-between">
                  <span>IMPORTE A ABONAR:</span>
                  <span>{(Number(selectedReporte.horas_trabajadas) * Number(selectedReporte.tarifa_hora)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </p>
              </div>

              {/* Fecha de Pago */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Fecha de Pago</label>
                <input
                  type="date"
                  value={pagoFecha}
                  onChange={(e) => setPagoFecha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Medio de Pago */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Medio de Pago</label>
                <select
                  value={pagoMedio}
                  onChange={(e) => setPagoMedio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Recibo Bancario">Recibo Bancario</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Otros">Otros / Ajuste</option>
                </select>
              </div>

              {/* Referencia o Notas de Pago */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Notas / Referencia de Pago</label>
                <input
                  type="text"
                  value={pagoNotas}
                  onChange={(e) => setPagoNotas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Ej: Ref. Transferencia 849302"
                />
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPagoModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPago}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50"
                >
                  {guardandoPago ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
