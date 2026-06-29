'use server';

import { createClient } from '@/lib/supabase/server';
import { enviarEmail } from '@/lib/mail/mailer';
import { revalidatePath } from 'next/cache';

/**
 * Server Action que carga un servicio, genera su plantilla HTML y lo envía por email
 */
export async function enviarCorreoServicio(servicioId: number, emailDestinatario: string) {
  const supabase = await createClient();

  if (!emailDestinatario || !emailDestinatario.includes('@')) {
    return { success: false, error: 'Dirección de correo no válida.' };
  }

  try {
    // 1. Cargar datos del servicio
    const { data: s, error: servError } = await supabase
      .from('servicios')
      .select(`
        *,
        tiendas(nombre),
        estados(nombre),
        empleados(nombre, telefono),
        tipos_servicios(nombre, color)
      `)
      .eq('id', servicioId)
      .single();

    if (servError || !s) throw new Error(servError?.message || 'No se encontró el servicio.');

    // 2. Formatear datos de forma amigable
    const fechaStr = s.fecha_entrega 
      ? new Date(s.fecha_entrega).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '--';
    const horaIniStr = s.hora_entrega_ini ? s.hora_entrega_ini.substring(0, 5) : '--';
    const horaFinStr = s.hora_entrega_fin ? s.hora_entrega_fin.substring(0, 5) : '--';
    const urlAlbaran = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/servicios/${s.id}/print`;

    // 3. Crear cuerpo HTML corporativo premium
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #334155;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header {
            background-color: #0f172a;
            color: #ffffff;
            padding: 30px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 5px;
          }
          .logo span {
            color: #3b82f6;
          }
          .header p {
            margin: 0;
            font-size: 13px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .content {
            padding: 30px;
          }
          h2 {
            font-size: 18px;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 20px;
            font-weight: 700;
          }
          .grid {
            margin-bottom: 25px;
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 20px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 13px;
          }
          .row:last-child {
            margin-bottom: 0;
          }
          .label {
            font-weight: 700;
            color: #64748b;
            width: 140px;
            text-transform: uppercase;
            font-size: 11px;
          }
          .value {
            flex: 1;
            color: #0f172a;
            font-weight: 600;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0 10px 0;
          }
          .btn {
            background-color: #3b82f6;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 8px;
            display: inline-block;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
          }
          .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 20px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Ribera<span>Logística</span></div>
            <p>Aviso de Entrega de Servicio</p>
          </div>
          <div class="content">
            <h2>Estimado/a cliente,</h2>
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
              Le informamos que se ha programado y asignado una orden de entrega para su servicio. A continuación, detallamos la información del envío:
            </p>

            <div class="grid">
              <div class="row">
                <div class="label">Cód. Servicio:</div>
                <div class="value">${s.codigo_servicio}</div>
              </div>
              <div class="row">
                <div class="label">Cliente:</div>
                <div class="value">${s.nombre_cliente}</div>
              </div>
              <div class="row">
                <div class="label">Fecha Programada:</div>
                <div class="value">${fechaStr}</div>
              </div>
              <div class="row">
                <div class="label">Horario Estimado:</div>
                <div class="value">${horaIniStr} - ${horaFinStr} h</div>
              </div>
              <div class="row">
                <div class="label">Destino:</div>
                <div class="value">
                  ${s.dest_direccion || '--'} ${s.dest_num || ''}<br>
                  ${s.dest_cod_postal || ''} ${s.dest_poblacion || ''} (${s.dest_provincia || ''})
                </div>
              </div>
              ${s.empleados ? `
              <div class="row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                <div class="label">Técnico Asignado:</div>
                <div class="value">${s.empleados.nombre} ${s.empleados.telefono ? `(${s.empleados.telefono})` : ''}</div>
              </div>
              ` : ''}
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #64748b; font-style: italic;">
              * Asegúrese de que haya alguien disponible en la dirección indicada en la franja horaria establecida.
            </p>

            <div class="btn-container">
              <a href="${urlAlbaran}" target="_blank" class="btn">Visualizar Albarán Web</a>
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Ribera Logística S.L. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    const subject = `Logística Ribera - Entrega Programada de Servicio ${s.codigo_servicio}`;

    // 4. Enviar Correo SMTP
    const mailRes = await enviarEmail({
      to: emailDestinatario,
      subject,
      html: htmlBody,
      servicioId: s.id
    });

    revalidatePath('/correos');
    return mailRes;

  } catch (error: any) {
    console.error("Error al procesar envío de correo del servicio:", error);
    return { success: false, error: error.message || 'Error al procesar la solicitud.' };
  }
}
