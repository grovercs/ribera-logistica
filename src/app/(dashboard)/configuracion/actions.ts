'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    // Buscar si existe un perfil con este email para asociar perfil_id
    let perfilId = null;
    if (data.email) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('id')
        .eq('email', data.email.trim().toLowerCase())
        .maybeSingle();
      if (perfil) {
        perfilId = perfil.id;
      }
    }

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
      tarifa_hora: data.tarifa_hora,
      perfil_id: perfilId
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

/**
 * Crea una cuenta de usuario en Supabase Auth y la vincula con la ficha de empleado
 */
export async function crearAccesoUsuario(empleadoId: number, email: string, contrasena: string, nombreEmpleado: string) {
  const adminClient = createAdminClient();

  if (!email || email.trim() === '') {
    return { error: 'El email es obligatorio para crear una cuenta de acceso.' };
  }
  if (!contrasena || contrasena.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    console.log(`Intentando crear usuario en Supabase Auth: ${email}`);
    
    // 1. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: contrasena,
      email_confirm: true, // Confirmado automáticamente
      user_metadata: { 
        nombre: nombreEmpleado,
        rol: 'Instalador' // Por defecto rol de colaborador/operario
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData?.user) {
      throw new Error('No se pudo crear el objeto de usuario en Supabase Auth.');
    }

    console.log(`Usuario creado en Auth con ID: ${authData.user.id}. Vinculando con empleado ID: ${empleadoId}`);

    // 2. Asociar el perfil_id al empleado
    const { error: dbError } = await adminClient
      .from('empleados')
      .update({ perfil_id: authData.user.id })
      .eq('id', empleadoId);

    if (dbError) {
      throw dbError;
    }

    revalidatePath('/configuracion');
    revalidatePath('/planning');
    revalidatePath('/agenda');
    revalidatePath('/servicios');

    return { success: true };
  } catch (error: any) {
    console.error("Error al crear cuenta de acceso:", error);
    return { error: error.message || 'Error al crear la cuenta de acceso.' };
  }
}
