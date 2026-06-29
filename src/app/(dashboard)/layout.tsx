import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Obtener usuario autenticado en el servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil = null;

  if (user) {
    // Obtener los datos del perfil extendido del usuario
    const { data } = await supabase
      .from('perfiles')
      .select('nombre, email, rol')
      .eq('id', user.id)
      .single();
    
    perfil = data;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Barra lateral de navegación izquierda */}
      <Sidebar />

      {/* Contenedor del contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Cabecera superior */}
        <Header user={perfil} />

        {/* Zona de renderizado de páginas internas */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
          {children}
        </main>

      </div>

    </div>
  );
}
