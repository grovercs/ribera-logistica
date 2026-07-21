import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import PrintTrigger from '@/components/servicios/PrintTrigger';
import PrintButton from '@/components/servicios/PrintButton';

interface PrintPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PrintPage({ params }: PrintPageProps) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const serviceId = Number(resolvedParams.id);

  if (isNaN(serviceId)) return notFound();

  // Cargar datos del servicio completo con materiales e incidencias
  const { data: s, error } = await supabase
    .from('servicios')
    .select(`
      *,
      tiendas(nombre),
      estados(nombre),
      empleados(nombre, telefono),
      tipos_servicios(nombre, color),
      tipos_documentos(nombre),
      servicios_materiales(*)
    `)
    .eq('id', serviceId)
    .single();

  if (error || !s) return notFound();

  const formatFecha = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatHora = (timeStr: string | null) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="bg-white text-slate-900 min-h-screen p-8 max-w-4xl mx-auto font-sans text-xs border border-slate-300 md:my-6 print:m-0 print:border-0 print:p-0">
      
      {/* Estilos CSS Específicos para Impresión */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border-color: black !important;
          }
        }
      ` }} />

      {/* Disparador de Impresión */}
      <PrintTrigger />

      {/* Botón no imprimible superior para imprimir manualmente */}
      <div className="no-print mb-6 p-4 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Vista de Impresión del Albarán</h2>
          <p className="text-[10px] text-slate-500">Puedes imprimir este documento o guardarlo como PDF en tu navegador.</p>
        </div>
        <PrintButton />
      </div>

      {/* Cabecera Albarán (Estructura Delphi) */}
      <div className="border-2 border-slate-900 rounded-xl overflow-hidden flex flex-col mb-4 print-border">
        
        {/* Cabecera Principal */}
        <div className="flex bg-slate-900 text-white border-b-2 border-slate-900 print-border">
          
          {/* Logo / Título */}
          <div className="w-1/3 p-3 flex items-center justify-center border-r-2 border-slate-900 print-border bg-white">
            <img src="/logo-ribera.png" alt="Ribera Logística" className="max-h-12 object-contain" />
          </div>
          
          {/* Código de barras simulado / Nombre del Módulo */}
          <div className="w-2/3 p-4 flex flex-col items-center justify-center">
            <span className="text-sm font-black tracking-widest uppercase">LOGÍSTICA</span>
            <div className="h-6 w-48 bg-slate-800 mt-1 border border-slate-700 relative flex items-center justify-center">
              {/* Código de barras visual */}
              <div className="absolute inset-0 bg-white flex items-center justify-around px-2 py-0.5">
                {[1,3,2,4,2,3,1,4,2,3,1,4,2,3,1,3,2,4,1,2].map((w, idx) => (
                  <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }}></div>
                ))}
              </div>
            </div>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest mt-1">*{s.codigo_servicio}*</span>
          </div>

        </div>

        {/* Datos Identificadores del Servicio */}
        <div className="grid grid-cols-4 divide-x-2 divide-y-2 divide-slate-900 border-slate-900 print-border">
          
          <div className="p-2 space-y-0.5 bg-slate-50">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Código Servicio</span>
            <span className="text-xs font-black text-red-600">{s.codigo_servicio}</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tienda / Almacén</span>
            <span className="text-[10px] font-bold text-slate-800">{s.tiendas?.nombre || 'ALMACEN'}</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Entrega</span>
            <span className="text-[10px] font-bold text-slate-800">{formatFecha(s.fecha_entrega)}</span>
          </div>

          <div className="p-2 space-y-0.5 bg-slate-50">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Cód. Cliente</span>
            <span className="text-[10px] font-bold text-slate-800">{s.cliente_id || '--'}</span>
          </div>

          <div className="p-2 space-y-0.5 col-span-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Nombre del Cliente</span>
            <span className="text-[10px] font-black text-slate-900">{s.nombre_cliente}</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Servicio</span>
            <span className="text-[10px] font-bold text-slate-800">{s.tipos_servicios?.nombre || 'General'}</span>
          </div>

          <div className="p-2 space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tipo Documento</span>
            <span className="text-[10px] font-bold text-slate-800">{s.tipos_documentos?.nombre || 'Presupuesto'} {s.num_documento ? `Nº ${s.num_documento}` : ''}</span>
          </div>

          <div className="p-2 space-y-0.5 col-span-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Ubicación</span>
            <span className="text-[10px] font-bold text-slate-800">{s.ubicacion || '--'}</span>
          </div>

          <div className="p-2 space-y-0.5 col-span-2 bg-slate-50">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Estado de la Orden</span>
            <span className="text-[10px] font-black text-primary-dark uppercase tracking-widest">{s.estados?.nombre || 'PENDIENTE'}</span>
          </div>

        </div>

      </div>

      {/* Grid de Secciones Intermedias */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        
        {/* Sección: Datos Operario */}
        <div className="col-span-2 border-2 border-slate-900 rounded-xl overflow-hidden print-border flex flex-col h-full">
          <div className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-wider print-border">
            DATOS OPERARIO
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Nombre Operario</span>
              <span className="text-[10px] font-bold text-slate-800">{s.empleados?.nombre || 'Sin asignar'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Teléfono Técnico</span>
              <span className="text-[10px] font-bold text-slate-800">{s.empleados?.telefono || '--'}</span>
            </div>
            <div className="col-span-2 space-y-0.5 mt-1 border-t border-slate-100 pt-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Observaciones Operario</span>
              <p className="text-[9px] text-slate-600 italic leading-snug">{s.dest_observaciones || '--'}</p>
            </div>
          </div>
        </div>

        {/* Sección: Entrega / NIF */}
        <div className="border-2 border-slate-900 rounded-xl overflow-hidden print-border flex flex-col h-full">
          <div className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-wider print-border">
            ENTREGA
          </div>
          <div className="p-3 space-y-2 flex-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Fecha</span>
                <span className="text-[10px] font-bold text-slate-800">{formatFecha(s.fecha_entrega)}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase block">Hora</span>
                <span className="text-[10px] font-bold text-slate-800">{formatHora(s.hora_entrega_ini)}</span>
              </div>
            </div>
            <div className="space-y-0.5 border-t border-slate-100 pt-2">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Firma Cliente</span>
              <div className="h-14 border border-dashed border-slate-300 rounded mt-1 bg-slate-50 flex items-center justify-center">
                <span className="text-[8px] text-slate-300 uppercase tracking-widest font-black">Firma física</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sección: Destino */}
      <div className="border-2 border-slate-900 rounded-xl overflow-hidden print-border mb-4 flex flex-col">
        <div className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-wider print-border">
          DESTINO / LOGÍSTICA DE ENTREGA
        </div>
        <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2">
          
          <div className="col-span-2 space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Calle / Dirección</span>
            <span className="text-[10px] font-black text-slate-900">{s.dest_direccion || '--'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Nº</span>
            <span className="text-[10px] font-bold text-slate-800">{s.dest_num || '--'}</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Piso</span>
              <span className="text-[10px] font-bold text-slate-800">{s.dest_piso || '--'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Letra</span>
              <span className="text-[10px] font-bold text-slate-800">{s.dest_letra || '--'}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Código Postal</span>
            <span className="text-[10px] font-bold text-slate-800">{s.dest_cod_postal || '--'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Población</span>
            <span className="text-[10px] font-black text-slate-900">{s.dest_poblacion || '--'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Provincia</span>
            <span className="text-[10px] font-bold text-slate-800">{s.dest_provincia || '--'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Horario de entrega</span>
            <span className="text-[10px] font-bold text-slate-800">{formatHora(s.hora_entrega_ini)} a {formatHora(s.hora_entrega_fin)}</span>
          </div>

          {/* Accesibilidad checks */}
          <div className="col-span-2 space-y-1 border-t border-slate-100 pt-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Accesibilidad</span>
            <div className="flex gap-4 font-bold text-[9px] text-slate-700">
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-slate-400 rounded flex items-center justify-center ${s.dest_ascensor ? 'bg-slate-900 border-slate-900 text-white font-black' : ''}`}>
                  {s.dest_ascensor ? '✓' : ''}
                </div>
                <span>Ascensor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-slate-400 rounded flex items-center justify-center ${s.dest_acceso_furgo ? 'bg-slate-900 border-slate-900 text-white font-black' : ''}`}>
                  {s.dest_acceso_furgo ? '✓' : ''}
                </div>
                <span>Acceso Furgoneta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3.5 h-3.5 border border-slate-400 rounded flex items-center justify-center ${s.dest_acceso_camion ? 'bg-slate-900 border-slate-900 text-white font-black' : ''}`}>
                  {s.dest_acceso_camion ? '✓' : ''}
                </div>
                <span>Acceso Camión</span>
              </div>
            </div>
          </div>

          <div className="space-y-0.5 border-t border-slate-100 pt-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Nombre de Contacto</span>
            <span className="text-[10px] font-bold text-slate-800">{s.dest_nombre || s.nombre_cliente}</span>
          </div>
          <div className="space-y-0.5 border-t border-slate-100 pt-2.5">
            <span className="text-[8px] font-bold text-slate-400 uppercase block">Teléfono Contacto</span>
            <span className="text-[10px] font-bold text-slate-800">{s.dest_tel || '--'}</span>
          </div>

        </div>
      </div>

      {/* Tabla de Materiales */}
      <div className="border-2 border-slate-900 rounded-xl overflow-hidden print-border mb-4">
        <div className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 uppercase tracking-wider print-border">
          MATERIALES Y ARTÍCULOS DE LA ORDEN
        </div>
        <table className="w-full text-left text-[10px] font-semibold">
          <thead className="bg-slate-50 border-b border-slate-900 text-slate-500 font-bold uppercase text-[8px] tracking-wider print-border">
            <tr>
              <th className="px-3 py-2 w-20">Código</th>
              <th className="px-3 py-2">Descripción del Artículo</th>
              <th className="px-3 py-2 w-20 text-right">Precio</th>
              <th className="px-3 py-2 w-16 text-center">Cantidad</th>
              <th className="px-3 py-2 w-24 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {s.servicios_materiales?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400 italic">
                  -- No se registran líneas de materiales para esta orden --
                </td>
              </tr>
            ) : (
              s.servicios_materiales?.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-bold">{m.codigo}</td>
                  <td className="px-3 py-1.5 text-slate-900 font-bold">{m.descripcion}</td>
                  <td className="px-3 py-1.5 text-right">{Number(m.precio).toFixed(2)} €</td>
                  <td className="px-3 py-1.5 text-center">{m.cantidad}</td>
                  <td className="px-3 py-1.5 text-right font-black text-slate-900">{(Number(m.precio) * m.cantidad).toFixed(2)} €</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totales y Resumen Económico */}
      <div className="flex justify-end mb-4">
        <div className="border-2 border-slate-900 rounded-xl overflow-hidden print-border w-72 flex flex-col">
          <div className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 text-center uppercase tracking-wider print-border">
            RESUMEN ECONÓMICO
          </div>
          <div className="p-3 space-y-1.5 font-bold text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Materiales:</span>
              <span className="text-slate-800">{Number(s.total_materiales || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Trabajos Propios:</span>
              <span className="text-slate-800">{Number(s.total_serv_propio || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-100">
              <span className="text-slate-400">Total Trabajos Externos:</span>
              <span className="text-slate-800">{Number(s.total_serv_ext || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pt-1 font-black text-xs">
              <span className="text-slate-900">IMPORTE TOTAL:</span>
              <span className="text-primary">{Number(s.total || 0).toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie del Reporte */}
      <div className="mt-8 border-t-2 border-slate-900 pt-4 print-border">
        <div className="flex items-start justify-between">

          {/* Logo / Marca */}
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900">
              BigMat<span className="text-primary"> Ribera</span>
            </span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Logística y Servicios de Entrega</span>
          </div>

          {/* Datos de contacto */}
          <div className="text-right text-[8px] leading-relaxed text-slate-600 font-semibold">
            <p>Ctra Francia 42 · 25530 Vielha (Lleida)</p>
            <p>T. 973 64 14 60 · WhatsApp 618 88 63 88 · Exposición 660 50 33 53</p>
            <p>pedidos@riberahogar.com · www.riberahogar.com</p>
            <p className="text-[7px] text-slate-400 mt-1">Vielha: Lu-Vi 8:00-13:00 / 15:00-19:00 · Sá 9:00-13:30</p>
          </div>
        </div>
        <div className="text-center text-[7px] text-slate-400 mt-3 pt-2 border-t border-slate-200">
          Documento generado digitalmente por BigMat Ribera en fecha {new Date().toLocaleDateString('es-ES')}.
        </div>
      </div>

    </div>
  );
}
