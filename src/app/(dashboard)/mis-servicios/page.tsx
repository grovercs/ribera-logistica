import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MisServiciosContainer from '@/components/mis-servicios/MisServiciosContainer';

export default async function MisServiciosPage() {
  const supabase = await createClient();

  // Obtener sesión del usuario
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener la ficha del operario/técnico
  const { data: empleado } = await supabase
    .from('empleados')
    .select('*')
    .eq('perfil_id', user.id)
    .maybeSingle();

  if (!empleado) {
    return (
      <div className="space-y-6 font-sans max-w-4xl mx-auto py-12 px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-xl font-bold text-slate-800">Acceso Restringido</h1>
          <p className="text-slate-500 text-sm mt-2">No se ha encontrado ninguna ficha de técnico asociada a tu usuario de acceso.</p>
          <p className="text-slate-400 text-xs mt-1">Por favor, contacta con el administrador de BigMat Ribera para que asocie tu cuenta.</p>
        </div>
      </div>
    );
  }

  // Cargar todos los reportes de este operario
  const { data: reportes } = await supabase
    .from('reportes')
    .select(`
      id, orden_id, creado_en, fecha_trabajo, horas_trabajadas, estado_liquidacion,
      trabajo_realizado, material_utilizado, firma_url, fotos_urls, facturas_urls,
      fecha_pago, medio_pago, notas_pago,
      servicios!inner(codigo_servicio, nombre_cliente, dest_direccion, dest_poblacion, dest_observaciones, num_documento, tipos_servicios(nombre))
    `)
    .eq('creador_id', user.id)
    .order('creado_en', { ascending: false });

  // Mapear tarifa y calcular costes
  const reportesMapeados = (reportes || []).map((rep: any) => ({
    ...rep,
    tarifa_hora: Number(empleado.tarifa_hora || 0),
    total_importe: Number(rep.horas_trabajadas || 0) * Number(empleado.tarifa_hora || 0)
  }));

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mis Servicios Prestados</h1>
        <p className="text-slate-500 text-sm">Visualiza el historial de tus intervenciones e instalaciones realizadas para BigMat Ribera y el estado de tus cobros.</p>
      </div>

      <MisServiciosContainer 
        reportes={reportesMapeados}
        empleado={empleado}
      />

    </div>
  );
}
