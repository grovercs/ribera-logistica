'use client';

import React from 'react';
import { User, Bell, ShieldCheck, Menu } from 'lucide-react';

interface HeaderProps {
  user?: {
    email?: string;
    nombre?: string;
    rol?: string;
  } | null;
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  // Obtener fecha del día de hoy en español
  const getTodayDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 font-sans shadow-sm">
      
      {/* Título o Fecha con menú hamburguesa para móvil */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-700 transition-colors md:hidden rounded-lg hover:bg-slate-100 cursor-pointer flex items-center justify-center"
          title="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <span className="text-xs font-bold text-slate-400 capitalize hidden sm:inline">
          {getTodayDateString()}
        </span>
      </div>

      {/* Acciones e Info del Usuario */}
      <div className="flex items-center gap-6">
        
        {/* Indicador genérico de sistema en línea (no expone la tecnología usada) */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>En línea</span>
        </div>

        {/* Botón de Notificaciones */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-50">
          <Bell size={18} />
          {/* Indicador rojo de notificación */}
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Usuario Logueado */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 leading-tight">
              {user?.nombre || user?.email || 'Operario'}
            </span>
            <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 uppercase tracking-wider mt-0.5">
              <ShieldCheck size={10} />
              {user?.rol || 'Instalador'}
            </span>
          </div>
          
          {/* Avatar del Usuario */}
          <div className="w-9 h-9 bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center rounded-lg shadow-sm">
            <User size={18} />
          </div>
        </div>

      </div>

    </header>
  );
}
