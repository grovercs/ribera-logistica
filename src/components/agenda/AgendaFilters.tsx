'use client';

import React from 'react';
import { Search, X, Eye, AlertCircle, Clock, CheckSquare, RefreshCw } from 'lucide-react';

interface CatalogoItem {
  id: number;
  nombre: string;
}

interface EmpleadoItem {
  id: number;
  nombre: string;
}

interface Catalogos {
  tiendas: CatalogoItem[];
  empleados: EmpleadoItem[];
}

interface AgendaFiltersProps {
  filtroRapido: string;
  setFiltroRapido: (val: string) => void;
  searchText: string;
  setSearchText: (val: string) => void;
  selectedEmpleadoId: number | null;
  setSelectedEmpleadoId: (id: number | null) => void;
  selectedTiendaId: number | null;
  setSelectedTiendaId: (id: number | null) => void;
  catalogos: Catalogos;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const inputStyle = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10";
const buttonLight = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]";

export default function AgendaFilters({
  filtroRapido,
  setFiltroRapido,
  searchText,
  setSearchText,
  selectedEmpleadoId,
  setSelectedEmpleadoId,
  selectedTiendaId,
  setSelectedTiendaId,
  catalogos,
  onRefresh,
  refreshing
}: AgendaFiltersProps) {

  const clearFilters = () => {
    setFiltroRapido('todos_pendientes');
    setSearchText('');
    setSelectedEmpleadoId(null);
    setSelectedTiendaId(null);
  };

  const hasActiveFilters =
    filtroRapido !== 'todos_pendientes' ||
    searchText !== '' ||
    selectedEmpleadoId !== null ||
    selectedTiendaId !== null;

  const pill = (key: string, label: string, icon: React.ReactNode, activeClasses: string, idleClasses: string) => {
    const active = filtroRapido === key;
    return (
      <button
        type="button"
        onClick={() => setFiltroRapido(key)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? activeClasses : idleClasses}`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 space-y-5">

      {/* Filtros rápidos */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accesos rápidos</span>
        <div className="flex flex-wrap gap-2">
          {pill('todos_pendientes', 'Pendientes', <Clock size={13} />, 'bg-primary border-primary text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
          {pill('atrasados', 'Atrasados', <AlertCircle size={13} />, 'bg-red-600 border-red-600 text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
          {pill('urgentes', 'Urgentes', <Clock size={13} />, 'bg-amber-500 border-amber-500 text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
          {pill('incidencias', 'Incidencias', <AlertCircle size={13} />, 'bg-orange-500 border-orange-500 text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
          {pill('terminados', 'Terminados', <CheckSquare size={13} />, 'bg-emerald-600 border-emerald-600 text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
          {pill('todos', 'Ver todos', <Eye size={13} />, 'bg-slate-800 border-slate-800 text-white', 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
        </div>
      </div>

      {/* Buscador y selects */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 space-y-1">
          <label className="block text-xs font-medium text-slate-600">Buscador general</label>
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={inputStyle + " pl-9"}
              placeholder="Cliente, código, dirección..."
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="block text-xs font-medium text-slate-600">Técnico / Operario</label>
          <select
            value={selectedEmpleadoId || ''}
            onChange={(e) => setSelectedEmpleadoId(e.target.value ? Number(e.target.value) : null)}
            className={inputStyle + " cursor-pointer"}
          >
            <option value="">Todos los técnicos</option>
            {catalogos.empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 space-y-1">
          <label className="block text-xs font-medium text-slate-600">Tienda / Almacén</label>
          <select
            value={selectedTiendaId || ''}
            onChange={(e) => setSelectedTiendaId(e.target.value ? Number(e.target.value) : null)}
            className={inputStyle + " cursor-pointer"}
          >
            <option value="">Todas las tiendas</option>
            {catalogos.tiendas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={buttonLight + " flex-1 justify-center"}
            title="Refrescar agenda"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer uppercase tracking-wider"
          >
            <X size={12} />
            <span>Limpiar filtros</span>
          </button>
        </div>
      )}

    </div>
  );
}
