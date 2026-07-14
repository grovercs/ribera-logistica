'use client';

import React, { useState } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Phone, UserPlus, Settings, Building2, Store } from 'lucide-react';
import { guardarEmpleado, toggleEmpleadoActivo } from '@/app/(dashboard)/configuracion/actions';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Empleado {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
}

interface Tienda {
  id: number;
  nombre: string;
}

interface ConfiguracionContainerProps {
  initialEmpleados: Empleado[];
  initialTiendas: Tienda[];
}

export default function ConfiguracionContainer({ initialEmpleados, initialTiendas }: ConfiguracionContainerProps) {
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'tiendas'>('tecnicos');
  const [empleados, setEmpleados] = useState<Empleado[]>(initialEmpleados);
  const [tiendas, setTiendas] = useState<Tienda[]>(initialTiendas);

  // Modal de Técnico State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState('Nuevo Técnico');
  const [empId, setEmpId] = useState<number | undefined>(undefined);
  const [empNombre, setEmpNombre] = useState('');
  const [empTelefono, setEmpTelefono] = useState('');
  const [empActivo, setEmpActivo] = useState(true);

  // Técnico pendiente de (des)activar, esperando confirmación del usuario
  const [pendingToggle, setPendingToggle] = useState<Empleado | null>(null);
  const [toggling, setToggling] = useState(false);

  // Refrescar lista de operarios
  const refreshList = async () => {
    const supabase = require('@/lib/supabase/client').createClient();
    const { data: emps } = await supabase.from('empleados').select('*').order('nombre');
    if (emps) setEmpleados(emps);
  };

  const handleCreate = () => {
    setEmpId(undefined);
    setEmpNombre('');
    setEmpTelefono('');
    setEmpActivo(true);
    setModalTitle('Registrar Nuevo Técnico');
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Empleado) => {
    setEmpId(emp.id);
    setEmpNombre(emp.nombre);
    setEmpTelefono(emp.telefono || '');
    setEmpActivo(emp.activo);
    setModalTitle('Editar Datos del Técnico');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNombre.trim()) {
      alert("Por favor, introduce el nombre.");
      return;
    }

    setLoading(true);
    const res = await guardarEmpleado({
      id: empId,
      nombre: empNombre,
      telefono: empTelefono || null,
      activo: empActivo
    });
    setLoading(false);

    if (res.success) {
      await refreshList();
      setIsModalOpen(false);
    } else {
      alert(`Error al guardar: ${res.error}`);
    }
  };

  const handleToggleActivo = async () => {
    if (!pendingToggle) return;

    setToggling(true);
    const res = await toggleEmpleadoActivo(pendingToggle.id, pendingToggle.activo);
    setToggling(false);

    if (res.success) {
      setPendingToggle(null);
      await refreshList();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Menú de Configuración Lateral */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-fit">
        <div className="p-4 bg-slate-900 text-white flex items-center gap-2">
          <Settings size={16} />
          <h2 className="text-xs font-bold uppercase tracking-wider">Configuración</h2>
        </div>
        <div className="divide-y divide-slate-100 flex flex-col">
          <button
            onClick={() => setActiveTab('tecnicos')}
            className={`w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === 'tecnicos'
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserPlus size={15} />
            <span>Técnicos (Operarios)</span>
          </button>
          <button
            onClick={() => setActiveTab('tiendas')}
            className={`w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === 'tiendas'
                ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store size={15} />
            <span>Tiendas / Almacenes</span>
          </button>
        </div>
      </div>

      {/* Contenido Activo */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* PESTAÑA TÉCNICOS */}
        {activeTab === 'tecnicos' && (
          <div className="space-y-4">
            
            {/* Cabecera / Acciones */}
            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catálogo de Técnicos</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Administra el personal que realiza las entregas e instalaciones.</p>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-600/10 cursor-pointer transition-all"
              >
                <Plus size={14} />
                <span>Nuevo Técnico</span>
              </button>
            </div>

            {/* Tabla de Técnicos */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 w-16 text-center">ID</th>
                      <th className="px-5 py-3.5">Nombre del Técnico</th>
                      <th className="px-5 py-3.5 w-44">Teléfono</th>
                      <th className="px-5 py-3.5 w-28 text-center">Estado</th>
                      <th className="px-5 py-3.5 w-24 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                    {empleados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                          -- No hay técnicos registrados --
                        </td>
                      </tr>
                    ) : (
                      empleados.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-center text-slate-400 font-mono font-bold">{emp.id}</td>
                          <td className="px-5 py-3.5 text-slate-900 font-bold text-sm">{emp.nombre}</td>
                          <td className="px-5 py-3.5">
                            {emp.telefono ? (
                              <div className="flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400" />
                                <span>{emp.telefono}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-normal italic">--</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setPendingToggle(emp)}
                              className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase flex items-center justify-center gap-1.5 w-24 mx-auto cursor-pointer transition-all border ${
                                emp.activo
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-red-50 text-red-500 border-red-100'
                              }`}
                            >
                              {emp.activo ? (
                                <>
                                  <CheckCircle2 size={10} />
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={10} />
                                  <span>Inactivo</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleEdit(emp)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg transition-all cursor-pointer inline-flex"
                              title="Editar datos"
                            >
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* PESTAÑA TIENDAS */}
        {activeTab === 'tiendas' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Catálogo de Tiendas / Almacenes</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Listado de puntos de venta y centros logísticos del sistema.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5 w-16 text-center">ID</th>
                      <th className="px-5 py-3.5">Nombre de la Tienda / Almacén</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                    {tiendas.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-center text-slate-400 font-mono font-bold">{t.id}</td>
                        <td className="px-5 py-3.5 text-slate-900 font-bold text-sm">{t.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal Técnico (Editar/Crear) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
              <UserPlus size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold">{modalTitle}</h3>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 flex-1">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Nombre del Técnico</label>
                <input
                  type="text"
                  value={empNombre}
                  onChange={(e) => setEmpNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. GABY"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={empTelefono}
                  onChange={(e) => setEmpTelefono(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. +34 600 000 000"
                />
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  id="empActivo"
                  checked={empActivo}
                  onChange={(e) => setEmpActivo(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="empActivo" className="cursor-pointer">Técnico activo para asignaciones de órdenes</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Técnico'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Diálogo de confirmación para (des)activar un técnico */}
      <ConfirmDialog
        open={pendingToggle !== null}
        title={pendingToggle?.activo ? 'Desactivar técnico' : 'Activar técnico'}
        message={
          pendingToggle?.activo
            ? `¿Seguro que deseas DESACTIVAR a ${pendingToggle.nombre}? Dejará de aparecer en las asignaciones de órdenes (las órdenes ya asignadas no se modifican).`
            : `¿Deseas volver a ACTIVAR a ${pendingToggle?.nombre || ''}? Volverá a estar disponible para asignaciones.`
        }
        confirmText={pendingToggle?.activo ? 'Desactivar' : 'Activar'}
        variant={pendingToggle?.activo ? 'danger' : 'primary'}
        loading={toggling}
        onConfirm={handleToggleActivo}
        onCancel={() => { if (!toggling) setPendingToggle(null); }}
      />

    </div>
  );
}
