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

  // Vista móvil: días laborables (sin domingo) y día seleccionado
  const [mobileDays, setMobileDays] = useState<Date[]>([]);
  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState(0);
  const [mobileSelectedWeek, setMobileSelectedWeek] = useState(0); // 0 = semana 1, 1 = semana 2

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

  // Detectar si el dispositivo principal es táctil para adaptar la interacción
  const [isTouchDevice, setIsTouchDevice] = useState(false);

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

    // Vista móvil: omitir domingos para no mostrar días no laborables
    const laborables = list.filter(d => d.getDay() !== 0);
    setMobileDays(laborables);

    // Al cambiar de quincena, situar el día móvil en "hoy" si es laborable; si no, en el primer día
    const todayStr = formatDateLocal(new Date());
    const todayIndex = laborables.findIndex(d => formatDateLocal(d) === todayStr);
    const initialIndex = todayIndex >= 0 ? todayIndex : 0;
    setMobileSelectedDayIndex(initialIndex);
    setMobileSelectedWeek(initialIndex < 6 ? 0 : 1);
  }, [startDate]);

  // Cargar servicios en caliente cuando cambie la quincena (startDate)
  useEffect(() => {
    refreshServicios();
  }, [startDate]);


  // Actualizar los servicios locales si cambian los iniciales
  useEffect(() => {
    setServicios(initialServicios);
  }, [initialServicios]);

  // Detectar dispositivo táctil (una sola vez al montar)
  useEffect(() => {
    const detect = () => {
      setIsTouchDevice(
        window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window
      );
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  // Estado para la franja horaria actual (franja amarilla y línea roja móvil)
  const [currentBlock, setCurrentBlock] = useState<{ left: string; width: string } | null>(null);

  useEffect(() => {
    const updateCurrentBlock = () => {
      const now = new Date();
      
      // Comprobar si el día de hoy está en el rango visible
      const todayStr = formatDateLocal(now);
      const isTodayVisible = days.some(d => formatDateLocal(d) === todayStr);
      
      if (!isTodayVisible) {
        setCurrentBlock(null);
        return;
      }
      
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Rango de la jornada: 08:00 a 21:00 (13 horas)
      if (hours < 8 || hours >= 21) {
        setCurrentBlock(null);
        return;
      }
      
      // Determinar en qué bloque de 30 minutos cae
      const startMin = minutes < 30 ? '00' : '30';
      const endMin = minutes < 30 ? '30' : '00';
      
      const startHour = String(hours).padStart(2, '0');
      const endHour = minutes < 30 ? startHour : String(hours + 1).padStart(2, '0');
      
      const timeStart = `${startHour}:${startMin}`;
      const timeEnd = `${endHour}:${endMin}`;
      
      const startPct = timeToPercent(timeStart);
      const endPct = timeToPercent(timeEnd);
      const widthPct = endPct - startPct;
      
      setCurrentBlock({
        left: `${startPct}%`,
        width: `${widthPct}%`
      });
    };

    updateCurrentBlock();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(updateCurrentBlock, 30000);
    return () => clearInterval(interval);
  }, [days]);

  // Estado para guardar la selección activa (antes de abrir el modal)
  const [selectedRange, setSelectedRange] = useState<{ date: string; horaIni: string; horaFin: string } | null>(null);

  // Listener para limpiar la selección si el usuario hace clic fuera o presiona Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Si el clic no fue dentro del planning grid, deseleccionar
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedRange(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedRange(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
  const timeToMinutes = (timeStr: string | null) => {
    if (!timeStr) return 0;
    const [hStr, mStr] = timeStr.split(':');
    return parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  };

  // Convertir hora de HH:MM:SS o HH:MM a porcentaje dentro de la jornada 08:00-21:00
  const timeToPercent = (timeStr: string | null) => {
    const minutes = timeToMinutes(timeStr);
    const startMinutes = 8 * 60;
    const totalJornada = 13 * 60;
    const diff = minutes - startMinutes;
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

  // --- LOGICA DE SELECCIÓN DE FRANJA (DRAG EN RATÓN / TAP EN TÁCTIL) ---

  // Selecciona una franja fija de 30 minutos a partir de una celda (modo táctil)
  const selectCellRange = (dateStr: string, hourStr: string) => {
    const idx = HOURS_RANGE.indexOf(hourStr);
    const nextIdx = idx + 1 < HOURS_RANGE.length ? idx + 1 : idx;
    setSelectedRange({
      date: dateStr,
      horaIni: HOURS_RANGE[idx],
      horaFin: HOURS_RANGE[nextIdx]
    });
  };

  const handleCellMouseDown = (dateStr: string, hourStr: string) => {
    // En táctil no iniciamos drag para no interferir con el scroll horizontal
    if (isTouchDevice) return;
    setIsDragging(true);
    setDragStart({ date: dateStr, hour: hourStr });
    setDragEnd({ date: dateStr, hour: hourStr });
  };

  const handleCellMouseEnter = (dateStr: string, hourStr: string) => {
    if (!isDragging || !dragStart || isTouchDevice) return;
    if (dateStr === dragStart.date) {
      setDragEnd({ date: dateStr, hour: hourStr });
    }
  };

  const handleCellMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || isTouchDevice) return;
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

    // En lugar de abrir el modal de inmediato, guardamos la selección
    setSelectedRange({
      date: dragStart.date,
      horaIni,
      horaFin
    });

    setDragStart(null);
    setDragEnd(null);
  };

  // En táctil un simple tap en una celda selecciona esa media hora
  const handleCellClick = (dateStr: string, hourStr: string) => {
    if (!isTouchDevice) return;
    selectCellRange(dateStr, hourStr);
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

  // Comprobar si una celda está en el rango de selección estática guardada
  const isRangeSelected = (dateStr: string, hourStr: string) => {
    if (!selectedRange || dateStr !== selectedRange.date) return false;
    
    const hStartIdx = HOURS_RANGE.indexOf(selectedRange.horaIni);
    const hEndIdx = HOURS_RANGE.indexOf(selectedRange.horaFin);
    const cellIdx = HOURS_RANGE.indexOf(hourStr);
    
    return cellIdx >= hStartIdx && cellIdx < hEndIdx;
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

  // --- HELPERS PARA VISTA MÓVIL DE DÍA ---

  // Días de la semana actualmente visible (6 días laborables)
  const currentWeekDays = mobileSelectedWeek === 0
    ? mobileDays.slice(0, 6)
    : mobileDays.slice(6, 12);

  const selectedDay = currentWeekDays[mobileSelectedDayIndex] || currentWeekDays[0];
  const selectedDayStr = selectedDay ? formatDateLocal(selectedDay) : '';

  const navigateDay = (direction: 'prev' | 'next') => {
    setMobileSelectedDayIndex(prev => {
      const next = direction === 'prev' ? prev - 1 : prev + 1;
      // Limitar al rango de la semana seleccionada (0..5)
      const minIndex = 0;
      const maxIndex = currentWeekDays.length - 1;
      return Math.max(minIndex, Math.min(maxIndex, next));
    });
  };

  const handleWeekChange = (weekIndex: number) => {
    setMobileSelectedWeek(weekIndex);
    setMobileSelectedDayIndex(0);
  };

  const handleMobileCellClick = (hourStr: string) => {
    selectCellRange(selectedDayStr, hourStr);
  };

  const getMobileEventStyle = (s: any) => {
    const startMin = timeToMinutes(s.hora_entrega_ini);
    const endMin = timeToMinutes(s.hora_entrega_fin);
    const startPct = timeToPercent(s.hora_entrega_ini);
    const durationMin = Math.max(15, endMin - startMin);
    const totalJornada = 13 * 60;
    const heightPct = Math.max(2, (durationMin / totalJornada) * 100);

    return {
      top: `${startPct}%`,
      height: `${heightPct}%`
    };
  };

  return (
    <div className="space-y-6 font-sans relative" ref={containerRef}>
      
      {/* Cabecera / Controles del Planning */}
      <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Selector de Operario / Técnico */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-primary/5 border border-primary/20 text-primary rounded-lg">
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white w-full sm:w-auto justify-between sm:justify-start">
            <button 
              onClick={() => navigateTime('prev')}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200 cursor-pointer flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700 px-4 min-w-[140px] text-center flex-1 sm:flex-none">
              {getFormatDateTitle()}
            </span>
            <button 
              onClick={() => navigateTime('next')}
              className="p-2 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer flex-shrink-0"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1 rounded-xl w-full sm:w-auto justify-center sm:justify-start">
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

        {/* VISTA ESCRITORIO: timeline quincenal con scroll horizontal */}
        <div className="hidden lg:block">

        {/* Wrapper de scroll horizontal: en tablet se desliza para ver todas las horas.
            La columna de día queda fija (sticky) mientras se desliza. */}
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">

        {/* Cabecera de Horas (Eje X) */}
        <div className="flex border-b border-slate-200 bg-slate-900 text-white select-none">
          <div className="w-28 flex-shrink-0 p-3 border-r border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center sticky left-0 z-20 bg-slate-900">
            Día / Rango
          </div>
          <div className="flex-1 flex text-[9px] font-bold select-none py-1 bg-slate-900">
            {HOURS_RANGE.map(hour => {
              const isWholeHour = hour.endsWith(':00');
              return (
                <div 
                  key={hour} 
                  className="flex-1 text-center flex flex-col justify-center border-r border-slate-800/30 last:border-0"
                >
                  <span className="leading-tight text-white font-black">
                    {isWholeHour ? parseInt(hour.split(':')[0], 10) : ''}
                  </span>
                  <span className={`text-[7.5px] leading-tight font-bold ${isWholeHour ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isWholeHour ? '00' : '30'}
                  </span>
                </div>
              );
            })}
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
                  
                  {/* Franja horaria y línea roja de hora actual (guía vertical) */}
                  {currentBlock && (
                    <div 
                      className="absolute top-0 bottom-0 bg-yellow-100/35 pointer-events-none z-0 border-l border-red-500/90"
                      style={{
                        left: currentBlock.left,
                        width: currentBlock.width
                      }}
                    />
                  )}

                  {HOURS_RANGE.map((hour) => {
                    const isSel = isCellSelected(dateStr, hour) || isRangeSelected(dateStr, hour);
                    return (
                      <div
                        key={hour}
                        onMouseDown={() => handleCellMouseDown(dateStr, hour)}
                        onMouseEnter={() => handleCellMouseEnter(dateStr, hour)}
                        onMouseUp={handleCellMouseUp}
                        onClick={() => handleCellClick(dateStr, hour)}
                        className={`flex-1 last:border-0 transition-all touch-pan-x ${
                          hour.endsWith(':00')
                            ? 'border-r border-dashed border-slate-200/40 bg-white'
                            : 'border-r border-slate-300 bg-white'
                        } ${
                          isSel
                            ? '!bg-primary/15 !border-primary/30'
                            : 'hover:bg-primary/90/5'
                        }`}
                      />
                    );
                  })}

                  {/* Botón flotante para confirmar la creación del servicio (guía y acción unificada) */}
                  {selectedRange && selectedRange.date === dateStr && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()} // Evitar arrastre sobre el botón
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalInitialData({
                          fecha: selectedRange.date,
                          horaIni: selectedRange.horaIni,
                          horaFin: selectedRange.horaFin
                        });
                        setSelectedServicioId(null);
                        setIsModalOpen(true);
                        setSelectedRange(null); // Limpiar selección tras abrir
                      }}
                      className="absolute z-30 bg-primary hover:bg-primary/90 active:bg-primary-dark text-white rounded-full px-3 py-1 text-[10px] font-bold shadow-lg shadow-primary/30 flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer top-1/2 -translate-y-1/2 select-none border border-primary/40"
                      style={{
                        left: `${(timeToPercent(selectedRange.horaIni) + timeToPercent(selectedRange.horaFin)) / 2}%`,
                        transform: 'translate(-50%, -50%)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>+ Crear orden</span>
                    </button>
                  )}

                  {/* Renderizado de Bloques de Servicio Posicionados Absolutamente */}
                  {dayEvents.map((s) => {
                    const pos = getEventPosition(s);
                    // Obtener color base
                    let baseColor = s.tipos_servicios?.color || '#003366';
                    
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
                      baseColor = '#003366'; // Forzar a azul agradable
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
                        onTouchStart={(e) => {
                          // En táctil abrimos el modal directamente al tocar un bloque
                          if (isTouchDevice) {
                            e.preventDefault();
                            handleEventClick(s);
                          }
                        }}
                        className="absolute h-8 top-2 text-white rounded-lg flex items-center px-2.5 text-xs font-bold shadow-md cursor-pointer transition-all hover:brightness-105 active:scale-[0.98] select-none z-10 border touch-manipulation"
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

        </div>{/* /vista escritorio */}

        {/* VISTA MÓVIL/TABLET VERTICAL: día individual con tira de días arriba */}
        <div className="lg:hidden flex flex-col">

          {/* Tira de días de la quincena */}
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60">
              <button
                type="button"
                onClick={() => navigateDay('prev')}
                disabled={mobileSelectedDayIndex <= 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-slate-800">
                  {selectedDay && selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                {/* Selector de semana para saltar rápido dentro de la quincena */}
                <select
                  value={mobileSelectedWeek}
                  onChange={(e) => handleWeekChange(Number(e.target.value))}
                  className="mt-0.5 text-[10px] font-bold text-slate-500 bg-transparent border-0 focus:outline-none cursor-pointer text-center"
                >
                  {mobileDays.length >= 6 && (
                    <option value={0}>
                      Semana 1 · {mobileDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {mobileDays[Math.min(5, mobileDays.length - 1)].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </option>
                  )}
                  {mobileDays.length > 6 && (
                    <option value={1}>
                      Semana 2 · {mobileDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {mobileDays[mobileDays.length - 1].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </option>
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={() => navigateDay('next')}
                disabled={mobileSelectedDayIndex >= currentWeekDays.length - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex overflow-x-auto px-2 py-3 gap-2">
              {currentWeekDays.map((date, idx) => {
                const isSelected = idx === mobileSelectedDayIndex;
                const isToday = formatDateLocal(date) === formatDateLocal(new Date());
                const weekday = date.toLocaleDateString('es-ES', { weekday: 'narrow' });
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMobileSelectedDayIndex(idx)}
                    className={`flex-1 min-w-[2.75rem] h-14 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
                    } ${isToday && !isSelected ? 'ring-2 ring-primary/30' : ''}`}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-90">{weekday}</span>
                    <span className="text-lg leading-none">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid vertical del día seleccionado */}
          <div className="relative flex-1 min-h-[540px]">
            <div className="absolute inset-0 flex">
              {/* Eje de horas */}
              <div className="w-14 flex-shrink-0 border-r border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 select-none flex flex-col">
                {HOURS_RANGE.filter(h => h.endsWith(':00')).map(hour => (
                  <div key={hour} className="flex-1 flex items-start justify-center pt-1">
                    {hour.split(':')[0]}
                  </div>
                ))}
              </div>

              {/* Área de celdas + eventos */}
              <div className="flex-1 relative flex flex-col">
                {/* Líneas horarias de fondo */}
                {HOURS_RANGE.filter(h => h.endsWith(':00')).map(hour => (
                  <div key={hour} className="flex-1 border-b border-slate-200/60" />
                ))}

                {/* Franja horaria actual (solo si es el día de hoy) */}
                {currentBlock && formatDateLocal(new Date()) === selectedDayStr && (
                  <div
                    className="absolute left-0 right-0 bg-yellow-100/35 pointer-events-none z-0 border-t border-red-500/90"
                    style={{
                      top: currentBlock.left,
                      height: currentBlock.width
                    }}
                  />
                )}

                {/* Celdas clicables de media hora */}
                <div className="absolute inset-0 flex flex-col">
                  {HOURS_RANGE.map((hour) => {
                    const isSel = isRangeSelected(selectedDayStr, hour);
                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleMobileCellClick(hour)}
                        className={`flex-1 w-full border-b border-slate-200/40 transition-colors ${
                          isSel ? 'bg-primary/15' : 'hover:bg-primary/5'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Botón flotante para crear orden */}
                {selectedRange && selectedRange.date === selectedDayStr && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalInitialData({
                        fecha: selectedRange.date,
                        horaIni: selectedRange.horaIni,
                        horaFin: selectedRange.horaFin
                      });
                      setSelectedServicioId(null);
                      setIsModalOpen(true);
                      setSelectedRange(null);
                    }}
                    className="absolute z-30 bg-primary hover:bg-primary/90 active:bg-primary-dark text-white rounded-full px-3 py-1.5 text-[10px] font-bold shadow-lg shadow-primary/30 flex items-center gap-1 transition-all active:scale-95 select-none border border-primary/40"
                    style={{
                      top: `${timeToPercent(selectedRange.horaIni)}%`,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>+ Crear orden</span>
                  </button>
                )}

                {/* Bloques de servicio del día */}
                {selectedDay && servicios
                  .filter(s =>
                    s.fecha_entrega === selectedDayStr &&
                    (activeEmpleadoId === null ? s.empleado_id === null : s.empleado_id === activeEmpleadoId)
                  )
                  .map((s) => {
                    let baseColor = s.tipos_servicios?.color || '#003366';
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
                    if (isDark) baseColor = '#003366';
                    const pos = getMobileEventStyle(s);

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleEventClick(s)}
                        className="absolute left-1 right-1 rounded-lg flex flex-col justify-center px-2 text-left text-white text-[10px] font-bold shadow-md active:scale-[0.98] transition-transform z-10 border touch-manipulation overflow-hidden"
                        style={{
                          top: pos.top,
                          height: pos.height,
                          backgroundColor: baseColor,
                          borderColor: `${baseColor}cc`,
                          textShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {s.incidencias && <AlertTriangle size={10} className="text-white flex-shrink-0 animate-pulse" />}
                          <span className="truncate">{s.nombre_cliente}</span>
                        </div>
                        <span className="opacity-90 text-[9px] font-medium truncate">
                          {s.hora_entrega_ini?.slice(0, 5)} - {s.hora_entrega_fin?.slice(0, 5)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

        </div>{/* /vista móvil */}

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
