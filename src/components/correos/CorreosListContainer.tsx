'use client';

import React, { useState } from 'react';
import { Search, Mail, CheckCircle, XCircle, ArrowUpRight, AlertCircle } from 'lucide-react';
import ServicioModal from '../servicios/ServicioModal';

interface CorreosListContainerProps {
  initialCorreos: any[];
  catalogos: any;
}

export default function CorreosListContainer({ initialCorreos, catalogos }: CorreosListContainerProps) {
  const [correos, setCorreos] = useState<any[]>(initialCorreos);
  const [searchText, setSearchText] = useState('');
  
  // Modal de Detalles del Servicio Relacionado
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refrescar lista
  const refreshList = async () => {
    const supabase = require('@/lib/supabase/client').createClient();
    const { data } = await supabase
      .from('servicios_correos')
      .select(`
        *,
        servicios(id, codigo_servicio, nombre_cliente)
      `)
      .order('fecha', { ascending: false });

    if (data) {
      setCorreos(data);
    }
  };

  const handleVerServicio = (id: number) => {
    setSelectedServicioId(id);
    setIsModalOpen(true);
  };

  const formatFecha = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCorreos = correos.filter(c => 
    c.destinatario.toLowerCase().includes(searchText.toLowerCase()) ||
    c.asunto.toLowerCase().includes(searchText.toLowerCase()) ||
    (c.servicios?.codigo_servicio && c.servicios.codigo_servicio.toLowerCase().includes(searchText.toLowerCase())) ||
    (c.servicios?.nombre_cliente && c.servicios.nombre_cliente.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Barra de Búsqueda */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white placeholder:text-slate-400 transition-all"
            placeholder="Buscar por destinatario, orden, asunto..."
          />
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Grid de Correos */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-44">Fecha / Hora</th>
                <th className="px-4 py-3.5 w-48">Orden Relacionada</th>
                <th className="px-4 py-3.5">Destinatario</th>
                <th className="px-4 py-3.5">Asunto</th>
                <th className="px-4 py-3.5 w-28 text-center">Estado</th>
                <th className="px-4 py-3.5 w-48">Log de Error / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {filteredCorreos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">
                    -- No se encontraron registros de correos enviados --
                  </td>
                </tr>
              ) : (
                filteredCorreos.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* Fecha */}
                    <td className="px-4 py-3 text-slate-500">{formatFecha(c.fecha)}</td>
                    
                    {/* Servicio Relacionado */}
                    <td className="px-4 py-3">
                      {c.servicios ? (
                        <button
                          type="button"
                          onClick={() => handleVerServicio(c.servicios.id)}
                          className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1 font-bold text-left cursor-pointer"
                        >
                          <span>{c.servicios.codigo_servicio}</span>
                          <span className="font-medium text-[10px] text-slate-400">({c.servicios.nombre_cliente})</span>
                          <ArrowUpRight size={10} />
                        </button>
                      ) : (
                        <span className="text-slate-400 font-normal italic">No asignado</span>
                      )}
                    </td>
                    
                    {/* Destinatario */}
                    <td className="px-4 py-3 text-slate-900 font-bold">{c.destinatario}</td>
                    
                    {/* Asunto */}
                    <td className="px-4 py-3 truncate max-w-[200px]" title={c.asunto}>{c.asunto}</td>
                    
                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 w-20 mx-auto ${
                        c.estado === 'Enviado'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {c.estado === 'Enviado' ? (
                          <>
                            <CheckCircle size={10} />
                            <span>Enviado</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={10} />
                            <span>Fallido</span>
                          </>
                        )}
                      </span>
                    </td>
                    
                    {/* Error Log */}
                    <td className="px-4 py-3 text-slate-400 font-medium truncate max-w-[150px]" title={c.error_log || ''}>
                      {c.error_log ? (
                        <div className="flex items-center gap-1 text-red-500/80 text-[10px]">
                          <AlertCircle size={10} className="flex-shrink-0" />
                          <span>{c.error_log}</span>
                        </div>
                      ) : (
                        <span className="text-emerald-500 text-[10px]">Sin errores</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalles */}
      <ServicioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={refreshList}
        servicioId={selectedServicioId}
        catalogos={catalogos}
      />

    </div>
  );
}
