'use server';

import { createClient } from '@/lib/supabase/server';
import { enviarEmail } from '@/lib/mail/mailer';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import fs from 'fs';
import path from 'path';

/**
 * Detecta la URL pública de la aplicación.
 * Prioridad: variable de entorno NEXT_PUBLIC_APP_URL > cabeceras de la petición > localhost.
 */
async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  try {
    const h = await headers();
    const host = h.get('host') || h.get('x-forwarded-host') || 'localhost:3000';
    const proto = h.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

/**
 * Lee el logo corporativo y lo devuelve como data URI en base64.
 * Si no se puede leer, devuelve null para que se use la URL pública.
 */
function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-ribera.png');
    if (!fs.existsSync(logoPath)) return null;
    const buffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('No se pudo leer el logo corporativo para el email:', err);
    return null;
  }
}

/**
 * Escapa caracteres especiales para evitar inyección de HTML.
 */
function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Carga un servicio y genera el HTML de la orden de servicio con la
 * imagen corporativa de BigMat Ribera. Es compartido por el envío y
 * la previsualización.
 */
async function generarHtmlOrdenServicio(servicioId: number) {
  const appUrl = getAppUrl();
  const supabase = await createClient();

  // 1. Cargar datos del servicio y sus materiales
  const { data: s, error: servError } = await supabase
    .from('servicios')
    .select(`
      *,
      tiendas(nombre),
      estados(nombre),
      empleados(nombre, telefono),
      tipos_servicios(nombre, color),
      tipos_documentos(nombre)
    `)
    .eq('id', servicioId)
    .single();

  if (servError || !s) throw new Error(servError?.message || 'No se encontró el servicio.');

  const { data: materiales } = await supabase
    .from('servicios_materiales')
    .select('*')
    .eq('servicio_id', servicioId)
    .order('id', { ascending: true });

  // 2. Formatear datos
  const fechaStr = s.fecha_entrega
    ? new Date(s.fecha_entrega).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '--';
  const horaIniStr = s.hora_entrega_ini ? s.hora_entrega_ini.substring(0, 5) : '--';
  const horaFinStr = s.hora_entrega_fin ? s.hora_entrega_fin.substring(0, 5) : '--';
  const urlAlbaran = `${appUrl}/servicios/${s.id}/print`;

  // Campos de texto escapados para el email
  const codigoServicio = escapeHtml(s.codigo_servicio);
  const nombreCliente = escapeHtml(s.nombre_cliente);
  const tipoServicio = escapeHtml(s.tipos_servicios?.nombre || 'General');
  const tipoDocumento = escapeHtml(s.tipos_documentos?.nombre || '--');
  const numDocumento = escapeHtml(s.num_documento || '');
  const estado = escapeHtml(s.estados?.nombre || 'Pendiente');

  const destDireccion = escapeHtml(s.dest_direccion || '--');
  const destNum = escapeHtml(s.dest_num || '');
  const destPiso = escapeHtml(s.dest_piso || '');
  const destLetra = escapeHtml(s.dest_letra || '');
  const destCP = escapeHtml(s.dest_cod_postal || '');
  const destPoblacion = escapeHtml(s.dest_poblacion || '');
  const destProvincia = escapeHtml(s.dest_provincia || '');
  const destNombre = escapeHtml(s.dest_nombre || '');
  const destTel = escapeHtml(s.dest_tel || '');
  const destObservaciones = escapeHtml(s.dest_observaciones || '').replace(/\n/g, '<br>');

  const empleadoNombre = s.empleados ? escapeHtml(s.empleados.nombre) : null;
  const empleadoTelefono = s.empleados ? escapeHtml(s.empleados.telefono || '') : '';

  const materialesRows = (materiales || []).length
    ? (materiales || []).map(m => {
        const matCodigo = escapeHtml(m.codigo || '--');
        const matDescripcion = escapeHtml(m.descripcion || '');
        const matCantidad = Number(m.cantidad).toFixed(2);
        const matPrecio = Number(m.precio).toFixed(2);
        const matTotal = (Number(m.precio) * Number(m.cantidad)).toFixed(2);
        return `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a;">${matCodigo}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; font-weight: 600;">${matDescripcion}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; text-align: right;">${matCantidad}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; text-align: right;">${matPrecio} €</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; text-align: right; font-weight: 700;">${matTotal} €</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="5" style="padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; font-style: italic;">No se han registrado materiales en esta orden.</td></tr>`;

  // Logo corporativo embebido en base64 para que funcione offline y en emails.
  const logoSrc = getLogoBase64() || `${appUrl}/logo-ribera.png`;

  // 3. Crear cuerpo HTML con cabecera y pie BigMat Ribera
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #334155;
          background-color: #f1f5f9;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 640px;
          background-color: #ffffff;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
          background-color: #003366;
          color: #ffffff;
          padding: 24px 30px;
          text-align: left;
        }
        .header .logo-img {
          max-width: 220px;
          max-height: 56px;
          width: auto;
          height: auto;
          display: block;
          margin-bottom: 10px;
        }
        .header .brand {
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .header .brand span {
          color: #E30613;
        }
        .header .subbrand {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 6px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header .doc-type {
          font-size: 11px;
          color: #cbd5e1;
          margin-top: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content {
          padding: 30px;
        }
        h2 {
          font-size: 17px;
          color: #003366;
          margin-top: 0;
          margin-bottom: 18px;
          font-weight: 800;
        }
        .intro {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 22px;
          color: #475569;
        }
        .section {
          margin-bottom: 22px;
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 18px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }
        .row:last-child {
          margin-bottom: 0;
        }
        .label {
          font-weight: 700;
          color: #64748b;
          width: 150px;
          text-transform: uppercase;
          font-size: 10px;
          flex-shrink: 0;
        }
        .value {
          flex: 1;
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }
        table.materials {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
        }
        table.materials th {
          background-color: #003366;
          color: #ffffff;
          padding: 10px 12px;
          text-align: left;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
        }
        table.materials td {
          border-bottom: 1px solid #e2e8f0;
        }
        .totals {
          margin-top: 18px;
          border-top: 2px solid #e2e8f0;
          padding-top: 14px;
        }
        .totals .row {
          font-size: 13px;
        }
        .totals .grand-total {
          font-size: 15px;
          color: #003366;
          font-weight: 900;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed #cbd5e1;
        }
        .btn-container {
          text-align: center;
          margin: 28px 0 8px 0;
        }
        .btn {
          background-color: #003366;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 24px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 8px;
          display: inline-block;
        }
        .btn:hover {
          background-color: #002244;
        }
        .footer {
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #475569;
        }
        .footer .company {
          font-size: 14px;
          font-weight: 800;
          color: #003366;
          margin-bottom: 6px;
        }
        .footer .company span {
          color: #E30613;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoSrc}" alt="BigMat Ribera" class="logo-img" />
          <div class="subbrand">Logística y Servicios de Entrega</div>
          <div class="doc-type">Orden de Servicio · ${codigoServicio}</div>
        </div>
        <div class="content">
          <h2>Estimado/a colaborador,</h2>
          <p class="intro">
            Le remitimos la orden de servicio para su gestión. A continuación encontrará toda la información necesaria:
          </p>

          <div class="section">
            <div class="row">
              <div class="label">Código de Servicio:</div>
              <div class="value">${codigoServicio}</div>
            </div>
            <div class="row">
              <div class="label">Cliente:</div>
              <div class="value">${nombreCliente}</div>
            </div>
            <div class="row">
              <div class="label">Tipo de Servicio:</div>
              <div class="value">${tipoServicio}</div>
            </div>
            <div class="row">
              <div class="label">Documento:</div>
              <div class="value">${tipoDocumento} ${numDocumento}</div>
            </div>
            <div class="row">
              <div class="label">Fecha de Entrega:</div>
              <div class="value">${fechaStr}</div>
            </div>
            <div class="row">
              <div class="label">Horario:</div>
              <div class="value">${horaIniStr} - ${horaFinStr} h</div>
            </div>
            <div class="row">
              <div class="label">Estado:</div>
              <div class="value">${estado}</div>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <div class="label">Dirección de Entrega:</div>
              <div class="value">
                ${destDireccion} ${destNum}<br>
                ${destPiso} ${destLetra}<br>
                ${destCP} ${destPoblacion} (${destProvincia})
              </div>
            </div>
            ${destNombre ? `
            <div class="row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <div class="label">Persona de Contacto:</div>
              <div class="value">${destNombre} ${destTel ? `· ${destTel}` : ''}</div>
            </div>
            ` : ''}
            ${destObservaciones ? `
            <div class="row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
              <div class="label">Observaciones:</div>
              <div class="value">${destObservaciones}</div>
            </div>
            ` : ''}
          </div>

          ${empleadoNombre ? `
          <div class="section">
            <div class="row">
              <div class="label">Técnico Asignado:</div>
              <div class="value">${empleadoNombre} ${empleadoTelefono ? `(${empleadoTelefono})` : ''}</div>
            </div>
          </div>
          ` : ''}

          <h2>Materiales / Artículos</h2>
          <table class="materials">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th style="text-align: right;">Cant.</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${materialesRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <div class="label">Materiales:</div>
              <div class="value">${Number(s.total_materiales || 0).toFixed(2)} €</div>
            </div>
            <div class="row">
              <div class="label">Servicios propios:</div>
              <div class="value">${Number(s.total_serv_propio || 0).toFixed(2)} €</div>
            </div>
            <div class="row">
              <div class="label">Servicios externos:</div>
              <div class="value">${Number(s.total_serv_ext || 0).toFixed(2)} €</div>
            </div>
            <div class="row grand-total">
              <div class="label">Total Orden:</div>
              <div class="value">${Number(s.total || 0).toFixed(2)} €</div>
            </div>
          </div>

          <div class="btn-container">
            <a href="${urlAlbaran}" target="_blank" class="btn">Ver Albarán Web</a>
          </div>
        </div>
        <div class="footer">
          <div class="company">BigMat<span> Ribera</span></div>
          <p style="margin: 4px 0;">Ctra Francia 42 · 25530 Vielha (Lleida)</p>
          <p style="margin: 4px 0;">T. 973 64 14 60 · WhatsApp 618 88 63 88 · Exposición 660 50 33 53</p>
          <p style="margin: 4px 0;">pedidos@riberahogar.com · www.riberahogar.com</p>
          <p style="margin-top: 12px; font-size: 10px; color: #94a3b8;">
            © ${new Date().getFullYear()} BigMat Ribera. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `BigMat Ribera - Orden de Servicio ${s.codigo_servicio}`;

  return { htmlBody, subject, s };
}

/**
 * Server Action que carga un servicio, genera su plantilla HTML y lo envía por email
 */
export async function enviarCorreoServicio(servicioId: number, emailDestinatario: string) {
  if (!emailDestinatario || !emailDestinatario.includes('@')) {
    return { success: false, error: 'Dirección de correo no válida.' };
  }

  try {
    const { htmlBody, subject, s } = await generarHtmlOrdenServicio(servicioId);

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

/**
 * Server Action que devuelve el HTML y el asunto del correo de orden de servicio
 * sin enviarlo, para que el usuario pueda previsualizarlo en el cliente.
 */
export async function previsualizarCorreoServicio(servicioId: number) {
  try {
    const { htmlBody, subject } = await generarHtmlOrdenServicio(servicioId);
    return { success: true, html: htmlBody, subject };
  } catch (error: any) {
    console.error("Error al generar vista previa del correo:", error);
    return { success: false, error: error.message || 'Error al generar la vista previa.' };
  }
}

/**
 * Server Action que envía un email avisando de una incidencia en un servicio
 */
export async function enviarCorreoIncidencia(servicioId: number, emailDestinatario: string, descripcionIncidencia: string) {
  const supabase = await createClient();

  if (!emailDestinatario || !emailDestinatario.includes('@')) {
    return { success: false, error: 'Dirección de correo no válida.' };
  }

  if (!descripcionIncidencia || descripcionIncidencia.trim().length === 0) {
    return { success: false, error: 'La descripción de la incidencia no puede estar vacía.' };
  }

  try {
    const appUrl = getAppUrl();

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

    const fechaStr = s.fecha_entrega
      ? new Date(s.fecha_entrega).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '--';
    const urlAlbaran = `${appUrl}/servicios/${s.id}/print`;

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
            background-color: #dc2626;
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
          .header p {
            margin: 0;
            font-size: 13px;
            color: #fee2e2;
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
          .alert-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
          }
          .alert-box p {
            margin: 0;
            color: #991b1b;
            font-size: 14px;
            line-height: 1.6;
            font-weight: 600;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0 10px 0;
          }
          .btn {
            background-color: #003366;
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
            <p>Aviso de Incidencia en Servicio</p>
          </div>
          <div class="content">
            <h2>Estimado/a cliente,</h2>
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
              Le informamos que se ha detectado una incidencia en su servicio. A continuación, detallamos la información:
            </p>

            <div class="alert-box">
              <p>${escapeHtml(descripcionIncidencia).replace(/\n/g, '<br>')}</p>
            </div>

            <div class="grid">
              <div class="row">
                <div class="label">Cód. Servicio:</div>
                <div class="value">${escapeHtml(s.codigo_servicio)}</div>
              </div>
              <div class="row">
                <div class="label">Cliente:</div>
                <div class="value">${escapeHtml(s.nombre_cliente)}</div>
              </div>
              <div class="row">
                <div class="label">Fecha Programada:</div>
                <div class="value">${fechaStr}</div>
              </div>
              <div class="row">
                <div class="label">Destino:</div>
                <div class="value">
                  ${escapeHtml(s.dest_direccion || '--')} ${escapeHtml(s.dest_num || '')}<br>
                  ${escapeHtml(s.dest_cod_postal || '')} ${escapeHtml(s.dest_poblacion || '')} (${escapeHtml(s.dest_provincia || '')})
                </div>
              </div>
              ${s.empleados ? `
              <div class="row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                <div class="label">Técnico Asignado:</div>
                <div class="value">${escapeHtml(s.empleados.nombre)} ${s.empleados.telefono ? `(${escapeHtml(s.empleados.telefono)})` : ''}</div>
              </div>
              ` : ''}
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #64748b; font-style: italic;">
              * Nos pondremos en contacto con usted para resolver la situación lo antes posible.
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

    const subject = `Logística Ribera - Incidencia en Servicio ${s.codigo_servicio}`;

    const mailRes = await enviarEmail({
      to: emailDestinatario,
      subject,
      html: htmlBody,
      servicioId: s.id
    });

    revalidatePath('/correos');
    return mailRes;

  } catch (error: any) {
    console.error("Error al procesar envío de correo de incidencia:", error);
    return { success: false, error: error.message || 'Error al procesar la solicitud.' };
  }
}
