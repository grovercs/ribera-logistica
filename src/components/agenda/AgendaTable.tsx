'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
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

const estadoBadge = (nombre: string) => {
  const map: Record<string, string> = {
    'Pendiente': 'border-amber-200 bg-amber-50 text-amber-700',
    'En curso': 'border-sky-200 bg-sky-50 text-sky-700',
    'Terminado': 'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Facturado/Cerrado': 'border-primary/20 bg-primary/10 text-primary',
    'Aplazado': 'border-purple-200 bg-purple-50 text-purple-700',
    'Anulado': 'border-slate-200 bg-slate-100 text-slate-500 line-through',
  };
  return map[nombre] || 'border-slate-200 bg-slate-50 text-slate-700';
};

export default function AgendaTable({ servicios, onSaved, catalogos }: AgendaTableProps) {
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (id: number) => {
    setSelectedServicioId(id);
    setIsModalOpen(true);
  };

  const formatFecha = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-white/70 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-32">Código</th>
              <th className="px-4 py-3 w-32">Estado</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 w-36">Tienda</th>
              <th className="px-4 py-3 w-28">Fecha Entrega</th>
              <th className="px-4 py-3 w-40">Tipo Servicio</th>
              <th className="px-4 py-3 w-24 text-center">Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {servicios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-slate-400 font-medium">
                  No se encontraron servicios en este rango.
                </td>
              </tr>
            ) : (
              servicios.map((s) => {
                const color = getServicioColorClass(s);
                const estadoNombre = s.estados?.nombre || 'Pendiente';
                const isAnulado = estadoNombre === 'Anulado';
                return (
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s.id)}
                    className={`cursor-pointer transition hover:brightness-[1.02] ${color.bg} ${color.text} ${isAnulado ? 'line-through' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold tracking-tight">
                      {s.codigo_servicio}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estadoBadge(estadoNombre)}`}>
                        {estadoNombre}
                      </span>
                    </td>

                    <td className="px-4 py-3 truncate max-w-[220px]" title={s.nombre_cliente}>
                      {s.nombre_cliente}
                    </td>

                    <td className="px-4 py-3 truncate max-w-[120px]" title={s.tiendas?.nombre}>
                      {s.tiendas?.nombre || '--'}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {formatFecha(s.fecha_entrega)}
                    </td>

                    <td className="px-4 py-3">
                      {s.tipos_servicios?.nombre || 'General'}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {s.incidencias && (
                          <span title="Incidencias" className="p-1 bg-red-100 text-red-600 rounded-full">
                            <AlertTriangle size={12} className="animate-pulse" />
                          </span>
                        )}
                        {(estadoNombre === 'Terminado' || estadoNombre === 'Facturado/Cerrado') && (
                          <span title="Finalizado" className="p-1 bg-emerald-100 text-emerald-600 rounded-full">
                            <CheckCircle2 size={12} />
                          </span>
                        )}
                        {s.dest_observaciones && (
                          <span title="Notas" className="p-1 bg-slate-100 text-slate-500 rounded-full">
                            <FileText size={12} />
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
