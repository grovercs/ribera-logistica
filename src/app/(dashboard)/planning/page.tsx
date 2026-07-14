import React from 'react';
import { createClient } from '@/lib/supabase/server';
import PlanningTimeline from '@/components/planning/PlanningTimeline';

export default async function PlanningPage() {
  const supabase = await createClient();

  // 1. Obtener rango inicial de fechas (quincena activa)
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes de esta semana
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const startStr = start.toISOString().split('T')[0];
  
  const end = new Date(start);
  end.setDate(start.getDate() + 14);
  const endStr = end.toISOString().split('T')[0];

  // 2. Cargar catálogos en paralelo
  const [
    { data: tiendas },
    { data: estados },
    { data: tiposDocumentos },
    { data: tiposServicios },
    { data: empleados },
    { data: servicios }
  ] = await Promise.all([
    supabase.from('tiendas').select('*').order('id'),
    supabase.from('estados').select('*').order('id'),
    supabase.from('tipos_documentos').select('*').order('id'),
    supabase.from('tipos_servicios').select('*').order('id'),
    supabase.from('empleados').select('*').order('nombre'),
    supabase
      .from('servicios')
      .select(`
        *,
        estados(nombre),
        tipos_servicios(nombre, color),
        tipos_documentos(nombre)
      `)
      .gte('fecha_entrega', startStr)
      .lte('fecha_entrega', endStr)
  ]);

  const catalogos = {
    tiendas: tiendas || [],
    estados: estados || [],
    tiposDocumentos: tiposDocumentos || [],
    tiposServicios: tiposServicios || [],
    empleados: empleados || []
  };

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Cabecera Sección */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Planning Semanal</h1>
        <p className="text-slate-500 text-sm">Distribución de servicios y asignación horaria por técnico.</p>
      </div>

      {/* Renderizado del Timeline Cliente */}
      <PlanningTimeline 
        initialStartDateStr={startStr}
        initialServicios={servicios || []} 
        catalogos={catalogos} 
      />

    </div>
  );
}
