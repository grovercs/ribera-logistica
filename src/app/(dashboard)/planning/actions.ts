'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCrmDbConnection } from '@/lib/crm-db';

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
 * Busca clientes directamente en la base de datos de SQL Server del CRM Integral en vivo
 */
export async function buscarClientesCRM(query: string) {
  if (!query || query.trim().length < 2) return [];

  try {
    const pool = await getCrmDbConnection();
    
    // Preparar el parámetro de búsqueda
    const likeQuery = `%${query.trim()}%`;
    const numQuery = isNaN(Number(query.trim())) ? -1 : Number(query.trim());

    const request = pool.request();
    request.input('likeQuery', likeQuery);
    request.input('numQuery', numQuery);

    const result = await request.query(`
      SELECT TOP 10 cod_cliente, nombre_comercial, cif, direccion1, poblacion, telefono, e_mail
      FROM clientes
      WHERE nombre_comercial LIKE @likeQuery
         OR cod_cliente = @numQuery
         OR cif LIKE @likeQuery
      ORDER BY nombre_comercial
    `);

    // Mapear los datos de SQL Server al formato que espera el frontend
    return result.recordset.map(row => ({
      codigo_cliente: row.cod_cliente,
      nombre: row.nombre_comercial ? row.nombre_comercial.trim() : '',
      cif: row.cif ? row.cif.trim() : '',
      direccion: row.direccion1 ? row.direccion1.trim() : '',
      poblacion: row.poblacion ? row.poblacion.trim() : '',
      cod_postal: '',
      provincia: '',
      telefono: row.telefono ? row.telefono.trim() : '',
      email: row.e_mail ? row.e_mail.trim() : '',
      nombre_contacto: '',
      telefono_contacto: ''
    }));
  } catch (error) {
    console.error("Error al buscar clientes en SQL Server:", error);
    return [];
  }
}

/**
 * Busca un presupuesto o documento de venta en vivo en SQL Server y devuelve su cabecera y líneas de artículos
 */
export async function buscarPresupuestoCRM(numDocumento: string) {
  if (!numDocumento || numDocumento.trim().length < 2) {
    return { error: "Debes ingresar un número de documento válido." };
  }

  try {
    const pool = await getCrmDbConnection();
    const queryTerm = numDocumento.trim();
    const numQuery = isNaN(Number(queryTerm)) ? -1 : Number(queryTerm);

    const request = pool.request();
    request.input('queryTerm', `%${queryTerm}%`);
    request.input('numQuery', numQuery);

    // Buscar cabecera
    const resCab = await request.query(`
      SELECT TOP 1 cod_venta, tipo_venta, cod_documento, cod_cliente, nombre_comercial, cif, direccion1, cp, poblacion, provincia, telefono, e_mail
      FROM ventas_cabecera
      WHERE cod_venta = @numQuery
         OR cod_documento LIKE @queryTerm
    `);

    if (resCab.recordset.length === 0) {
      return { error: "No se encontró ningún presupuesto o documento con ese número en el Integral." };
    }

    const cab = resCab.recordset[0];

    // Buscar líneas de artículos/materiales
    const reqLines = pool.request();
    reqLines.input('codVenta', cab.cod_venta);
    const resLines = await reqLines.query(`
      SELECT cod_articulo, descripcion, cantidad, precio, importe
      FROM ventas_linea
      WHERE cod_venta = @codVenta
      ORDER BY linea
    `);

    return {
      success: true,
      documento: {
        cod_venta: cab.cod_venta,
        cod_documento: cab.cod_documento ? cab.cod_documento.trim() : '',
        cliente_id: cab.cod_cliente,
        nombre_cliente: cab.nombre_comercial ? cab.nombre_comercial.trim() : '',
        cif: cab.cif ? cab.cif.trim() : '',
        direccion: cab.direccion1 ? cab.direccion1.trim() : '',
        poblacion: cab.poblacion ? cab.poblacion.trim() : '',
        cod_postal: cab.cp ? cab.cp.trim() : '',
        provincia: cab.provincia ? cab.provincia.trim() : '',
        telefono: cab.telefono ? cab.telefono.trim() : '',
        email: cab.e_mail ? cab.e_mail.trim() : ''
      },
      materiales: resLines.recordset.map(l => ({
        codigo: l.cod_articulo ? l.cod_articulo.trim() : '0000',
        descripcion: l.descripcion ? l.descripcion.trim() : '',
        precio: Number(l.precio) || 0,
        cantidad: Number(l.cantidad) || 1
      }))
    };
  } catch (error: any) {
    console.error("Error al buscar presupuesto en SQL Server:", error);
    return { error: error.message || "Error al conectar con el CRM Integral." };
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

/**
 * Obtiene los presupuestos recientes de un cliente en particular desde SQL Server
 */
export async function obtenerPresupuestosClienteCRM(clienteId: number) {
  try {
    const pool = await getCrmDbConnection();
    const request = pool.request();
    request.input('clienteId', clienteId);

    const result = await request.query(`
      SELECT TOP 10 cod_venta, cod_documento, fecha_venta,
             COALESCE(importe_impuestos, importe, 0) AS total
      FROM ventas_cabecera
      WHERE cod_cliente = @clienteId
      ORDER BY fecha_venta DESC, cod_venta DESC
    `);

    return result.recordset.map(row => ({
      cod_venta: row.cod_venta,
      cod_documento: row.cod_documento ? row.cod_documento.trim() : '',
      fecha: row.fecha_venta ? new Date(row.fecha_venta).toLocaleDateString('es-ES') : '',
      total: Number(row.total) || 0
    }));
  } catch (error) {
    console.error("Error al obtener presupuestos del cliente:", error);
    return [];
  }
}
