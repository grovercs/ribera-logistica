import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AgendaContainer from '@/components/agenda/AgendaContainer';

export default async function AgendaPage() {
  const supabase = await createClient();

  // Calcular rango de carga: últimos 3 meses
  const hoy = new Date();
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const globalStartStr = tresMesesAtras.toISOString().split('T')[0];
  const globalEndStr = finMesActual.toISOString().split('T')[0];

  // Cargar catálogos y listado inicial en paralelo
  const [
    { data: tiendas },
    { data: empleados },
    { data: estados },
    { data: tiposDocumentos },
    { data: tiposServicios },
    { data: servicios }
  ] = await Promise.all([
    supabase.from('tiendas').select('*').order('id'),
    supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
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
      .gte('fecha_entrega', globalStartStr)
      .lte('fecha_entrega', globalEndStr)
      .order('fecha_entrega', { ascending: true })
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
      
      {/* Cabecera Agenda */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Agenda de Servicios</h1>
        <p className="text-slate-500 text-sm">Listado tabular de servicios y seguimiento rápido.</p>
      </div>

      {/* Contenedor Interactivo */}
      <AgendaContainer 
        initialServicios={servicios || []} 
        catalogos={catalogos} 
      />

    </div>
  );
}
