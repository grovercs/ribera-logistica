'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutShellProps {
  children: React.ReactNode;
  perfil: any;
}

export default function LayoutShell({ children, perfil }: LayoutShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Barra lateral de navegación izquierda */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Contenedor del contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabecera superior */}
        <Header user={perfil} onMenuClick={() => setIsSidebarOpen(true)} />

        {/* Zona de renderizado de páginas internas */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 lg:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
