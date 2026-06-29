'use client';

import React, { useState } from 'react';
import { AlertTriangle, Edit2, Calendar, Phone, User, CheckCircle2, XCircle } from 'lucide-react';
import ServicioModal from '../servicios/ServicioModal';

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
    if (!s.fecha_entrega) return 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/50';

    const [year, month, day] = s.fecha_entrega.split('-').map(Number);
    const fechaEntrega = new Date(year, month - 1, day);
    fechaEntrega.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    // Calcular límites de la semana actual (lunes a domingo)
    const currentDay = hoy.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const lunesEstaSemana = new Date(hoy);
    lunesEstaSemana.setDate(hoy.getDate() + diffToMonday);
    
    const domingoEstaSemana = new Date(lunesEstaSemana);
    domingoEstaSemana.setDate(lunesEstaSemana.getDate() + 6);

    const estadoNombre = s.estados?.nombre;

    // Regla 1: Anulado (Gris y tachado)
    if (estadoNombre === 'Anulado') {
      return 'bg-slate-100/70 border-slate-200 text-slate-400 line-through hover:bg-slate-100/90';
    }

    // Regla 2: Terminado o Cerrado/Facturado (Verde)
    if (estadoNombre === 'Terminado' || estadoNombre === 'Facturado/Cerrado') {
      return 'bg-emerald-50/70 border-emerald-100 text-emerald-900 hover:bg-emerald-50/90';
    }

    // Regla 3: Hoy o Atrasado (Rojo)
    if (fechaEntrega <= hoy) {
      return 'bg-red-50/80 border-red-100 text-red-950 font-semibold hover:bg-red-50/95';
    }

    // Regla 4: Mañana (Naranja)
    if (fechaEntrega.getTime() === manana.getTime()) {
      return 'bg-amber-50/80 border-amber-100 text-amber-950 font-semibold hover:bg-amber-50/95';
    }

    // Regla 5: Esta semana (Amarillo)
    if (fechaEntrega >= lunesEstaSemana && fechaEntrega <= domingoEstaSemana) {
      return 'bg-yellow-50/70 border-yellow-100 text-yellow-950 hover:bg-yellow-50/90';
    }

    // Por defecto (Sin colores destacados)
    return 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50/50';
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
                        style={{ backgroundColor: s.tipos_servicios?.color || '#94a3b8' }}
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
                          <span title="Esta orden tiene incidencias activas" className="p-0.5 bg-red-100 text-red-600 rounded">
                            <AlertTriangle size={12} className="animate-pulse" />
                          </span>
                        )}
                        {s.dest_observaciones && (
                          <span title="Notas adicionales en destino" className="p-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black px-1">
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
