'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Interfaz para el guardado de materiales
interface MaterialInput {
  id?: number;
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
}

// Interfaz para el guardado de incidencias
interface IncidenciaInput {
  id?: number;
  descripcion: string;
  solucionada: boolean;
  solucion: string | null;
}

// Interfaz completa de los datos del servicio a guardar
interface ServicioInput {
  id?: number;
  codigo_servicio: string;
  codigo_barras: string | null;
  cliente_id: number | null;
  nombre_cliente: string;
  tienda_id: number | null;
  tipo_servicio_id: number | null;
  estado_id: number | null;
  tipo_documento_id: number | null;
  num_documento: string | null;
  ubicacion: string | null;
  fecha_entrega: string | null; // Formato YYYY-MM-DD
  fecha_prevista: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora_entrega_ini: string | null; // Formato HH:MM:SS o HH:MM
  hora_entrega_fin: string | null;
  empleado_id: number | null;
  dest_direccion: string | null;
  dest_num: string | null;
  dest_piso: string | null;
  dest_letra: string | null;
  dest_cod_postal: string | null;
  dest_poblacion: string | null;
  dest_provincia: string | null;
  dest_ascensor: boolean;
  dest_acceso_furgo: boolean;
  dest_acceso_camion: boolean;
  dest_nombre: string | null;
  dest_tel: string | null;
  dest_observaciones: string | null;
  total_materiales: number;
  total_serv_propio: number;
  total_serv_ext: number;
  total: number;
  incidencias: boolean;
  materiales: MaterialInput[];
  incidencias_lista: IncidenciaInput[];
}

/**
 * Guarda (crea o edita) un servicio completo junto con sus materiales e incidencias
 */
export async function guardarServicio(data: ServicioInput) {
  const supabase = await createClient();

  try {
    const isEdit = !!data.id;
    
    // Preparar objeto cabecera
    const cabecera: any = {
      codigo_servicio: data.codigo_servicio,
      codigo_barras: data.codigo_barras,
      cliente_id: data.cliente_id,
      nombre_cliente: data.nombre_cliente,
      tienda_id: data.tienda_id,
      tipo_servicio_id: data.tipo_servicio_id,
      estado_id: data.estado_id,
      tipo_documento_id: data.tipo_documento_id,
      num_documento: data.num_documento,
      ubicacion: data.ubicacion,
      fecha_entrega: data.fecha_entrega || null,
      fecha_prevista: data.fecha_prevista || null,
      fecha_inicio: data.fecha_inicio || null,
      fecha_fin: data.fecha_fin || null,
      hora_entrega_ini: data.hora_entrega_ini || null,
      hora_entrega_fin: data.hora_entrega_fin || null,
      empleado_id: data.empleado_id,
      dest_direccion: data.dest_direccion,
      dest_num: data.dest_num,
      dest_piso: data.dest_piso,
      dest_letra: data.dest_letra,
      dest_cod_postal: data.dest_cod_postal,
      dest_poblacion: data.dest_poblacion,
      dest_provincia: data.dest_provincia,
      dest_ascensor: data.dest_ascensor,
      dest_acceso_furgo: data.dest_acceso_furgo,
      dest_acceso_camion: data.dest_acceso_camion,
      dest_nombre: data.dest_nombre,
      dest_tel: data.dest_tel,
      dest_observaciones: data.dest_observaciones,
      total_materiales: data.total_materiales,
      total_serv_propio: data.total_serv_propio,
      total_serv_ext: data.total_serv_ext,
      total: data.total,
      incidencias: data.incidencias_lista.some(inc => !inc.solucionada),
      actualizado_en: new Date().toISOString()
    };

    let servicioId = data.id;

    if (isEdit) {
      // Actualizar cabecera
      const { error: errorCabecera } = await supabase
        .from('servicios')
        .update(cabecera)
        .eq('id', data.id);

      if (errorCabecera) throw errorCabecera;
    } else {
      // Insertar nueva cabecera
      const { data: nuevoServicio, error: errorCabecera } = await supabase
        .from('servicios')
        .insert(cabecera)
        .select('id')
        .single();

      if (errorCabecera) throw errorCabecera;
      servicioId = nuevoServicio.id;
    }

    if (!servicioId) throw new Error("No se pudo obtener el ID del servicio.");

    // --- GUARDAR MATERIALES ---
    // En edición, lo más seguro es vaciar los materiales anteriores e insertar la lista actualizada
    if (isEdit) {
      const { error: deleteError } = await supabase
        .from('servicios_materiales')
        .delete()
        .eq('servicio_id', servicioId);
      if (deleteError) throw deleteError;
    }

    if (data.materiales && data.materiales.length > 0) {
      const materialesInsert = data.materiales.map(m => ({
        servicio_id: servicioId,
        codigo: m.codigo,
        descripcion: m.descripcion,
        precio: m.precio,
        cantidad: m.cantidad
      }));

      const { error: insertError } = await supabase
        .from('servicios_materiales')
        .insert(materialesInsert);
      if (insertError) throw insertError;
    }

    // --- GUARDAR INCIDENCIAS ---
    if (isEdit) {
      const { error: deleteIncError } = await supabase
        .from('servicios_incidencias')
        .delete()
        .eq('servicio_id', servicioId);
      if (deleteIncError) throw deleteIncError;
    }

    if (data.incidencias_lista && data.incidencias_lista.length > 0) {
      const incidenciasInsert = data.incidencias_lista.map(i => ({
        servicio_id: servicioId,
        descripcion: i.descripcion,
        solucionada: i.solucionada,
        solucion: i.solucion || null
      }));

      const { error: insertIncError } = await supabase
        .from('servicios_incidencias')
        .insert(incidenciasInsert);
      if (insertIncError) throw insertIncError;
    }

    // Revalidar caché de la aplicación para refrescar los datos
    revalidatePath('/planning');
    revalidatePath('/agenda');
    revalidatePath('/');
    
    return { success: true, id: servicioId };

  } catch (error: any) {
    console.error("Error al guardar el servicio:", error);
    return { error: error.message || "Error al procesar la solicitud." };
  }
}

