import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MobileOrdenes = () => {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [lastActiveId, setLastActiveId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            // Obtener información del usuario autenticado
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id || null;

            if (!userId) {
                navigate('/m/login');
                return;
            }

            // Consultar el perfil del usuario (su rol y nombre en Ribera)
            const { data: profile, error: profileErr } = await supabase
                .from('perfiles')
                .select('nombre, rol')
                .eq('id', userId)
                .maybeSingle();

            if (profileErr || !profile) {
                console.error("Error al obtener perfil del usuario:", profileErr);
                // Si no hay perfil, forzar logout por seguridad
                await supabase.auth.signOut();
                navigate('/m/login');
                return;
            }

            const roleName = profile.rol || 'Instalador';
            setCurrentUserRole(roleName);
            setCurrentUserName(profile.nombre || userData?.user?.email?.split('@')[0] || 'Técnico');

            // Cargar servicios basados en su rol
            await fetchOrdenes(userId, roleName);

            // Obtener el último servicio activo visitado desde localStorage
            setLastActiveId(localStorage.getItem('last_active_order'));
            setLoading(false);
        };
        init();
    }, []);

    // Función para consultar las órdenes (servicios)
    const fetchOrdenes = async (userId: string, roleName: string) => {
        try {
            let query = supabase
                .from('servicios')
                .select('id, codigo_servicio, nombre_cliente, dest_direccion, dest_observaciones, creado_en, estado_id, estados(nombre)');

            // Si es un técnico/instalador, solo ve las órdenes asignadas a él
            if (roleName === 'Instalador' || roleName === 'Operario') {
                // 1. Obtener su ID de empleado vinculando por perfil_id
                const { data: empleado } = await supabase
                    .from('empleados')
                    .select('id')
                    .eq('perfil_id', userId)
                    .maybeSingle();

                if (empleado?.id) {
                    query = query.eq('empleado_id', empleado.id);
                } else {
                    // Si es instalador pero no tiene ficha de empleado vinculada, no mostrar nada
                    setOrdenes([]);
                    return;
                }
            }

            const { data, error } = await query.order('creado_en', { ascending: false });

            if (error) throw error;

            if (data) {
                // Mapear los datos de Supabase Ribera al formato esperado por la UI móvil
                const ordenesMapeadas = data.map((item: any) => ({
                    id: item.id,
                    id_legible: item.codigo_servicio,
                    cliente: item.nombre_cliente,
                    direccion: item.dest_direccion || 'Sin dirección registrada',
                    creado_en: item.creado_en,
                    estado: item.estados?.nombre || 'Pendiente',
                    con_notas: !!(item.dest_observaciones && item.dest_observaciones.trim().length > 0)
                }));
                setOrdenes(ordenesMapeadas);
            }
        } catch (error) {
            console.error("Error al obtener los servicios:", error);
        }
    };

    // Refrescar datos cuando la página vuelve a estar visible (al volver de un detalle)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [currentUserRole]);

    const refreshData = async () => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
            await fetchOrdenes(userId, currentUserRole);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('¿Cerrar sesión?')) {
            await supabase.auth.signOut();
            navigate('/m/login');
        }
    };

    return (
        <div className="pb-24 font-sans bg-[#f0f2f5] min-h-[100dvh]">
            {/* Cabecera de Usuario */}
            <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-black text-sm uppercase shrink-0 shadow-sm">
                        {currentUserName ? currentUserName.charAt(0) : '?'}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">
                            {currentUserName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{currentUserRole}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50"
                >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Salir
                </button>
            </div>

            <div className="p-4 space-y-4">
                <h2 className="text-xl font-bold text-slate-800 mt-2">Servicios Asignados</h2>
                
                {loading ? (
                    <div className="text-center text-slate-500 py-8">Cargando servicios...</div>
                ) : ordenes.length === 0 ? (
                    <div className="bg-white p-6 rounded-xl text-center text-slate-500 shadow-sm border border-slate-200">
                        No tienes servicios asignados.
                    </div>
                ) : (
                    ordenes.map(orden => {
                        const isLastActive = orden.id.toString() === lastActiveId;
                        return (
                            <Link 
                                to={`/m/ordenes/${orden.id}`} 
                                key={orden.id} 
                                className={`block bg-white rounded-xl shadow-sm border p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isLastActive ? 'border-primary border-l-[6px] ring-2 ring-primary/5 shadow-md' : 'border-slate-200'}`}
                            >
                                {isLastActive && (
                                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-tighter">
                                        RECIENTE
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-primary">{orden.id_legible}</span>
                                        {orden.con_notas && (
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded uppercase">
                                                Con notas
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                        orden.estado === 'Finalizado' || orden.estado === 'Terminado' ? 'bg-green-100 text-green-700' :
                                        orden.estado === 'En Curso' || orden.estado === 'Iniciado' ? 'bg-blue-100 text-blue-700' :
                                        orden.estado === 'Incidencia' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {orden.estado}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-800">{orden.cliente}</h3>
                                {orden.direccion && (
                                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                                        {orden.direccion}
                                    </p>
                                )}
                                <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span> 
                                    {new Date(orden.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MobileOrdenes;
