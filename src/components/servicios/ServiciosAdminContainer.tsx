'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, RefreshCw, ChevronLeft, ChevronRight, Calendar, CheckCircle2, Clock, AlertCircle, Euro } from 'lucide-react';
import ServicioModal from './ServicioModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { eliminarServicio } from '@/app/(dashboard)/planning/actions';

interface ServiciosAdminContainerProps {
  initialServicios: any[];
  catalogos: any;
  initialGlobalStart: string;
  initialGlobalEnd: string;
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
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
};

const inputStyle = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]";
const buttonDark = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.99]";

const estadoTone = (nombre: string) => {
  switch (nombre) {
    case 'Terminado': return 'green';
    case 'Facturado/Cerrado': return 'primary';
    case 'Anulado': return 'slate';
    case 'En curso': return 'blue';
    case 'Aplazado': return 'amber';
    default: return 'amber';
  }
};

export default function ServiciosAdminContainer({ initialServicios, catalogos, initialGlobalStart, initialGlobalEnd }: ServiciosAdminContainerProps) {
  const [servicios, setServicios] = useState<any[]>(initialServicios);
  const [searchText, setSearchText] = useState('');
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; codigo: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hoy = new Date();
  const mesActualInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesActualFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  const [viewStartDate, setViewStartDate] = useState<Date>(mesActualInicio);
  const [viewEndDate, setViewEndDate] = useState<Date>(mesActualFin);
  const [globalStartDate, setGlobalStartDate] = useState<Date>(new Date(initialGlobalStart));
  const [globalEndDate, setGlobalEndDate] = useState<Date>(new Date(initialGlobalEnd));

  const formatDateInput = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const refreshList = async () => {
    setRefreshing(true);
    const supabase = require('@/lib/supabase/client').createClient();
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
      .order('codigo_servicio', { ascending: false });

    if (data) {
      setServicios(data);
    }
    setRefreshing(false);
  };

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

  const handleCreate = () => {
    setSelectedServicioId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedServicioId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await eliminarServicio(pendingDelete.id);
    setDeleting(false);
    if (res.success) {
      setPendingDelete(null);
      await refreshList();
    } else {
      alert(`Error al eliminar: ${res.error}`);
    }
  };

  const filteredServicios = servicios.filter(s =>
    (s.codigo_servicio.toLowerCase().includes(searchText.toLowerCase()) ||
    s.nombre_cliente.toLowerCase().includes(searchText.toLowerCase()) ||
    (s.dest_direccion && s.dest_direccion.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.dest_poblacion && s.dest_poblacion.toLowerCase().includes(searchText.toLowerCase()))) &&
    s.fecha_entrega &&
    s.fecha_entrega >= formatDateInput(viewStartDate) &&
    s.fecha_entrega <= formatDateInput(viewEndDate)
  );

  const resumen = useMemo(() => {
    const total = filteredServicios.length;
    const terminados = filteredServicios.filter((s: any) => s.estados?.nombre === 'Terminado' || s.estados?.nombre === 'Facturado/Cerrado').length;
    const pendientes = total - terminados;
    const importe = filteredServicios.reduce((acc: number, s: any) => acc + (Number(s.total) || 0), 0);
    return { total, terminados, pendientes, importe };
  }, [filteredServicios]);

  const formatFecha = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const monthLabel = viewStartDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* Navegación por meses */}
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
              <p className="text-xs text-slate-500 font-medium">Terminados</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.terminados}</p>
            </div>
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 size={20} />
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

      {/* Acciones */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={inputStyle + " pl-9"}
              placeholder="Buscar por cliente, código, dirección..."
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={refreshList} disabled={refreshing} className={buttonLight} title="Refrescar">
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
            <button onClick={handleCreate} className={buttonDark}>
              <Plus size={18} />
              <span>Añadir Servicio</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-[110px]">Código</th>
                <th className="px-4 py-3 w-32">Estado</th>
                <th className="px-4 py-3 min-w-[160px]">Cliente</th>
                <th className="px-4 py-3 w-36">Tienda</th>
                <th className="px-4 py-3 w-28">Fecha Entrega</th>
                <th className="px-4 py-3 w-32">Tipo Documento</th>
                <th className="px-4 py-3 w-40">Tipo Servicio</th>
                <th className="px-4 py-3 w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServicios.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-400 font-medium">
                    No hay registros de órdenes de servicios en este rango.
                  </td>
                </tr>
              ) : (
                filteredServicios.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 tracking-tight whitespace-nowrap" title={s.codigo_servicio}>{s.codigo_servicio}</td>

                    <td className="px-4 py-3">
                      <Badge tone={estadoTone(s.estados?.nombre || 'Pendiente')}>
                        {s.estados?.nombre || 'Pendiente'}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 truncate max-w-[220px]" title={s.nombre_cliente}>
                      {s.nombre_cliente}
                    </td>

                    <td className="px-4 py-3 truncate max-w-[140px]" title={s.tiendas?.nombre}>
                      {s.tiendas?.nombre || '--'}
                    </td>

                    <td className="px-4 py-3 text-slate-700">{formatFecha(s.fecha_entrega)}</td>

                    <td className="px-4 py-3 text-slate-600">{s.tipos_documentos?.nombre || '--'}</td>

                    <td className="px-4 py-3">{s.tipos_servicios?.nombre || 'General'}</td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(s.id)}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete({ id: s.id, codigo: s.codigo_servicio })}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServicioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={refreshList}
        servicioId={selectedServicioId}
        catalogos={catalogos}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar servicio"
        message={`¿Seguro que deseas eliminar el servicio ${pendingDelete?.codigo || ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
      />

    </div>
  );
}
