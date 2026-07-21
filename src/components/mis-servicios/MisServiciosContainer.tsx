'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Euro, FileText, CheckCircle2, AlertCircle, Search, Landmark, Wallet, XCircle, Camera } from 'lucide-react';

interface Reporte {
  id: string;
  orden_id: number;
  creado_en: string;
  fecha_trabajo: string | null;
  horas_trabajadas: number;
  estado_liquidacion: string;
  trabajo_realizado: string | null;
  material_utilizado: string | null;
  firma_url: string | null;
  fotos_urls: string[] | null;
  facturas_urls: string[] | null;
  fecha_pago: string | null;
  medio_pago: string | null;
  notas_pago: string | null;
  servicios: {
    codigo_servicio: string;
    nombre_cliente: string;
    dest_direccion: string | null;
    dest_poblacion: string | null;
    dest_observaciones: string | null;
    num_documento: string | null;
    tipos_servicios: {
      nombre: string;
    } | null;
  };
  tarifa_hora: number;
  total_importe: number;
}

interface Empleado {
  id: number;
  nombre: string;
  tipo: string;
  razon_social: string | null;
  cif_nif: string | null;
  iban: string | null;
  tarifa_hora: number;
}

interface MisServiciosContainerProps {
  reportes: Reporte[];
  empleado: Empleado;
}

