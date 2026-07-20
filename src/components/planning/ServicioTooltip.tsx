'use client';

import React from 'react';
import { 
  User, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  FileText,
  DollarSign
} from 'lucide-react';

interface ServicioTooltipProps {
  servicio: any | null;
  x: number;
  y: number;
  visible: boolean;
}

export default function ServicioTooltip({ servicio, x, y, visible }: ServicioTooltipProps) {
  if (!visible || !servicio) return null;

  // Formatear hora de forma amigable (HH:MM)
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div 
      className="absolute bg-slate-950/95 border border-slate-800 text-slate-300 rounded-xl shadow-2xl p-4 w-72 z-50 pointer-events-none transition-opacity duration-200 backdrop-blur-md"
      style={{ 
        left: `${x + 15}px`, 
        top: `${y - 10}px` 
      }}
    >
      
      {/* Cabecera Tooltip */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <span className="text-[10px] font-black text-primary/70 uppercase tracking-wider">
          {servicio.codigo_servicio}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
          servicio.estados?.nombre === 'Terminado' || servicio.estados?.nombre === 'Facturado/Cerrado'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : servicio.estados?.nombre === 'En curso'
            ? 'bg-primary/10 text-primary/70 border border-primary/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {servicio.estados?.nombre || 'Pendiente'}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="space-y-2.5 text-xs font-semibold">
        
        {/* Cliente */}
        <div className="flex items-start gap-2">
          <User size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider leading-none">Cliente</span>
            <p className="text-white truncate leading-snug mt-0.5">{servicio.nombre_cliente}</p>
          </div>
        </div>

        {/* Horario */}
        <div className="flex items-start gap-2">
          <Clock size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider leading-none">Horario</span>
            <p className="text-slate-200 mt-0.5">
              {formatTime(servicio.hora_entrega_ini)} - {formatTime(servicio.hora_entrega_fin)}
            </p>
          </div>
        </div>

        {/* Destino */}
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider leading-none">Dirección</span>
            <p className="text-slate-200 truncate leading-snug mt-0.5" title={`${servicio.dest_direccion || ''} ${servicio.dest_num || ''}`}>
              {servicio.dest_direccion ? `${servicio.dest_direccion} ${servicio.dest_num || ''}` : '-- Sin dirección --'}
            </p>
            {servicio.dest_poblacion && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {servicio.dest_poblacion} ({servicio.dest_provincia})
              </span>
            )}
          </div>
        </div>

        {/* Tipo de Documento */}
        {servicio.num_documento && (
          <div className="flex items-start gap-2">
            <FileText size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider leading-none">Documento</span>
              <p className="text-slate-200 mt-0.5">
                {servicio.tipos_documentos?.nombre || 'Doc'}: {servicio.num_documento}
              </p>
            </div>
          </div>
        )}

        {/* Incidencias Activas */}
        {servicio.incidencias && (
          <div className="bg-red-950/40 border border-red-900/30 rounded-lg p-2 flex items-center gap-2 text-[10px] text-red-400 font-bold">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 animate-pulse" />
            <span>Esta orden tiene incidencias pendientes.</span>
          </div>
        )}

        {/* Notas breves si existen */}
        {servicio.dest_observaciones && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 leading-snug">
            <span className="font-bold text-slate-300 block mb-0.5">Notas:</span>
            <p className="line-clamp-2 italic">{servicio.dest_observaciones}</p>
          </div>
        )}

        {/* Importe Total */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-2">
          <span className="text-[10px] text-slate-500 uppercase font-bold">Importe</span>
          <span className="text-primary/70 font-black">
            {Number(servicio.total || 0).toFixed(2)} €
          </span>
        </div>

      </div>

    </div>
  );
}
