'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CalendarDays, 
  ClipboardList, 
  Briefcase, 
  MailCheck, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const pathname = usePathname();
  const supabase = createClient();

  const menuItems = [
    {
      name: 'Planning',
      path: '/planning',
      icon: CalendarDays,
      description: 'Agenda por operario'
    },
    {
      name: 'Agenda de servicios',
      path: '/agenda',
      icon: ClipboardList,
      description: 'Listado de pendientes'
    },
    {
      name: 'Servicios',
      path: '/servicios',
      icon: Briefcase,
      description: 'Gestión y edición'
    },
    {
      name: 'Correos enviados',
      path: '/correos',
      icon: MailCheck,
      description: 'Historial de envíos'
    },
    {
      name: 'Configuración',
      path: '/configuracion',
      icon: Settings,
      description: 'Ajustes del programa'
    }
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (onLogout) {
      onLogout();
    }
    window.location.reload();
  };

  return (
    <aside className="w-68 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-full font-sans">
      
      {/* Cabecera / Logo */}
      <div className="p-5 border-b border-slate-800 flex flex-col items-center justify-center bg-slate-950/20">
        <img src="/logo-ribera.png" alt="Logística Ribera" className="max-h-12 w-auto object-contain" />
        <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-2.5">Panel de Logística</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {/* Dashboard Principal (Acceso Directo) */}
        <Link
          href="/"
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
            pathname === '/'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
              : 'hover:bg-slate-800/60 hover:text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-wider">Dashboard Principal</span>
          </div>
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        <div className="pt-4 pb-2 px-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operaciones</span>
        </div>

        {/* Menú Clásico Delphi */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : 'hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'} />
                <div>
                  <p className="leading-tight">{item.name}</p>
                  <span className={`text-[10px] block font-normal mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {item.description}
                  </span>
                </div>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </nav>

      {/* Footer / Cerrar Sesión */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/10">
        {/* Logo Vielha Computer (Delphi clásico) */}
        <div className="px-4 py-1.5 flex items-center justify-between border border-slate-800/40 rounded-xl bg-slate-950/30">
          <img src="/logo-vielha-computer.png" alt="Vielha Computer" className="h-6 w-auto object-contain opacity-70" />
          <span className="text-[8px] font-black text-slate-500 tracking-wider">CONECTADO</span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-4 py-2.5 text-xs font-bold text-red-400 bg-red-950/10 hover:bg-red-950/20 border border-red-900/10 rounded-xl transition-colors cursor-pointer group"
        >
          <LogOut size={14} className="mr-2 text-red-400 group-hover:text-red-300 transition-colors" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

    </aside>
  );
}
