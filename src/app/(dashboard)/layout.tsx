import React from 'react';
import LayoutShell from '@/components/layout/LayoutShell';
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
    <LayoutShell perfil={perfil}>
      {children}
    </LayoutShell>
  );
}
