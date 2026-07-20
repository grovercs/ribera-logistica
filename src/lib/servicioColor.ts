export interface ServicioColor {
  bg: string;
  border: string;
  text: string;
  badge: string;
  iconBg: string;
  iconText: string;
  label: string;
}

/**
 * Devuelve el color visual de una orden de servicio según su estado y fecha de entrega.
 * Criterio clásico de la agenda Delphi con colores sólidos e intensos:
 *   - Anulado: gris plata, tachado
 *   - Terminado: verde
 *   - Facturado/Cerrado: azul corporativo
 *   - Hoy o atrasado: rojo
 *   - Mañana: naranja/ámbar
 *   - Esta semana: amarillo
 *   - Resto: blanco
 */
export function getServicioColorClass(s: any, hoy: Date = new Date()): ServicioColor {
  const hoyNormalizado = new Date(hoy);
  hoyNormalizado.setHours(0, 0, 0, 0);

  const estadoNombre = s?.estados?.nombre;

  // Anulado
  if (estadoNombre === 'Anulado') {
    return {
      bg: 'bg-slate-300',
      border: 'border-slate-400',
      text: 'text-slate-800',
      badge: '#94a3b8',
      iconBg: 'bg-slate-500',
      iconText: 'text-white',
      label: 'Anulado'
    };
  }

  // Terminado
  if (estadoNombre === 'Terminado') {
    return {
      bg: 'bg-emerald-500',
      border: 'border-emerald-600',
      text: 'text-white',
      badge: '#10b981',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700',
      label: 'Terminado'
    };
  }

  // Facturado/Cerrado
  if (estadoNombre === 'Facturado/Cerrado') {
    return {
      bg: 'bg-primary',
      border: 'border-primary-dark',
      text: 'text-white',
      badge: '#003366',
      iconBg: 'bg-primary/20',
      iconText: 'text-white',
      label: 'Facturado/Cerrado'
    };
  }

  if (!s?.fecha_entrega) {
    return {
      bg: 'bg-white',
      border: 'border-slate-200',
      text: 'text-slate-700',
      badge: '#94a3b8',
      iconBg: 'bg-slate-400',
      iconText: 'text-white',
      label: 'Sin fecha'
    };
  }

  const [year, month, day] = s.fecha_entrega.split('-').map(Number);
  const fechaEntrega = new Date(year, month - 1, day);
  fechaEntrega.setHours(0, 0, 0, 0);

  const manana = new Date(hoyNormalizado);
  manana.setDate(hoyNormalizado.getDate() + 1);

  const currentDay = hoyNormalizado.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const lunesEstaSemana = new Date(hoyNormalizado);
  lunesEstaSemana.setDate(hoyNormalizado.getDate() + diffToMonday);

  const domingoEstaSemana = new Date(lunesEstaSemana);
  domingoEstaSemana.setDate(lunesEstaSemana.getDate() + 6);

  // Hoy o atrasado
  if (fechaEntrega <= hoyNormalizado) {
    return {
      bg: 'bg-red-500',
      border: 'border-red-600',
      text: 'text-white',
      badge: '#ef4444',
      iconBg: 'bg-red-100',
      iconText: 'text-red-700',
      label: 'Hoy o atrasado'
    };
  }

  // Mañana
  if (fechaEntrega.getTime() === manana.getTime()) {
    return {
      bg: 'bg-amber-500',
      border: 'border-amber-600',
      text: 'text-white',
      badge: '#f59e0b',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-700',
      label: 'Mañana'
    };
  }

  // Esta semana
  if (fechaEntrega >= lunesEstaSemana && fechaEntrega <= domingoEstaSemana) {
    return {
      bg: 'bg-yellow-400',
      border: 'border-yellow-500',
      text: 'text-slate-900',
      badge: '#eab308',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-800',
      label: 'Esta semana'
    };
  }

  // Futuro
  return {
    bg: 'bg-white',
    border: 'border-slate-200',
    text: 'text-slate-700',
    badge: '#94a3b8',
    iconBg: 'bg-slate-400',
    iconText: 'text-white',
    label: 'Futuro'
  };
}
