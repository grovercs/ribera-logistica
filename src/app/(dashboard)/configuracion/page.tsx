import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ConfiguracionContainer from '@/components/configuracion/ConfiguracionContainer';

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  // Cargar técnicos, tiendas y configuración de correo en paralelo desde Supabase
  const [
    { data: empleados },
    { data: tiendas },
    { data: configCorreo }
  ] = await Promise.all([
    supabase.from('empleados').select('*').order('nombre'),
    supabase.from('tiendas').select('*').order('id'),
    supabase.from('configuracion_correo').select('*').order('id', { ascending: false }).limit(1).maybeSingle()
  ]);

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">

      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Ajustes del Programa</h1>
        <p className="text-slate-500 text-sm">Gestiona los técnicos de la empresa, tiendas, configuración de correo y otros catálogos básicos del sistema.</p>
      </div>

      {/* Contenedor de Configuración */}
      <ConfiguracionContainer
        initialEmpleados={empleados || []}
        initialTiendas={tiendas || []}
        initialConfigCorreo={configCorreo || null}
      />

    </div>
  );
}
