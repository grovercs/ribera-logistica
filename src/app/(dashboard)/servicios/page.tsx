import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ServiciosAdminContainer from '@/components/servicios/ServiciosAdminContainer';

export default async function ServiciosPage() {
  const supabase = await createClient();

  // Cargar catálogos y listado de servicios en paralelo
  const [
    { data: tiendas },
    { data: empleados },
    { data: estados },
    { data: tiposDocumentos },
    { data: tiposServicios },
    { data: servicios }
  ] = await Promise.all([
    supabase.from('tiendas').select('*').order('id'),
    supabase.from('empleados').select('*').order('id'),
    supabase.from('estados').select('*').order('id'),
    supabase.from('tipos_documentos').select('*').order('id'),
    supabase.from('tipos_servicios').select('*').order('id'),
    supabase
      .from('servicios')
      .select(`
        *,
        estados(nombre),
        tipos_servicios(nombre, color),
        tipos_documentos(nombre),
        tiendas(nombre),
        empleados(nombre)
      `)
      .order('codigo_servicio', { ascending: false })
  ]);

  const catalogos = {
    tiendas: tiendas || [],
    empleados: empleados || [],
    estados: estados || [],
    tiposDocumentos: tiposDocumentos || [],
    tiposServicios: tiposServicios || []
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Cabecera Sección */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Administración de Servicios</h1>
        <p className="text-slate-500 text-sm">Panel general de gestión, creación y eliminación de órdenes de servicios.</p>
      </div>

      {/* Contenedor CRUD */}
      <ServiciosAdminContainer 
        initialServicios={servicios || []} 
        catalogos={catalogos} 
      />

    </div>
  );
}
