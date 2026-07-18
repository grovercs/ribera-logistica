import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  PlusCircle, 
  ArrowRight,
  User,
  Wrench
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Interceptar instaladores y redirigirlos a su historial de servicios
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profile?.rol !== 'Administrador' && profile?.rol !== 'Coordinador') {
      redirect('/mis-servicios');
    }
  }
  
  // 1. Obtener estadísticas de servicios agrupados por estado
  const { data: serviciosData } = await supabase
    .from('servicios')
    .select('estado_id, estados(nombre)');

  const pendientes = serviciosData?.filter(s => (s.estados as any)?.nombre === 'Pendiente' || (s.estados as any)?.nombre === 'Aplazado').length || 0;
  const enCurso = serviciosData?.filter(s => (s.estados as any)?.nombre === 'En curso').length || 0;
  const terminados = serviciosData?.filter(s => (s.estados as any)?.nombre === 'Terminado' || (s.estados as any)?.nombre === 'Facturado/Cerrado').length || 0;

  // 2. Obtener la agenda del día de hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: dailyAgenda } = await supabase
    .from('servicios')
    .select(`
      id, 
      codigo_servicio, 
      nombre_cliente, 
      hora_entrega_ini, 
      hora_entrega_fin, 
      estados(nombre), 
      empleados(nombre)
    `)
    .eq('fecha_entrega', todayStr)
    .limit(5);

  // 3. Obtener los servicios agregados recientemente
  const { data: recientes } = await supabase
    .from('servicios')
    .select(`
      id, 
      codigo_servicio, 
      nombre_cliente, 
      creado_en, 
      estados(nombre), 
      tipos_servicios(nombre)
    `)
    .order('creado_en', { ascending: false })
    .limit(5);

  // Formatear hora de forma amigable (HH:MM)
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  return (
    <div className="space-y-8 font-sans max-w-7xl mx-auto">
      
      {/* Sección de Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Principal</h1>
          <p className="text-slate-500 text-sm">Resumen operativo del sistema de logística.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/planning"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
          >
            <Calendar size={16} />
            <span>Abrir Planning</span>
          </Link>
          <Link
            href="/servicios?nuevo=true"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all"
          >
            <PlusCircle size={16} />
            <span>Nuevo Servicio</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Estadísticas / KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KPI Pendientes */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pendientes / Aplazados</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{pendientes}</p>
            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              Requieren asignación
            </span>
          </div>
        </div>

        {/* KPI En Proceso */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">En Curso</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{enCurso}</p>
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              Operarios en campo
            </span>
          </div>
        </div>

        {/* KPI Terminados */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Finalizados / Cerrados</p>
            <p className="text-3xl font-black text-slate-800 mt-1">{terminados}</p>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              Listos para facturación
            </span>
          </div>
        </div>

      </section>

      {/* Contenido Secundario en Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Servicios Recientes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Servicios Recientes</h2>
              <Link href="/servicios" className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1 transition-colors">
                <span>Ver todos</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Tipo Servicio</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {!recientes || recientes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-normal italic">
                        No hay servicios recientes registrados.
                      </td>
                    </tr>
                  ) : (
                    recientes.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{s.codigo_servicio}</td>
                        <td className="px-6 py-4 truncate max-w-[200px]">{s.nombre_cliente}</td>
                        <td className="px-6 py-4 text-xs">{(s.tipos_servicios as any)?.nombre || 'General'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (s.estados as any)?.nombre === 'Terminado' || (s.estados as any)?.nombre === 'Facturado/Cerrado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (s.estados as any)?.nombre === 'En curso'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : (s.estados as any)?.nombre === 'Pendiente'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {(s.estados as any)?.nombre || 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Agenda de Hoy */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              <span>Intervenciones de Hoy</span>
            </h2>
            
            <div className="space-y-4">
              {!dailyAgenda || dailyAgenda.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No hay intervenciones programadas para hoy.
                </div>
              ) : (
                dailyAgenda.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex gap-4 border-l-2 border-blue-500 pl-4 py-1"
                  >
                    <div className="flex flex-col min-w-[50px]">
                      <span className="text-xs font-black text-slate-800">
                        {formatTime(item.hora_entrega_ini)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {formatTime(item.hora_entrega_fin)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={item.nombre_cliente}>
                        {item.nombre_cliente}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-semibold">
                        <span className="flex items-center gap-0.5">
                          <User size={10} />
                          {(item.empleados as any)?.nombre || 'Sin técnico'}
                        </span>
                        <span className="flex items-center gap-0.5 text-blue-600">
                          <Wrench size={10} />
                          {item.codigo_servicio}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link 
              href="/planning" 
              className="w-full mt-6 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver en Calendario</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
