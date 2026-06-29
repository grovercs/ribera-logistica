'use client';

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, User, Phone, CheckCircle } from 'lucide-react';
import ServicioModal from './ServicioModal';
import { eliminarServicio } from '@/app/(dashboard)/planning/actions';

interface ServiciosAdminContainerProps {
  initialServicios: any[];
  catalogos: any;
}

export default function ServiciosAdminContainer({ initialServicios, catalogos }: ServiciosAdminContainerProps) {
  const [servicios, setServicios] = useState<any[]>(initialServicios);
  const [searchText, setSearchText] = useState('');
  
  // Modal State
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refrescar lista de servicios
  const refreshList = async () => {
    const supabase = require('@/lib/supabase/client').createClient();
    const { data } = await supabase
      .from('servicios')
      .select(`
        *,
        estados(nombre),
        tipos_servicios(nombre, color),
        tipos_documentos(nombre),
        tiendas(nombre),
        empleados(nombre)
      `)
      .order('codigo_servicio', { ascending: false });
    
    if (data) {
      setServicios(data);
    }
  };

  const handleCreate = () => {
    setSelectedServicioId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedServicioId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, codigo: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio ${codigo}?`)) return;
    
    const res = await eliminarServicio(id);
    if (res.success) {
      await refreshList();
    } else {
      alert(`Error al eliminar: ${res.error}`);
    }
  };

  const filteredServicios = servicios.filter(s => 
    s.codigo_servicio.toLowerCase().includes(searchText.toLowerCase()) ||
    s.nombre_cliente.toLowerCase().includes(searchText.toLowerCase()) ||
    (s.dest_direccion && s.dest_direccion.toLowerCase().includes(searchText.toLowerCase())) ||
    (s.dest_poblacion && s.dest_poblacion.toLowerCase().includes(searchText.toLowerCase()))
  );

  const formatFecha = (dateStr: string | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Acciones */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Buscador */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400 transition-all"
            placeholder="Buscar por cliente, código, dirección..."
          />
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Botón Añadir */}
        <button
          type="button"
          onClick={handleCreate}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl px-4 py-2 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all"
        >
          <Plus size={14} />
          <span>Añadir Servicio</span>
        </button>

      </div>

      {/* Grid Listado */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-24">Cód. Servicio</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Dirección de Entrega</th>
                <th className="px-4 py-3.5 w-24">Fecha Entrega</th>
                <th className="px-4 py-3.5 w-32">Técnico</th>
                <th className="px-4 py-3.5 w-28">Tipo Servicio</th>
                <th className="px-4 py-3.5 w-28">Estado</th>
                <th className="px-4 py-3.5 w-24 text-right">Total</th>
                <th className="px-4 py-3.5 w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {filteredServicios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">
                    -- No hay registros de órdenes de servicios --
                  </td>
                </tr>
              ) : (
                filteredServicios.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-950">{s.codigo_servicio}</td>
                    <td className="px-4 py-3 text-slate-900 font-bold truncate max-w-[150px]">{s.nombre_cliente}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]" title={s.dest_direccion}>
                      {s.dest_direccion ? `${s.dest_direccion} ${s.dest_num || ''}` : '-- Sin dirección --'}
                    </td>
                    <td className="px-4 py-3">{formatFecha(s.fecha_entrega)}</td>
                    <td className="px-4 py-3 truncate max-w-[100px]">{s.empleados?.nombre || <span className="text-slate-400 font-normal">Sin asignar</span>}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: s.tipos_servicios?.color || '#94a3b8' }}
                      >
                        {s.tipos_servicios?.nombre || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.estados?.nombre === 'Terminado' || s.estados?.nombre === 'Facturado/Cerrado'
                          ? 'bg-emerald-50 text-emerald-600'
                          : s.estados?.nombre === 'Anulado'
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        {s.estados?.nombre || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">{Number(s.total || 0).toFixed(2)} €</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(s.id)}
                          className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id, s.codigo_servicio)}
                          className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-md transition-all cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
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
