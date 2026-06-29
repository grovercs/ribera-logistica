import React from 'react';
import { createClient } from '@/lib/supabase/server';
import CorreosListContainer from '@/components/correos/CorreosListContainer';

export default async function CorreosPage() {
  const supabase = await createClient();

  // Cargar historial de correos y catálogos en paralelo
  const [
    { data: tiendas },
    { data: empleados },
    { data: estados },
    { data: tiposDocumentos },
    { data: tiposServicios },
    { data: correos }
  ] = await Promise.all([
    supabase.from('tiendas').select('*').order('id'),
    supabase.from('empleados').select('*').order('id'),
    supabase.from('estados').select('*').order('id'),
    supabase.from('tipos_documentos').select('*').order('id'),
    supabase.from('tipos_servicios').select('*').order('id'),
    supabase
      .from('servicios_correos')
      .select(`
        *,
        servicios(id, codigo_servicio, nombre_cliente)
      `)
      .order('fecha', { ascending: false })
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
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Correos Enviados</h1>
        <p className="text-slate-500 text-sm">Historial y estado de entrega de avisos enviados a clientes.</p>
      </div>

      {/* Contenedor Interactivo */}
      <CorreosListContainer 
        initialCorreos={correos || []} 
        catalogos={catalogos} 
      />

    </div>
  );
}
