'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, User, Calendar, Wrench, AlertTriangle } from 'lucide-react';
import ServicioModal from '../servicios/ServicioModal';
import ServicioTooltip from './ServicioTooltip';
import { createClient } from '@/lib/supabase/client';

interface CatalogoItem {
  id: number;
  nombre: string;
  color?: string | null;
}

interface EmpleadoItem {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
}

interface Catalogos {
  tiendas: CatalogoItem[];
  estados: CatalogoItem[];
  tiposDocumentos: CatalogoItem[];
  tiposServicios: CatalogoItem[];
  empleados: EmpleadoItem[];
}

interface PlanningTimelineProps {
  initialStartDateStr: string;
  initialServicios: any[];
  catalogos: Catalogos;
}

// Horas del día (de 08:00 a 21:00 en intervalos de 30 minutos)
const HOURS_RANGE = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30'
];

const formatDateLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function PlanningTimeline({ initialStartDateStr, initialServicios, catalogos }: PlanningTimelineProps) {
  const [servicios, setServicios] = useState<any[]>(initialServicios);
  const [activeEmpleadoId, setActiveEmpleadoId] = useState<number | null>(() => {
    const gaby = catalogos.empleados.find(e => e.nombre.toLowerCase() === 'gaby');
    if (gaby) return gaby.id;
    return catalogos.empleados.length > 0 ? catalogos.empleados[0].id : null;
  });

  // Rango quincenal (empezando por la fecha calculada por el servidor en hora local)
  const [startDate, setStartDate] = useState<Date>(() => {
    const localStr = initialStartDateStr.replace(/-/g, '/'); // barras para evitar que JS interprete como UTC
    const start = new Date(localStr);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const [days, setDays] = useState<Date[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServicioId, setSelectedServicioId] = useState<number | null>(null);
  const [modalInitialData, setModalInitialData] = useState<{
    fecha?: string | null;
    horaIni?: string | null;
    horaFin?: string | null;
  }>({});

  // Tooltip State
  const [tooltipServicio, setTooltipServicio] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: string; hour: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ date: string; hour: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Generar quincena activa (14 días a partir del startDate)
  useEffect(() => {
    const list: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const nextDay = new Date(startDate);
      nextDay.setDate(startDate.getDate() + i);
      list.push(nextDay);
    }
    setDays(list);
  }, [startDate]);

  // Cargar servicios en caliente cuando cambie la quincena (startDate)
  useEffect(() => {
    refreshServicios();
  }, [startDate]);

  // Actualizar los servicios locales si cambian los iniciales
  useEffect(() => {
    setServicios(initialServicios);
  }, [initialServicios]);

  // Recargar servicios desde Supabase (sincronizar el timeline)
  const refreshServicios = async () => {
    const supabase = createClient();
    const startStr = formatDateLocal(startDate);
    const endStr = formatDateLocal(new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000));

    const { data } = await supabase
      .from('servicios')
      .select(`
        *,
        estados(nombre),
        tipos_servicios(nombre, color),
        tipos_documentos(nombre)
      `)
      .gte('fecha_entrega', startStr)
      .lte('fecha_entrega', endStr);

    if (data) {
      setServicios(data);
    }
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    const newStart = new Date(startDate);
    if (direction === 'prev') {
      newStart.setDate(startDate.getDate() - 14);
    } else {
      newStart.setDate(startDate.getDate() + 14);
    }
    setStartDate(newStart);
  };

  const handleDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    
    // Ajustar al lunes de la semana seleccionada
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    setStartDate(start);
  };

  // Convertir hora de HH:MM:SS o HH:MM a minutos desde las 08:00
  const timeToPercent = (timeStr: string | null) => {
    if (!timeStr) return 0;
    const [hStr, mStr] = timeStr.split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    
    // Minutos totales desde las 08:00
    const startMinutes = 8 * 60; // 08:00
    const currentMinutes = hours * 60 + minutes;
    const diff = currentMinutes - startMinutes;
    
    // Total minutos de la jornada (13 horas = 780 minutos de 08:00 a 21:00)
    const totalJornada = 13 * 60;
    
    // Devolver porcentaje de ancho
    return Math.max(0, Math.min(100, (diff / totalJornada) * 100));
  };

  // Calcular posición X y Ancho del bloque de servicio
  const getEventPosition = (s: any) => {
    const startPct = timeToPercent(s.hora_entrega_ini);
    const endPct = timeToPercent(s.hora_entrega_fin);
    const widthPct = Math.max(2, endPct - startPct); // Mínimo 2% de ancho para celdas muy pequeñas

    return {
      left: `${startPct}%`,
      width: `${widthPct}%`
    };
  };

  // --- LOGICA DE DRAG TO CREATE (ARRASTRAR Y SELECCIONAR) ---

  const handleCellMouseDown = (dateStr: string, hourStr: string) => {
    setIsDragging(true);
    setDragStart({ date: dateStr, hour: hourStr });
    setDragEnd({ date: dateStr, hour: hourStr });
  };

  const handleCellMouseEnter = (dateStr: string, hourStr: string) => {
    if (!isDragging || !dragStart) return;
    if (dateStr === dragStart.date) {
      setDragEnd({ date: dateStr, hour: hourStr });
    }
  };

  const handleCellMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) return;
    setIsDragging(false);

    // Calcular hora de inicio y fin ordenadas
    const hStartIdx = HOURS_RANGE.indexOf(dragStart.hour);
    const hEndIdx = HOURS_RANGE.indexOf(dragEnd.hour);
    const minIdx = Math.min(hStartIdx, hEndIdx);
    const maxIdx = Math.max(hStartIdx, hEndIdx);

    const horaIni = HOURS_RANGE[minIdx];
    // La hora final del bloque de 30 minutos es la siguiente franja
    const nextIdx = maxIdx + 1 < HOURS_RANGE.length ? maxIdx + 1 : maxIdx;
    const horaFin = HOURS_RANGE[nextIdx];

    setModalInitialData({
      fecha: dragStart.date,
      horaIni,
      horaFin
    });
    setSelectedServicioId(null);
    setIsModalOpen(true);

    setDragStart(null);
    setDragEnd(null);
  };

  // Comprobar si una celda está en el rango de arrastre activo
  const isCellSelected = (dateStr: string, hourStr: string) => {
    if (!dragStart || !dragEnd || dateStr !== dragStart.date) return false;
    
    const hStartIdx = HOURS_RANGE.indexOf(dragStart.hour);
    const hEndIdx = HOURS_RANGE.indexOf(dragEnd.hour);
    const cellIdx = HOURS_RANGE.indexOf(hourStr);
    
    const minIdx = Math.min(hStartIdx, hEndIdx);
    const maxIdx = Math.max(hStartIdx, hEndIdx);
    
    return cellIdx >= minIdx && cellIdx <= maxIdx;
  };

  // --- LÓGICA DE HOVER TOOLTIP ---

  const handleEventMouseEnter = (e: React.MouseEvent, s: any) => {
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      
      setTooltipServicio(s);
      setTooltipPos({ x, y });
      setTooltipVisible(true);
    }
  };

  const handleEventMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current && tooltipVisible) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      setTooltipPos({ x, y });
    }
  };

  const handleEventMouseLeave = () => {
    setTooltipVisible(false);
    setTooltipServicio(null);
  };

  const handleEventClick = (s: any) => {
    setSelectedServicioId(s.id);
    setModalInitialData({});
    setIsModalOpen(true);
  };

  const getFormatDateTitle = () => {
    const end = new Date(startDate);
    end.setDate(startDate.getDate() + 13);
    const format = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${format(startDate)} - ${format(end)}`;
  };

  return (
    <div className="space-y-6 font-sans relative" ref={containerRef}>
      
      {/* Cabecera / Controles del Planning */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Selector de Operario / Técnico */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg">
            <User size={18} />
          </div>
          <div className="flex-1 md:flex-none">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ver Técnico</label>
            <select
              value={activeEmpleadoId || ''}
              onChange={(e) => setActiveEmpleadoId(e.target.value ? Number(e.target.value) : null)}
              className="bg-white border-0 text-sm font-bold text-slate-800 focus:outline-none pr-6 cursor-pointer mt-0.5"
            >
              <option value="">-- Sin asignar --</option>
              {catalogos.empleados.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}{!emp.activo ? ' (Inactivo)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navegador Quincenal */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button 
              onClick={() => navigateTime('prev')}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200 cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 px-4 min-w-[140px] text-center">
              {getFormatDateTitle()}
            </span>
            <button 
              onClick={() => navigateTime('next')}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1 rounded-xl">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date"
              value={formatDateLocal(startDate)}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border-0 text-xs font-bold text-slate-700 focus:outline-none bg-white cursor-pointer py-1"
            />
          </div>
        </div>

      </div>

      {/* Grid del Planning (Timeline) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">

        {/* Wrapper de scroll horizontal: en móvil se desliza para ver todas las horas.
            La columna de día queda fija (sticky) mientras se desliza. */}
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">

        {/* Cabecera de Horas (Eje X) */}
        <div className="flex border-b border-slate-200 bg-slate-900 text-white select-none">
          <div className="w-28 flex-shrink-0 p-3 border-r border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center sticky left-0 z-20 bg-slate-900">
            Día / Rango
          </div>
          <div
            className="flex-1 text-center text-[10px] font-black tracking-wider py-3 grid"
            style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
          >
            {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(hour => (
              <div key={hour} className="border-r border-slate-800/40 last:border-0">
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Filas de Días (Eje Y) */}
        <div className="divide-y divide-slate-200 flex flex-col select-none">
          {days.map((date) => {
            const dateStr = formatDateLocal(date);
            const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' });
            const dayNum = date.getDate();
            const monthStr = date.toLocaleDateString('es-ES', { month: 'short' });

            // Filtrar servicios asignados a este operario en este día específico
            const dayEvents = servicios.filter(s => 
              s.fecha_entrega === dateStr && 
              (activeEmpleadoId === null ? s.empleado_id === null : s.empleado_id === activeEmpleadoId)
            );

            return (
              <div key={dateStr} className="flex relative h-12 hover:bg-slate-50/40 transition-colors">
                
                {/* Etiqueta de la Fecha (fija al deslizar horizontalmente) */}
                <div className="w-28 flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col items-center justify-center py-2 text-center sticky left-0 z-20">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{weekday}</span>
                  <span className="text-sm font-black text-slate-800 leading-none mt-0.5">{dayNum}</span>
                  <span className="text-[9px] font-bold text-slate-500 capitalize">{monthStr}</span>
                </div>

                {/* Grid de Celdas Horarias de Fondo para el Drag-to-Create */}
                <div className="flex-1 relative flex">
                  {HOURS_RANGE.map((hour) => (
                    <div
                      key={hour}
                      onMouseDown={() => handleCellMouseDown(dateStr, hour)}
                      onMouseEnter={() => handleCellMouseEnter(dateStr, hour)}
                      onMouseUp={handleCellMouseUp}
                      className={`flex-1 last:border-0 transition-all ${
                        hour.endsWith(':00') 
                          ? 'border-r border-dashed border-slate-100 bg-white' 
                          : 'border-r border-slate-200 bg-slate-50/40'
                      } ${
                        isCellSelected(dateStr, hour) 
                          ? '!bg-blue-600/10 !border-blue-300' 
                          : 'hover:bg-blue-500/5'
                      }`}
                    />
                  ))}

                  {/* Renderizado de Bloques de Servicio Posicionados Absolutamente */}
                  {dayEvents.map((s) => {
                    const pos = getEventPosition(s);
                    // Obtener color base
                    let baseColor = s.tipos_servicios?.color || '#3b82f6';
                    
                    // Normalizar y comprobar si es un color negro, gris oscuro o rojo/marrón muy oscuro agresivo
                    const cleanColor = baseColor.trim().toLowerCase();
                    const isDark = 
                      cleanColor === '#000000' || 
                      cleanColor === '#000' || 
                      cleanColor === 'black' ||
                      cleanColor.startsWith('rgb(0') ||
                      cleanColor.startsWith('rgba(0') ||
                      cleanColor === '#111' ||
                      cleanColor === '#111111' ||
                      cleanColor === '#222' ||
                      cleanColor === '#222222' ||
                      cleanColor === '#333' ||
                      cleanColor === '#333333' ||
                      cleanColor === '#1d0000' ||
                      cleanColor.includes('rgb(29') ||
                      cleanColor.includes('rgba(29');
                    
                    if (isDark) {
                      baseColor = '#3b82f6'; // Forzar a azul agradable
                    }
                    
                    // Crear gradiente lineal horizontal (degradado de mayor a menor)
                    const gradient = `linear-gradient(90deg, ${baseColor} 0%, ${baseColor}33 100%)`;

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleEventClick(s)}
                        onMouseEnter={(e) => handleEventMouseEnter(e, s)}
                        onMouseMove={handleEventMouseMove}
                        onMouseLeave={handleEventMouseLeave}
                        className="absolute h-8 top-2 text-white rounded-lg flex items-center px-2.5 text-xs font-bold shadow-md cursor-pointer transition-all hover:brightness-105 active:scale-[0.98] select-none z-10 border"
                        style={{
                          left: pos.left,
                          width: pos.width,
                          background: gradient,
                          borderColor: `${baseColor}cc`,
                          textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div className="flex items-center gap-1.5 w-full min-w-0">
                          {s.incidencias && (
                            <AlertTriangle size={12} className="text-white flex-shrink-0 animate-pulse" />
                          )}
                          <span className="truncate flex-1 font-semibold tracking-tight text-[11px]">
                            {s.nombre_cliente}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

          </div>{/* /min-w */}
        </div>{/* /overflow-x-auto */}

      </div>

      {/* Tooltip Flotante */}
      <ServicioTooltip 
        servicio={tooltipServicio} 
        x={tooltipPos.x} 
        y={tooltipPos.y} 
        visible={tooltipVisible} 
      />

      {/* Modal Detalles de Servicio */}
      <ServicioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          await refreshServicios();
        }}
        servicioId={selectedServicioId}
        fechaInicial={modalInitialData.fecha}
        horaInicial={modalInitialData.horaIni}
        horaFinal={modalInitialData.horaFin}
        empleadoInicialId={activeEmpleadoId}
        catalogos={catalogos}
      />

    </div>
  );
}
