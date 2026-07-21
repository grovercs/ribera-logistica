import React from 'react';
import { createClient } from '@/lib/supabase/server';
import ServiciosAdminContainer from '@/components/servicios/ServiciosAdminContainer';
import { ClipboardList } from 'lucide-react';

export default async function ServiciosPage() {
  const supabase = await createClient();

  // Calcular rango de carga: últimos 3 meses
  const hoy = new Date();
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
  const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const globalStartStr = tresMesesAtras.toISOString().split('T')[0];
  const globalEndStr = finMesActual.toISOString().split('T')[0];

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
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administración de Servicios</h1>
              <p className="text-sm text-slate-500">Gestión, creación y seguimiento de órdenes de servicio.</p>
            </div>
          </div>
        </div>

        <ServiciosAdminContainer
          initialServicios={servicios || []}
          catalogos={catalogos}
          initialGlobalStart={globalStartStr}
          initialGlobalEnd={globalEndStr}
        />

      </div>
    </div>
  );
}
