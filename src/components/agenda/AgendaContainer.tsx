'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AgendaFilters from './AgendaFilters';
import AgendaTable from './AgendaTable';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, ChevronLeft, ChevronRight, Calendar, CheckCircle2, Clock, AlertCircle, Euro } from 'lucide-react';

interface AgendaContainerProps {
  initialServicios: any[];
  catalogos: any;
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 ${className}`}>{children}</div>
);

const Badge = ({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) => {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    primary: "border-primary/20 bg-primary/10 text-primary",
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
};

const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.99]";

export default function AgendaContainer({ initialServicios, catalogos }: AgendaContainerProps) {
  const [servicios, setServicios] = useState<any[]>(initialServicios);

  const [filtroRapido, setFiltroRapido] = useState<string>('todos_pendientes');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null);
  const [selectedTiendaId, setSelectedTiendaId] = useState<number | null>(null);

  const hoy = new Date();
  const mesActualInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesActualFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);

  const [viewStartDate, setViewStartDate] = useState<Date>(mesActualInicio);
  const [viewEndDate, setViewEndDate] = useState<Date>(mesActualFin);
  const [globalStartDate, setGlobalStartDate] = useState<Date>(tresMesesAtras);
  const [globalEndDate, setGlobalEndDate] = useState<Date>(mesActualFin);
  const [refreshing, setRefreshing] = useState(false);

  const formatDateInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const refreshList = async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('servicios')
      .select(`
        *,
        estados(nombre),
        tipos_servicios(nombre, color),
        tipos_documentos(nombre),
        tiendas(nombre),
        empleados(nombre)
      `)
      .gte('fecha_entrega', formatDateInput(globalStartDate))
      .lte('fecha_entrega', formatDateInput(globalEndDate))
      .order('fecha_entrega', { ascending: true });

    if (data) {
      setServicios(data);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const sync = async () => {
      setRefreshing(true);
      await refreshList();
    };

    interval = setInterval(sync, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newStart = new Date(viewStartDate);
    if (direction === 'prev') {
      newStart.setMonth(newStart.getMonth() - 1);
    } else {
      newStart.setMonth(newStart.getMonth() + 1);
    }
    const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
    setViewStartDate(newStart);
    setViewEndDate(newEnd);

    if (newStart < globalStartDate) {
      setGlobalStartDate(newStart);
    }
    if (newEnd > globalEndDate) {
      setGlobalEndDate(newEnd);
    }
  };

  const goToCurrentMonth = () => {
    setViewStartDate(mesActualInicio);
    setViewEndDate(mesActualFin);
  };

  const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [y, m] = e.target.value.split('-').map(Number);
    if (!y || !m) return;
    const newStart = new Date(y, m - 1, 1);
    const newEnd = new Date(y, m, 0);
    setViewStartDate(newStart);
    setViewEndDate(newEnd);
    if (newStart < globalStartDate) setGlobalStartDate(newStart);
    if (newEnd > globalEndDate) setGlobalEndDate(newEnd);
  };

  const getFilteredServicios = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let list = [...servicios];

    if (filtroRapido === 'todos_pendientes') {
      list = list.filter(s =>
        s.estados?.nombre !== 'Terminado' &&
        s.estados?.nombre !== 'Facturado/Cerrado' &&
        s.estados?.nombre !== 'Anulado'
      );
    } else if (filtroRapido === 'atrasados') {
      list = list.filter(s => {
        if (!s.fecha_entrega) return false;
        const [y, m, d] = s.fecha_entrega.split('-').map(Number);
        const f = new Date(y, m - 1, d);
        f.setHours(0, 0, 0, 0);
        return f < hoy &&
          s.estados?.nombre !== 'Terminado' &&
          s.estados?.nombre !== 'Facturado/Cerrado' &&
          s.estados?.nombre !== 'Anulado';
      });
    } else if (filtroRapido === 'urgentes') {
      list = list.filter(s =>
        s.estados?.nombre !== 'Terminado' &&
        s.estados?.nombre !== 'Facturado/Cerrado' &&
        s.estados?.nombre !== 'Anulado'
      );
      list.sort((a, b) => {
        if (!a.fecha_entrega) return 1;
        if (!b.fecha_entrega) return -1;
        return a.fecha_entrega.localeCompare(b.fecha_entrega);
      });
    } else if (filtroRapido === 'incidencias') {
      list = list.filter(s => s.incidencias === true);
    } else if (filtroRapido === 'terminados') {
      list = list.filter(s =>
        s.estados?.nombre === 'Terminado' ||
        s.estados?.nombre === 'Facturado/Cerrado'
      );
    }

    if (searchText.trim().length > 0) {
      const q = searchText.toLowerCase();
      list = list.filter(s =>
        s.codigo_servicio.toLowerCase().includes(q) ||
        s.nombre_cliente.toLowerCase().includes(q) ||
        (s.dest_direccion && s.dest_direccion.toLowerCase().includes(q)) ||
        (s.dest_poblacion && s.dest_poblacion.toLowerCase().includes(q)) ||
        (s.dest_observaciones && s.dest_observaciones.toLowerCase().includes(q))
      );
    }

    if (selectedEmpleadoId !== null) {
      list = list.filter(s => s.empleado_id === selectedEmpleadoId);
    }

    if (selectedTiendaId !== null) {
      list = list.filter(s => s.tienda_id === selectedTiendaId);
    }

    list = list.filter(s =>
      s.fecha_entrega &&
      s.fecha_entrega >= formatDateInput(viewStartDate) &&
      s.fecha_entrega <= formatDateInput(viewEndDate)
    );

    return list;
  };

  const filteredList = getFilteredServicios();

  const resumen = useMemo(() => {
    const total = filteredList.length;
    const terminados = filteredList.filter((s: any) => s.estados?.nombre === 'Terminado' || s.estados?.nombre === 'Facturado/Cerrado').length;
    const pendientes = total - terminados;
    const atrasados = filteredList.filter((s: any) => {
      if (!s.fecha_entrega) return false;
      const [y, m, d] = s.fecha_entrega.split('-').map(Number);
      const f = new Date(y, m - 1, d);
      f.setHours(0, 0, 0, 0);
      const h = new Date();
      h.setHours(0, 0, 0, 0);
      return f < h && s.estados?.nombre !== 'Terminado' && s.estados?.nombre !== 'Facturado/Cerrado' && s.estados?.nombre !== 'Anulado';
    }).length;
    const importe = filteredList.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
    return { total, terminados, pendientes, atrasados, importe };
  }, [filteredList]);

  const monthLabel = viewStartDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* Tarjeta de navegación */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl capitalize">{monthLabel}</h2>
              <p className="text-sm text-slate-500">Navega mes a mes. Rango cargado: {globalStartDate.toLocaleDateString('es-ES')} → {globalEndDate.toLocaleDateString('es-ES')}.</p>
            </div>
          </div>
          <Badge tone={refreshing ? "amber" : "green"}>{refreshing ? "Sincronizando..." : "Sincronizado"}</Badge>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateMonth('prev')} className={buttonLight} title="Mes anterior">
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Mes anterior</span>
            </button>
            <button onClick={goToCurrentMonth} className={buttonDark}>
              <Calendar size={18} />
              <span>Hoy</span>
            </button>
            <button onClick={() => navigateMonth('next')} className={buttonLight} title="Mes siguiente">
              <span className="hidden sm:inline">Mes siguiente</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Ir a mes:</label>
            <input
              type="month"
              value={formatDateInput(viewStartDate).slice(0, 7)}
              onChange={handleDateJump}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button onClick={refreshList} disabled={refreshing} className={buttonLight} title="Refrescar">
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total servicios</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.total}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
              <Calendar size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pendientes</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.pendientes}</p>
            </div>
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 font-medium">Atrasados</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.atrasados}</p>
            </div>
            <div className="rounded-2xl bg-red-100 p-2 text-red-700">
              <AlertCircle size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 font-medium">Importe visible</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.importe.toFixed(2)} €</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
              <Euro size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <AgendaFilters
        filtroRapido={filtroRapido}
        setFiltroRapido={setFiltroRapido}
        searchText={searchText}
        setSearchText={setSearchText}
        selectedEmpleadoId={selectedEmpleadoId}
        setSelectedEmpleadoId={setSelectedEmpleadoId}
        selectedTiendaId={selectedTiendaId}
        setSelectedTiendaId={setSelectedTiendaId}
        catalogos={catalogos}
        onRefresh={refreshList}
        refreshing={refreshing}
      />

      {/* Tabla */}
      <AgendaTable
        servicios={filteredList}
        onSaved={refreshList}
        catalogos={catalogos}
      />

    </div>
  );
}
