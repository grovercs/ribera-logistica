import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  servicioId: number;
}

interface SmtpConfig {
  remitente_email: string;
  remitente_nombre?: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
}

/**
 * Carga la configuración SMTP guardada en Supabase.
 * Si no existe, devuelve null.
 */
async function obtenerConfiguracionSmtp(): Promise<SmtpConfig | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('configuracion_correo')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      remitente_email: data.remitente_email,
      remitente_nombre: data.remitente_nombre,
      smtp_host: data.smtp_host,
      smtp_port: data.smtp_port,
      smtp_secure: data.smtp_secure,
      smtp_user: data.smtp_user,
      smtp_pass: data.smtp_pass
    };
  } catch (err) {
    console.error("Error al cargar configuración SMTP de Supabase:", err);
    return null;
  }
}

/**
 * Crea el transportador SMTP de nodemailer.
 * Prioriza la configuración guardada en Supabase; si no hay, usa variables de entorno.
 * Si tampoco hay variables de entorno, utiliza una cuenta mock de Ethereal para desarrollo.
 */
async function getTransporter() {
  const dbConfig = await obtenerConfiguracionSmtp();

  if (dbConfig) {
    return {
      config: dbConfig,
      transporter: nodemailer.createTransport({
        host: dbConfig.smtp_host,
        port: dbConfig.smtp_port,
        secure: dbConfig.smtp_secure,
        auth: {
          user: dbConfig.smtp_user,
          pass: dbConfig.smtp_pass
        },
        tls: {
          rejectUnauthorized: false
        }
      })
    };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("SMTP no configurado en variables de entorno. Usando transportador mock para desarrollo.");
    return {
      config: null,
      transporter: {
        sendMail: async (mailOptions: any) => {
          console.log("---- ENVIANDO EMAIL MOCK ----");
          console.log(`De: ${mailOptions.from}`);
          console.log(`Para: ${mailOptions.to}`);
          console.log(`Asunto: ${mailOptions.subject}`);
          console.log(`Cuerpo: (HTML de ${mailOptions.html.length} bytes)`);
          console.log("------------------------------");
          return { messageId: 'mock-id-12345' };
        },
        verify: async () => true
      } as any
    };
  }

  return {
    config: {
      remitente_email: process.env.SMTP_FROM?.match(/<(.+)>/)?.[1] || user,
      remitente_nombre: process.env.SMTP_FROM?.match(/^"?([^"<]+)"?/)?.[1] || null,
      smtp_host: host,
      smtp_port: port,
      smtp_secure: secure,
      smtp_user: user,
      smtp_pass: pass
    },
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    })
  };
}

/**
 * Helper para realizar el envío de correo SMTP y registrar la transacción en Supabase
 */
export async function enviarEmail({ to, subject, html, servicioId }: EmailPayload) {
  const supabase = await createClient();
  const { config, transporter } = await getTransporter();

  const from = config
    ? (config.remitente_nombre?.trim()
        ? `"${config.remitente_nombre.trim()}" <${config.remitente_email}>`
        : config.remitente_email)
    : (process.env.SMTP_FROM || `"Ribera Logística" <correo@ribera.com>`);

  let estado = 'Enviado';
  let errorLog: string | null = null;

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
    console.log(`✓ Email enviado con éxito a ${to}`);
  } catch (error: any) {
    console.error(`Error en el envío SMTP a ${to}:`, error);
    estado = 'Fallido';
    errorLog = error.message || 'Error desconocido de conexión SMTP';
  }

  try {
    const { error: dbError } = await supabase
      .from('servicios_correos')
      .insert({
        servicio_id: servicioId,
        destinatario: to,
        asunto: subject,
        cuerpo: html,
        estado: estado,
        error_log: errorLog,
        fecha: new Date().toISOString()
      });

    if (dbError) throw dbError;
  } catch (dbError) {
    console.error("Error al guardar registro de correo en Supabase:", dbError);
  }

  return {
    success: estado === 'Enviado',
    error: errorLog,
    remitente: from,
    servidor: config ? `${config.smtp_host}:${config.smtp_port}` : (process.env.SMTP_HOST || 'mock')
  };
}