export default function MisServiciosContainer({ reportes, empleado }: MisServiciosContainerProps) {
  // Filtros
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);

  // Filtrado de reportes
  const filteredReportes = useMemo(() => {
    return reportes.filter((rep) => {
      // Filtro de fecha
      const fechaRep = new Date(rep.creado_en).toISOString().split('T')[0];
      if (desde && fechaRep < desde) return false;
      if (hasta && fechaRep > hasta) return false;

      // Filtro de Estado
      if (estadoFilter && rep.estado_liquidacion !== estadoFilter) return false;

      // Filtro de búsqueda
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const code = rep.servicios?.codigo_servicio?.toLowerCase() || '';
        const client = rep.servicios?.nombre_cliente?.toLowerCase() || '';
        if (!code.includes(q) && !client.includes(q)) return false;
      }

      return true;
    });
  }, [reportes, desde, hasta, estadoFilter, searchQuery]);

  // Totales
  const stats = useMemo(() => {
    let horas = 0;
    let total = 0;
    let cobrado = 0;
    let pendiente = 0;

    filteredReportes.forEach((rep) => {
      const h = Number(rep.horas_trabajadas || 0);
      const imp = rep.total_importe;

      horas += h;
      total += imp;
      if (rep.estado_liquidacion === 'Pagado') {
        cobrado += imp;
      } else {
        pendiente += imp;
      }
    });

    return { horas, total, cobrado, pendiente };
  }, [filteredReportes]);

  return (
    <div className="space-y-6">
      
      {/* FICHA TÉCNICA DEL OPERARIO / EMPRESA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Landmark size={14} />
          <span>Ficha de Colaborador Registrada</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-slate-600 font-semibold">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Nombre / Razón Social</p>
            <p className="text-slate-800 text-sm font-bold mt-0.5">{empleado.razon_social || empleado.nombre}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">DNI / CIF</p>
            <p className="text-slate-800 text-sm font-mono font-bold mt-0.5">{empleado.cif_nif || 'No registrado'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Tarifa por Hora</p>
            <p className="text-slate-800 text-sm font-bold mt-0.5">{Number(empleado.tarifa_hora || 0).toFixed(2)}€/h</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Cuenta de Abono (IBAN)</p>
            <p className="text-slate-800 text-sm font-mono font-bold mt-0.5 truncate" title={empleado.iban || ''}>
              {empleado.iban ? empleado.iban.replace(/(?<=.{4}).(?=.{4})/g, '*') : 'No registrada'}
            </p>
          </div>
        </div>
      </div>

      {/* TARJETAS CONTABLES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Horas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas Realizadas</span>
            <FileText size={16} />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{stats.horas.toFixed(1)}h</p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">Total de horas registradas</p>
        </div>

        {/* Total Devengado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Devengado</span>
            <Euro size={16} />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {stats.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">Importe total por tus servicios</p>
        </div>

        {/* Cobrado */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20 border-emerald-100">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Cobrado</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {stats.cobrado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-[10px] text-emerald-600/70 mt-1 font-semibold">Pagos recibidos de BigMat Ribera</p>
        </div>

        {/* Pendiente de Cobro */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm bg-amber-50/20 border-amber-100">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendiente de Cobro</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {stats.pendiente.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-[10px] text-amber-600/70 mt-1 font-semibold">Pendiente para facturar/cobrar</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
          <Wallet size={14} className="text-primary/80" />
          <span>Filtros de Búsqueda</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Buscar Servicio</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Código de servicio o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Fecha Desde */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Desde Fecha</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta Fecha</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
            />
          </div>

          {/* Estado Pago */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Estado del Cobro</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
            >
              <option value="">Todos los cobros</option>
              <option value="Pendiente">Pendiente de Cobro</option>
              <option value="Pagado">Cobrados / Pagados</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE TRABAJOS PRESTADOS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-4 border-b border-slate-800">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Historial de Trabajos Prestados</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3 w-32">Servicio</th>
                <th className="px-5 py-3">Cliente / Obra</th>
                <th className="px-5 py-3 w-40">Población</th>
                <th className="px-5 py-3 w-24 text-right">Horas</th>
                <th className="px-5 py-3 w-32 text-right">Importe Cobro</th>
                <th className="px-5 py-3 w-44 text-center">Estado del Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {filteredReportes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 italic">
                    -- No tienes servicios registrados en este periodo --
                  </td>
                </tr>
              ) : (
                filteredReportes.map((rep) => (
                  <tr
                    key={rep.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedReporte(rep)}
                    title="Ver detalle del trabajo"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{rep.servicios?.codigo_servicio}</td>
                    <td className="px-5 py-3.5 text-slate-800 font-bold">{rep.servicios?.nombre_cliente}</td>
                    <td className="px-5 py-3.5 text-slate-500">{rep.servicios?.dest_poblacion || 'No especificada'}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-700">{rep.horas_trabajadas.toFixed(1)}h</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{rep.total_importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                    <td className="px-5 py-3.5 text-center">
                      {rep.estado_liquidacion === 'Pagado' ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                            Pagado por {rep.medio_pago || 'Transferencia'}
                          </span>
                          {rep.fecha_pago && (
                            <span className="text-[8px] text-slate-400 font-medium">
                              {new Date(rep.fecha_pago).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          {rep.notas_pago && (
                            <span className="text-[9px] text-slate-500 italic mt-1 max-w-[180px] block text-center font-normal leading-normal border-t border-slate-100 pt-1">
                              Nota: {rep.notas_pago}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                          PENDIENTE DE PAGO
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DEL TRABAJO REALIZADO */}
      {selectedReporte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary/70" />
                <h3 className="text-sm font-bold">Detalle del Trabajo Realizado</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReporte(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Servicio / Cliente</p>
                <p className="text-slate-900 font-bold text-sm">{selectedReporte.servicios?.codigo_servicio} — {selectedReporte.servicios?.nombre_cliente}</p>
                <p className="text-slate-600">{selectedReporte.servicios?.dest_direccion || 'Sin dirección registrada'}</p>
                <p className="text-slate-500">{selectedReporte.servicios?.dest_poblacion || 'Sin población registrada'}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="bg-primary/10 text-primary-dark text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    {selectedReporte.servicios?.tipos_servicios?.nombre || 'General'}
                  </span>
                  {selectedReporte.servicios?.num_documento && (
                    <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Ref. {selectedReporte.servicios.num_documento}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trabajo a realizar / Notas del Pedido</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {selectedReporte.servicios?.dest_observaciones ? (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedReporte.servicios.dest_observaciones}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin notas registradas</p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText size={12} />
                  Trabajo Realizado
                </p>
                {selectedReporte.trabajo_realizado ? (
                  <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-3">{selectedReporte.trabajo_realizado}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-3">Sin descripción del trabajo realizado</p>
                )}
              </div>

              {selectedReporte.material_utilizado && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText size={12} />
                    Material / Gastos
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl p-3">{selectedReporte.material_utilizado}</p>
                </div>
              )}

              {selectedReporte.fotos_urls && selectedReporte.fotos_urls.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Camera size={12} />
                    Fotos del Trabajo ({selectedReporte.fotos_urls.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedReporte.fotos_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedReporte.facturas_urls && selectedReporte.facturas_urls.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Facturas / Recibos ({selectedReporte.facturas_urls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedReporte.facturas_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-amber-200 bg-white">
                        <img src={url} alt={`Factura ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedReporte.firma_url && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Firma del Cliente</p>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 flex justify-center">
                    <img src={selectedReporte.firma_url} alt="Firma del cliente" className="max-h-32 object-contain" />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Resumen Económico</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{selectedReporte.horas_trabajadas.toFixed(1)}h × {selectedReporte.tarifa_hora.toFixed(2)}€/h</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReporte.total_importe.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-500">Estado del cobro</span>
                  <span className={`font-black text-[10px] px-2 py-0.5 rounded uppercase ${selectedReporte.estado_liquidacion === 'Pagado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                    {selectedReporte.estado_liquidacion === 'Pagado' ? `Pagado ${selectedReporte.medio_pago || ''}` : 'Pendiente de pago'}
                  </span>
                </div>
                {selectedReporte.fecha_pago && (
                  <p className="text-[10px] text-slate-500 mt-1">Fecha de pago: {new Date(selectedReporte.fecha_pago).toLocaleDateString('es-ES')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
