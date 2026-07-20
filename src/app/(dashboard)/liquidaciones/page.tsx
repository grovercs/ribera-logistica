import React from 'react';
import { createClient } from '@/lib/supabase/server';
import LiquidacionesContainer from '@/components/liquidaciones/LiquidacionesContainer';

export default async function LiquidacionesPage() {
  const supabase = await createClient();

  // Cargar reportes con la info de servicios, y los empleados (para tarifas)
  const [
    { data: reportesData },
    { data: empleadosData }
  ] = await Promise.all([
    supabase
      .from('reportes')
      .select(`
        id, orden_id, creador_id, horas_trabajadas, creado_en,
        estado_liquidacion, fecha_pago, medio_pago, notas_pago,
        servicios!inner(
          codigo_servicio,
          nombre_cliente,
          dest_direccion,
          dest_observaciones,
          num_documento,
          tipos_servicios(nombre),
          servicios_materiales(id, codigo, descripcion, cantidad)
        )
      `)
      .order('creado_en', { ascending: false }),
    supabase
      .from('empleados')
      .select('*')
      .order('nombre')
  ]);

  // Cruzar los reportes con las tarifas de los empleados
  const reportes = (reportesData || []).map((rep: any) => {
    const empleado = (empleadosData || []).find(emp => emp.perfil_id === rep.creador_id);
    return {
      ...rep,
      empleado_nombre: empleado ? empleado.nombre : 'Técnico Desconocido',
      tarifa_hora: empleado ? Number(empleado.tarifa_hora || 0) : 0,
      tipo_empleado: empleado ? empleado.tipo : 'interno'
    };
  });

  return (
    <div className="space-y-6 font-sans max-w-7xl mx-auto">
      
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Liquidaciones de Servicios</h1>
        <p className="text-slate-500 text-sm">Gestiona y controla los pagos a técnicos externos y autónomos colaboradores por horas trabajadas.</p>
      </div>

      <LiquidacionesContainer 
        initialReportes={reportes} 
        empleados={empleadosData || []} 
      />

    </div>
  );
}
