'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';

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

export interface ConfiguracionCorreoInput {
  remitente_email: string;
  remitente_nombre: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
}

/**
 * Obtiene la configuración SMTP guardada en Supabase.
 */
export async function obtenerConfiguracionCorreo() {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('configuracion_correo')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { success: true, config: data };
  } catch (error: any) {
    console.error("Error al obtener configuración de correo:", error);
    return { success: false, error: error.message || 'Error al cargar la configuración.' };
  }
}

/**
 * Guarda la configuración SMTP en Supabase.
 */
export async function guardarConfiguracionCorreo(config: ConfiguracionCorreoInput) {
  const supabase = await createClient();

  if (!config.remitente_email?.includes('@')) {
    return { success: false, error: 'La dirección de correo del remitente no es válida.' };
  }
  if (!config.smtp_host?.trim()) {
    return { success: false, error: 'El servidor SMTP es obligatorio.' };
  }
  if (!config.smtp_user?.trim()) {
    return { success: false, error: 'El usuario SMTP es obligatorio.' };
  }
  if (!config.smtp_pass?.trim()) {
    return { success: false, error: 'La contraseña SMTP es obligatoria.' };
  }

  const port = Number(config.smtp_port) || 587;

  try {
    // Solo mantenemos un registro de configuración
    const { data: existente } = await supabase
      .from('configuracion_correo')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      remitente_email: config.remitente_email.trim(),
      remitente_nombre: config.remitente_nombre?.trim() || null,
      smtp_host: config.smtp_host.trim(),
      smtp_port: port,
      smtp_secure: !!config.smtp_secure,
      smtp_user: config.smtp_user.trim(),
      smtp_pass: config.smtp_pass,
      actualizado_en: new Date().toISOString()
    };

    if (existente?.id) {
      const { error } = await supabase
        .from('configuracion_correo')
        .update(payload)
        .eq('id', existente.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('configuracion_correo')
        .insert(payload);

      if (error) throw error;
    }

    revalidatePath('/configuracion');
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar configuración de correo:", error);
    return { success: false, error: error.message || 'Error al guardar la configuración.' };
  }
}

/**
 * Prueba la configuración SMTP intentando conectar y enviar un email de prueba.
 */
export async function probarConfiguracionCorreo(config: ConfiguracionCorreoInput, emailPrueba?: string) {
  const destinatario = emailPrueba?.trim() && emailPrueba.includes('@')
    ? emailPrueba.trim()
    : config.remitente_email.trim();

  const transporter = nodemailer.createTransport({
    host: config.smtp_host.trim(),
    port: Number(config.smtp_port) || 587,
    secure: !!config.smtp_secure,
    auth: {
      user: config.smtp_user.trim(),
      pass: config.smtp_pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();

    const remitente = config.remitente_nombre?.trim()
      ? `"${config.remitente_nombre.trim()}" <${config.remitente_email.trim()}>`
      : config.remitente_email.trim();

    await transporter.sendMail({
      from: remitente,
      to: destinatario,
      subject: 'BigMat Ribera - Correo de prueba',
      html: `
        <h2>Configuración de correo correcta</h2>
        <p>Este es un email de prueba enviado desde la configuración de BigMat Ribera.</p>
        <p>Servidor SMTP: <strong>${config.smtp_host}:${config.smtp_port}</strong></p>
        <p>Remitente: <strong>${remitente}</strong></p>
      `
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al probar configuración SMTP:", error);
    return { success: false, error: error.message || 'No se pudo conectar con el servidor SMTP.' };
  }
}
