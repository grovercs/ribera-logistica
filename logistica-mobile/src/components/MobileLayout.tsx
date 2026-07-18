import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MobileLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname === '/m/login';
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (!session && !isLoginPage) navigate('/m/login');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session && !isLoginPage) navigate('/m/login');
        });

        return () => subscription.unsubscribe();
    }, [navigate, isLoginPage]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center bg-slate-50 font-bold text-primary">Cargando...</div>;
    }

    if (!session && !isLoginPage) {
        return <Navigate to="/m/login" replace />;
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
            {/* Solo mostramos la barra superior móvil si no estamos en el login */}
            {!isLoginPage && (
                <header className="bg-primary text-white shadow-md sticky top-0 z-20">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[24px]">construction</span>
                            <h1 className="font-bold text-lg leading-none">Fernaguez</h1>
                        </div>
                        <button className="p-1 rounded-full hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-[24px]">menu</span>
                        </button>
                    </div>
                </header>
            )}

            {/* Contenido Principal Móvil */}
            <main className="flex-1 w-full bg-slate-50 dark:bg-slate-900 relative">
                <Outlet />
            </main>

            {/* Navegación Inferior (Opcional - solo para trabajadores logueados) */}
            {!isLoginPage && (
                <nav className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 z-20 pb-safe">
                    <div className="flex items-center justify-around px-2 py-2">
                        <button className="flex flex-col items-center gap-1 p-2 text-primary">
                            <span className="material-symbols-outlined text-[24px]">assignment</span>
                            <span className="text-[10px] font-semibold">Órdenes</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <span className="material-symbols-outlined text-[24px]">schedule</span>
                            <span className="text-[10px] font-semibold">Fichajes</span>
                        </button>
                        <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-red-500">
                            <span className="material-symbols-outlined text-[24px]">logout</span>
                            <span className="text-[10px] font-semibold">Salir</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
};

export default MobileLayout;
