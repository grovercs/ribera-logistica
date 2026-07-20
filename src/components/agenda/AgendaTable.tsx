'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import ServicioModal from '../servicios/ServicioModal';
import { getServicioColorClass } from '@/lib/servicioColor';

interface CatalogoItem {
  id: number;
  nombre: string;
}

interface EmpleadoItem {
  id: number;
  nombre: string;
  telefono: string | null;
}

interface Catalogos {
  tiendas: CatalogoItem[];
  estados: CatalogoItem[];
  tiposDocumentos: CatalogoItem[];
  tiposServicios: CatalogoItem[];
  empleados: EmpleadoItem[];
}

interface AgendaTableProps {
  servicios: any[];
  onSaved: () => void;
  catalogos: Catalogos;
}

export default function AgendaTable({ servicios, onSaved, catalogos }: AgendaTableProps) {
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper para determinar el color clásico de Delphi por fila
  const getFilaColorClass = (s: any) => {
    const color = getServicioColorClass(s);
    const isAnulado = s.estados?.nombre === 'Anulado';
    return `${color.bg}/80 ${color.border} ${color.text} ${isAnulado ? 'line-through' : ''} hover:${color.bg}`;
  };

  const handleRowClick = (id: number) => {
    setSelectedServicioId(id);
    setIsModalOpen(true);
  };

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
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      
      {/* Tabla Responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3.5 w-24">Cód. Servicio</th>
              <th className="px-4 py-3.5 w-20">Tienda</th>
              <th className="px-4 py-3.5 w-24">Fecha Entrega</th>
              <th className="px-4 py-3.5 w-20">Horario</th>
              <th className="px-4 py-3.5">Cliente</th>
              <th className="px-4 py-3.5">Dirección de Entrega</th>
              <th className="px-4 py-3.5 w-32">Técnico Asignado</th>
              <th className="px-4 py-3.5 w-28">Tipo Servicio</th>
              <th className="px-4 py-3.5 w-24 text-right">Total</th>
              <th className="px-4 py-3.5 w-16 text-center">Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {servicios.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic font-medium">
                  -- No se encontraron órdenes de servicios en esta consulta --
                </td>
              </tr>
            ) : (
              servicios.map((s) => {
                const filaStyle = getFilaColorClass(s);
                return (
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s.id)}
                    className={`border-b transition-colors cursor-pointer ${filaStyle}`}
                  >
                    {/* Código de Servicio */}
                    <td className="px-4 py-3 font-bold tracking-tight">
                      {s.codigo_servicio}
                    </td>
                    
                    {/* Tienda */}
                    <td className="px-4 py-3">
                      {s.tiendas?.nombre || '--'}
                    </td>
                    
                    {/* Fecha Entrega */}
                    <td className="px-4 py-3">
                      {formatFecha(s.fecha_entrega)}
                    </td>
                    
                    {/* Horario */}
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatHora(s.hora_entrega_ini)} - {formatHora(s.hora_entrega_fin)}
                    </td>
                    
                    {/* Cliente */}
                    <td className="px-4 py-3 truncate max-w-[150px]" title={s.nombre_cliente}>
                      {s.nombre_cliente}
                    </td>
                    
                    {/* Dirección */}
                    <td className="px-4 py-3 truncate max-w-[200px]" title={`${s.dest_direccion || ''} ${s.dest_num || ''} ${s.dest_poblacion || ''}`}>
                      {s.dest_direccion ? `${s.dest_direccion} ${s.dest_num || ''}` : '-- Sin dirección --'}
                      {s.dest_poblacion && ` (${s.dest_poblacion})`}
                    </td>
                    
                    {/* Técnico */}
                    <td className="px-4 py-3 truncate max-w-[100px]" title={s.empleados?.nombre}>
                      {s.empleados?.nombre || (
                        <span className="text-slate-400 italic font-normal text-[10px]">Sin asignar</span>
                      )}
                    </td>
                    
                    {/* Tipo Servicio */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: getServicioColorClass(s).badge }}
                      >
                        {s.tipos_servicios?.nombre || 'General'}
                      </span>
                    </td>
                    
                    {/* Total */}
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {Number(s.total || 0).toFixed(2)} €
                    </td>
                    
                    {/* Alertas */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {s.incidencias && (
                          <span title="Esta orden tiene incidencias activas" className="p-0.5 bg-red-100 text-red-600 rounded-full">
                            <AlertTriangle size={12} className="animate-pulse" />
                          </span>
                        )}
                        {(s.estados?.nombre === 'Terminado' || s.estados?.nombre === 'Facturado/Cerrado') && (
                          <span title="Servicio finalizado" className="p-0.5 bg-emerald-100 text-emerald-600 rounded-full">
                            <CheckCircle2 size={12} />
                          </span>
                        )}
                        {s.dest_observaciones && (
                          <span title="Notas adicionales en destino" className="p-0.5 bg-primary/10 text-primary rounded text-[9px] font-black px-1">
                            N
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de edición */}
      <ServicioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={onSaved}
        servicioId={selectedServicioId}
        catalogos={catalogos}
      />

    </div>
  );
}
