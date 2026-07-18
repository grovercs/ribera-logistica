'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface EmpleadoInput {
  id?: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
  tipo: string;
  razon_social: string | null;
  cif_nif: string | null;
  direccion_fiscal: string | null;
  tecnico_autorizado: string | null;
  email: string | null;
  iban: string | null;
  tarifa_hora: number;
}

/**
 * Inserta o actualiza un técnico (empleado) en Supabase
 */
export async function guardarEmpleado(data: EmpleadoInput) {
  const supabase = await createClient();

  if (!data.nombre || data.nombre.trim() === '') {
    return { error: 'El nombre del técnico es obligatorio.' };
  }

  try {
    const payload = {
      nombre: data.nombre.trim(),
      telefono: data.telefono ? data.telefono.trim() : null,
      activo: data.activo,
      tipo: data.tipo,
      razon_social: data.razon_social ? data.razon_social.trim() : null,
      cif_nif: data.cif_nif ? data.cif_nif.trim() : null,
      direccion_fiscal: data.direccion_fiscal ? data.direccion_fiscal.trim() : null,
      tecnico_autorizado: data.tecnico_autorizado ? data.tecnico_autorizado.trim() : null,
      email: data.email ? data.email.trim() : null,
      iban: data.iban ? data.iban.trim() : null,
      tarifa_hora: data.tarifa_hora
    };

    if (data.id) {
      // Editar
      const { error } = await supabase
        .from('empleados')
        .update(payload)
        .eq('id', data.id);

      if (error) throw error;
    } else {
      // Crear
      const { error } = await supabase
        .from('empleados')
        .insert(payload);

      if (error) throw error;
    }

    revalidatePath('/configuracion');
    revalidatePath('/planning');
    revalidatePath('/agenda');
    revalidatePath('/servicios');

    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar empleado:", error);
    return { error: error.message || 'Error al procesar la solicitud.' };
  }
}

/**
 * Activa o desactiva un técnico
 */
export async function toggleEmpleadoActivo(id: number, activoActual: boolean) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('empleados')
      .update({ activo: !activoActual })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/configuracion');
    revalidatePath('/planning');
    revalidatePath('/agenda');
    revalidatePath('/servicios');

    return { success: true };
  } catch (error: any) {
    console.error("Error al cambiar estado de empleado:", error);
    return { error: error.message || 'Error al cambiar estado.' };
  }
}
