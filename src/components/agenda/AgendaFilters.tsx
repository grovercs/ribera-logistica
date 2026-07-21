'use client';

import React from 'react';
import { Search, Calendar, Filter, X, Eye, AlertCircle, Clock, CheckSquare, RefreshCw } from 'lucide-react';

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

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-5">
      
      {/* Botonera de Filtros Rápidos (Diseño Clásico de Delphi) */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accesos Rápidos</span>
        <div className="flex flex-wrap gap-2">
          
          {/* Todos los Pendientes */}
          <button
            type="button"
            onClick={() => setFiltroRapido('todos_pendientes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'todos_pendientes'
                ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={13} />
            <span>Todos los Pendientes</span>
          </button>

          {/* Atrasados */}
          <button
            type="button"
            onClick={() => setFiltroRapido('atrasados')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'atrasados'
                ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-600/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertCircle size={13} />
            <span>Atrasados</span>
          </button>

          {/* Más Urgentes */}
          <button
            type="button"
            onClick={() => setFiltroRapido('urgentes')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'urgentes'
                ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={13} />
            <span>Más Urgentes</span>
          </button>

          {/* Con Incidencias */}
          <button
            type="button"
            onClick={() => setFiltroRapido('incidencias')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'incidencias'
                ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertCircle size={13} />
            <span>Con Incidencias</span>
          </button>

          {/* Terminados */}
          <button
            type="button"
            onClick={() => setFiltroRapido('terminados')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'terminados'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckSquare size={13} />
            <span>Terminados</span>
          </button>

          {/* Ver Todos */}
          <button
            type="button"
            onClick={() => setFiltroRapido('todos')}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroRapido === 'todos'
                ? 'bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-800/10'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye size={13} />
            <span>Ver Todos</span>
          </button>

        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Buscador de Texto */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Buscador General</label>
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white placeholder:text-slate-400 transition-all"
              placeholder="Buscar cliente, código, dirección..."
            />
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Filtrar por Operario */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Técnico / Operario</label>
          <select
            value={selectedEmpleadoId || ''}
            onChange={(e) => setSelectedEmpleadoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
          >
            <option value="">-- Todos los técnicos --</option>
            {catalogos.empleados.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
        </div>

        {/* Filtrar por Tienda */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tienda / Almacén</label>
          <select
            value={selectedTiendaId || ''}
            onChange={(e) => setSelectedTiendaId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
          >
            <option value="">-- Todas las tiendas --</option>
            {catalogos.tiendas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all border border-slate-200 bg-white self-start mt-5"
          title="Refrescar agenda"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>

      {/* Botón de resetear filtros */}
      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer uppercase tracking-wider"
          >
            <X size={12} />
            <span>Limpiar Filtros</span>
          </button>
        </div>
      )}

    </div>
  );
}
