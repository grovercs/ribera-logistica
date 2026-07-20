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
 * Criterio clásico de la agenda Delphi:
 *   - Anulado: gris plata, tachado
 *   - Terminado / Facturado-Cerrado: verde
 *   - Hoy o atrasado: rojo
 *   - Mañana: naranja/ámbar
 *   - Esta semana: amarillo claro
 *   - Resto: blanco
 */
export function getServicioColorClass(s: any, hoy: Date = new Date()): ServicioColor {
  const hoyNormalizado = new Date(hoy);
  hoyNormalizado.setHours(0, 0, 0, 0);

  const estadoNombre = s?.estados?.nombre;

  // Anulado
  if (estadoNombre === 'Anulado') {
    return {
      bg: 'bg-slate-200',
      border: 'border-slate-300',
      text: 'text-slate-700',
      badge: '#94a3b8',
      iconBg: 'bg-slate-400',
      iconText: 'text-white',
      label: 'Anulado'
    };
  }

  // Terminado o Facturado/Cerrado
  if (estadoNombre === 'Terminado' || estadoNombre === 'Facturado/Cerrado') {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      badge: '#10b981',
      iconBg: 'bg-emerald-500',
      iconText: 'text-white',
      label: estadoNombre === 'Terminado' ? 'Terminado' : 'Facturado/Cerrado'
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
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-950',
      badge: '#ef4444',
      iconBg: 'bg-red-500',
      iconText: 'text-white',
      label: 'Hoy o atrasado'
    };
  }

  // Mañana
  if (fechaEntrega.getTime() === manana.getTime()) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-950',
      badge: '#f59e0b',
      iconBg: 'bg-amber-500',
      iconText: 'text-white',
      label: 'Mañana'
    };
  }

  // Esta semana
  if (fechaEntrega >= lunesEstaSemana && fechaEntrega <= domingoEstaSemana) {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-950',
      badge: '#eab308',
      iconBg: 'bg-yellow-500',
      iconText: 'text-white',
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