/**
 * Elimina un servicio por completo
 */
export async function eliminarServicio(id: number) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('servicios')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/planning');
    revalidatePath('/agenda');
    revalidatePath('/');

    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar el servicio:", error);
    return { error: error.message || "Error al eliminar el registro." };
  }
}

/**
 * Busca clientes de la base de datos (caché del CRM) para autocompletar
 */
export async function buscarClientesCRM(query: string) {
  const supabase = await createClient();

  if (!query || query.trim().length < 2) return [];

  try {
    const { data, error } = await supabase
      .from('clientes_crm_cache')
      .select('*')
      .or(`nombre.ilike.%${query}%,codigo_cliente.eq.${isNaN(Number(query)) ? -1 : Number(query)},cif.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error al buscar clientes:", error);
    return [];
  }
}

/**
 * Genera el siguiente correlativo para el código de servicio
 * Formato: YY-TiendaId-Correlativo (ej. 26-2-07053)
 */
export async function obtenerSiguienteCodigoServicio(tiendaId: number) {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear().toString().substring(2); // "26"

  try {
    // Buscar el contador máximo existente para el año y la tienda actuales
    const prefix = `${currentYear}-${tiendaId}-`;
    const { data, error } = await supabase
      .from('servicios')
      .select('codigo_servicio')
      .like('codigo_servicio', `${prefix}%`)
      .order('codigo_servicio', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (data && data.length > 0) {
      const parts = data[0].codigo_servicio.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1;
        }
      }
    }

    // Rellenar con ceros a la izquierda (5 dígitos)
    const formattedSeq = nextNumber.toString().padStart(5, '0');
    return `${currentYear}-${tiendaId}-${formattedSeq}`;
  } catch (error) {
    console.error("Error al calcular el código del servicio:", error);
    return `${currentYear}-${tiendaId}-00001`;
  }
}
