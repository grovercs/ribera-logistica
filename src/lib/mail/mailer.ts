import nodemailer from 'nodemailer';
import { createClient } from '@/lib/supabase/server';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  servicioId: number;
}

/**
 * Crea el transportador SMTP de nodemailer basándose en variables de entorno.
 * Si no están configuradas, utiliza una cuenta mock de Ethereal para desarrollo y evitar fallos.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true'; // true para puerto 465, false para 587
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("SMTP no configurado en variables de entorno. Usando transportador mock para desarrollo.");
    // Devolver un transportador mock que siempre simula éxito
    return {
      sendMail: async (mailOptions: any) => {
        console.log("---- ENVIANDO EMAIL MOCK ----");
        console.log(`De: ${mailOptions.from}`);
        console.log(`Para: ${mailOptions.to}`);
        console.log(`Asunto: ${mailOptions.subject}`);
        console.log(`Cuerpo: (HTML de ${mailOptions.html.length} bytes)`);
        console.log("------------------------------");
        return { messageId: 'mock-id-12345' };
      }
    };
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    tls: {
      // Evitar fallos de certificados autofirmados
      rejectUnauthorized: false
    }
  });
}

/**
 * Helper para realizar el envío de correo SMTP y registrar la transacción en Supabase
 */
export async function enviarEmail({ to, subject, html, servicioId }: EmailPayload) {
  const supabase = await createClient();
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || `"Ribera Logística" <correo@ribera.com>`;

  let estado = 'Enviado';
  let errorLog: string | null = null;

  try {
    // Intentar el envío SMTP
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
    // Registrar el envío del correo en Supabase
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
    error: errorLog
  };
}
