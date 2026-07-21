'use client';

import React, { useState, useEffect } from 'react';
import AgendaFilters from './AgendaFilters';
import AgendaTable from './AgendaTable';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw } from 'lucide-react';

interface AgendaContainerProps {
  initialServicios: any[];
  catalogos: any;
}

export default function AgendaContainer({ initialServicios, catalogos }: AgendaContainerProps) {
  const [servicios, setServicios] = useState<any[]>(initialServicios);
  
  // Estados de filtros
  const [filtroRapido, setFiltroRapido] = useState<string>('todos');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null);
  const [selectedTiendaId, setSelectedTiendaId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Refrescar lista de servicios
  const refreshList = async () => {
    setRefreshing(true);
    const supabase = createClient();
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
      .order('fecha_entrega', { ascending: true });

    if (data) {
      setServicios(data);
    }
    setRefreshing(false);
  };

  // Auto-refresco periódico y al volver a la pestaña para reflejar cambios desde la app móvil
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const sync = async () => {
      setRefreshing(true);
      await refreshList();
    };

    interval = setInterval(sync, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Filtrado y ordenación
  const getFilteredServicios = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let list = [...servicios];

    // 1. Aplicar Filtro Rápido (Accesos rápidos Delphi)
    if (filtroRapido === 'todos_pendientes') {
      list = list.filter(s => 
        s.estados?.nombre !== 'Terminado' && 
        s.estados?.nombre !== 'Facturado/Cerrado' && 
        s.estados?.nombre !== 'Anulado'
      );
    } else if (filtroRapido === 'atrasados') {
      list = list.filter(s => {
        if (!s.fecha_entrega) return false;
        const [y, m, d] = s.fecha_entrega.split('-').map(Number);
        const f = new Date(y, m - 1, d);
        f.setHours(0, 0, 0, 0);
        return f < hoy && 
          s.estados?.nombre !== 'Terminado' && 
          s.estados?.nombre !== 'Facturado/Cerrado' && 
          s.estados?.nombre !== 'Anulado';
      });
    } else if (filtroRapido === 'urgentes') {
      // Mostrar pendientes ordenados por urgencia (fecha asc)
      list = list.filter(s => 
        s.estados?.nombre !== 'Terminado' && 
        s.estados?.nombre !== 'Facturado/Cerrado' && 
        s.estados?.nombre !== 'Anulado'
      );
      // Ordenar por fecha de entrega
      list.sort((a, b) => {
        if (!a.fecha_entrega) return 1;
        if (!b.fecha_entrega) return -1;
        return a.fecha_entrega.localeCompare(b.fecha_entrega);
      });
    } else if (filtroRapido === 'incidencias') {
      list = list.filter(s => s.incidencias === true);
    } else if (filtroRapido === 'terminados') {
      list = list.filter(s => 
        s.estados?.nombre === 'Terminado' || 
        s.estados?.nombre === 'Facturado/Cerrado'
      );
    }

    // 2. Filtrar por Buscador de Texto (Cliente, dirección, observaciones, código)
    if (searchText.trim().length > 0) {
      const q = searchText.toLowerCase();
      list = list.filter(s => 
        s.codigo_servicio.toLowerCase().includes(q) ||
        s.nombre_cliente.toLowerCase().includes(q) ||
        (s.dest_direccion && s.dest_direccion.toLowerCase().includes(q)) ||
        (s.dest_poblacion && s.dest_poblacion.toLowerCase().includes(q)) ||
        (s.dest_observaciones && s.dest_observaciones.toLowerCase().includes(q))
      );
    }

    // 3. Filtrar por Técnico
    if (selectedEmpleadoId !== null) {
      list = list.filter(s => s.empleado_id === selectedEmpleadoId);
    }

    // 4. Filtrar por Tienda
    if (selectedTiendaId !== null) {
      list = list.filter(s => s.tienda_id === selectedTiendaId);
    }

    // 5. Filtrar por Rango de Fechas
    if (startDate) {
      list = list.filter(s => s.fecha_entrega && s.fecha_entrega >= startDate);
    }
    if (endDate) {
      list = list.filter(s => s.fecha_entrega && s.fecha_entrega <= endDate);
    }

    return list;
  };

  const filteredList = getFilteredServicios();

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-end">
        <button
          onClick={refreshList}
          disabled={refreshing}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all border border-slate-200 bg-white"
          title="Refrescar agenda"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <AgendaFilters
        filtroRapido={filtroRapido}
        setFiltroRapido={setFiltroRapido}
        searchText={searchText}
        setSearchText={setSearchText}
        selectedEmpleadoId={selectedEmpleadoId}
        setSelectedEmpleadoId={setSelectedEmpleadoId}
        selectedTiendaId={selectedTiendaId}
        setSelectedTiendaId={setSelectedTiendaId}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        catalogos={catalogos}
      />

      {/* Tabla */}
      <AgendaTable
        servicios={filteredList}
        onSaved={refreshList}
        catalogos={catalogos}
      />

    </div>
  );
}
