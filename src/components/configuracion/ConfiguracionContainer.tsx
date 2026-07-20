'use client';

import React, { useState } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Phone, UserPlus, Settings, Store, Euro, Landmark, Building2, KeyRound } from 'lucide-react';
import { guardarEmpleado, toggleEmpleadoActivo, crearAccesoUsuario } from '@/app/(dashboard)/configuracion/actions';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Empleado {
  id: number;
  nombre: string;
  telefono: string | null;
  activo: boolean;
  tipo: string;
  razon_social: string | null;
  cif_nif: string | null;
  direccion_fiscal: string | null;
  tecnico_autorizado: string | null;
  email: string | null;
  iban: string | null;
  tarifa_hora: number | string;
  perfil_id?: string | null;
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
  
  // Estados formulario
  const [empId, setEmpId] = useState<number | undefined>(undefined);
  const [empNombre, setEmpNombre] = useState('');
  const [empTelefono, setEmpTelefono] = useState('');
  const [empActivo, setEmpActivo] = useState(true);
  const [empTipo, setEmpTipo] = useState('interno');
  const [empRazonSocial, setEmpRazonSocial] = useState('');
  const [empCifNif, setEmpCifNif] = useState('');
  const [empDireccionFiscal, setEmpDireccionFiscal] = useState('');
  const [empTecnicoAutorizado, setEmpTecnicoAutorizado] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empIban, setEmpIban] = useState('');
  const [empTarifaHora, setEmpTarifaHora] = useState<string>('0.00');

  // Modal de Crear Acceso
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedEmpForAccess, setSelectedEmpForAccess] = useState<Empleado | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [creatingAccess, setCreatingAccess] = useState(false);

  // Técnico pendiente de (des)activar, esperando confirmación del usuario
  const [pendingToggle, setPendingToggle] = useState<Empleado | null>(null);
  const [toggling, setToggling] = useState(false);

  // Refrescar lista de operarios
  const refreshList = async () => {
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();
    const { data: emps } = await supabase.from('empleados').select('*').order('nombre');
    if (emps) setEmpleados(emps);
  };

  const handleCreate = () => {
    setEmpId(undefined);
    setEmpNombre('');
    setEmpTelefono('');
    setEmpActivo(true);
    setEmpTipo('interno');
    setEmpRazonSocial('');
    setEmpCifNif('');
    setEmpDireccionFiscal('');
    setEmpTecnicoAutorizado('');
    setEmpEmail('');
    setEmpIban('');
    setEmpTarifaHora('0.00');
    setModalTitle('Registrar Nuevo Técnico');
    setIsModalOpen(true);
  };

  const handleEdit = (emp: Empleado) => {
    setEmpId(emp.id);
    setEmpNombre(emp.nombre);
    setEmpTelefono(emp.telefono || '');
    setEmpActivo(emp.activo);
    setEmpTipo(emp.tipo || 'interno');
    setEmpRazonSocial(emp.razon_social || '');
    setEmpCifNif(emp.cif_nif || '');
    setEmpDireccionFiscal(emp.direccion_fiscal || '');
    setEmpTecnicoAutorizado(emp.tecnico_autorizado || '');
    setEmpEmail(emp.email || '');
    setEmpIban(emp.iban || '');
    setEmpTarifaHora(Number(emp.tarifa_hora || 0).toFixed(2));
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
      activo: empActivo,
      tipo: empTipo,
      razon_social: empTipo !== 'interno' ? empRazonSocial || null : null,
      cif_nif: empTipo !== 'interno' ? empCifNif || null : null,
      direccion_fiscal: empTipo !== 'interno' ? empDireccionFiscal || null : null,
      tecnico_autorizado: empTipo !== 'interno' ? empTecnicoAutorizado || null : null,
      email: empTipo !== 'interno' ? empEmail || null : null,
      iban: empTipo !== 'interno' ? empIban || null : null,
      tarifa_hora: Number(empTarifaHora) || 0
    });
    setLoading(false);

    if (res.success) {
      await refreshList();
      setIsModalOpen(false);
    } else {
      alert(`Error al guardar: ${res.error}`);
    }
  };

  const handleOpenAccessModal = (emp: Empleado) => {
    setSelectedEmpForAccess(emp);
    setAccessPassword('');
    setIsAccessModalOpen(true);
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForAccess || !selectedEmpForAccess.email) return;
    if (accessPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCreatingAccess(true);
    const res = await crearAccesoUsuario(
      selectedEmpForAccess.id,
      selectedEmpForAccess.email,
      accessPassword,
      selectedEmpForAccess.nombre
    );
    setCreatingAccess(false);

    if (res.success) {
      alert(`Acceso creado correctamente para ${selectedEmpForAccess.nombre} (${selectedEmpForAccess.email}).`);
      setIsAccessModalOpen(false);
      await refreshList();
    } else {
      alert(`Error al crear acceso: ${res.error}`);
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
                <p className="text-[10px] text-slate-400 font-semibold">Administra técnicos de plantilla y empresas externas / autónomos colaboradores.</p>
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
                      <th className="px-5 py-3.5">Nombre</th>
                      <th className="px-5 py-3.5 w-32 text-center">Tipo</th>
                      <th className="px-5 py-3.5 w-36">Teléfono</th>
                      <th className="px-5 py-3.5 w-24 text-right">Tarifa/h</th>
                      <th className="px-5 py-3.5 w-28 text-center">Estado</th>
                      <th className="px-5 py-3.5 w-36 text-center">Usuario de Acceso</th>
                      <th className="px-5 py-3.5 w-24 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                    {empleados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400 italic">
                          -- No hay técnicos registrados --
                        </td>
                      </tr>
                    ) : (
                      empleados.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-center text-slate-400 font-mono font-bold">{emp.id}</td>
                          <td className="px-5 py-3.5">
                            <p className="text-slate-900 font-bold text-sm">{emp.nombre}</p>
                            {emp.tipo !== 'interno' && emp.razon_social && (
                              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{emp.razon_social}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              emp.tipo === 'empresa_externa' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                              emp.tipo === 'autonomo' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                              'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}>
                              {emp.tipo === 'empresa_externa' ? 'Empresa' : emp.tipo === 'autonomo' ? 'Autónomo' : 'Interno'}
                            </span>
                          </td>
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
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-800 text-sm">
                            {Number(emp.tarifa_hora || 0).toFixed(2)}€
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
                            {emp.perfil_id ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                                <CheckCircle2 size={10} />
                                <span>Con Acceso</span>
                              </span>
                            ) : emp.email ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAccessModal(emp)}
                                className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <UserPlus size={10} />
                                <span>Crear Acceso</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic font-medium">Sin email</span>
                            )}
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
              <UserPlus size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold">{modalTitle}</h3>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 flex-1 overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de Técnico */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo de Técnico</label>
                  <select
                    value={empTipo}
                    onChange={(e) => setEmpTipo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  >
                    <option value="interno">Técnico Interno (Plantilla)</option>
                    <option value="autonomo">Autónomo Colaborador</option>
                    <option value="empresa_externa">Empresa Externa Subcontratada</option>
                  </select>
                </div>

                {/* Nombre de Ficha / Técnico */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nombre de Ficha / Técnico *</label>
                  <input
                    type="text"
                    value={empNombre}
                    onChange={(e) => setEmpNombre(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="Ej. GABY o INST. JUAN"
                    required
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={empTelefono}
                    onChange={(e) => setEmpTelefono(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="Ej. 600 000 000"
                  />
                </div>
              </div>

              {/* Sección Condicional: Empresa Externa o Autónomo */}
              {empTipo !== 'interno' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} />
                    <span>Datos de Empresa / Facturación</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Razón Social */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Razón Social</label>
                      <input
                        type="text"
                        value={empRazonSocial}
                        onChange={(e) => setEmpRazonSocial(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Ej. Ribera Montajes S.L."
                      />
                    </div>

                    {/* DNI / CIF */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">CIF / NIF</label>
                      <input
                        type="text"
                        value={empCifNif}
                        onChange={(e) => setEmpCifNif(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Ej. B12345678"
                      />
                    </div>

                    {/* Técnico / Persona Autorizada */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Técnico Autorizado (Contacto)</label>
                      <input
                        type="text"
                        value={empTecnicoAutorizado}
                        onChange={(e) => setEmpTecnicoAutorizado(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Ej. Carlos Gámez"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Email de Facturación / Contacto</label>
                      <input
                        type="email"
                        value={empEmail}
                        onChange={(e) => setEmpEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Ej. facturas@empresa.com"
                      />
                    </div>

                    {/* Dirección Fiscal */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Dirección Fiscal</label>
                      <input
                        type="text"
                        value={empDireccionFiscal}
                        onChange={(e) => setEmpDireccionFiscal(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="Ej. Av. de la Ribera, 45, 2ºA, Lleida"
                      />
                    </div>

                    {/* IBAN */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block flex items-center gap-1"><Landmark size={10} /><span>Cuenta Bancaria (IBAN)</span></label>
                      <input
                        type="text"
                        value={empIban}
                        onChange={(e) => setEmpIban(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                        placeholder="ES21 0000 0000 0000 0000 0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración Financiera (Tarifa pactada por hora) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Euro size={12} />
                  <span>Configuración Financiera</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Tarifa por Hora Pactada (€/h)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={empTarifaHora}
                    onChange={(e) => setEmpTarifaHora(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Técnico Activo */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  id="empActivo"
                  checked={empActivo}
                  onChange={(e) => setEmpActivo(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="empActivo" className="cursor-pointer">Técnico activo para asignaciones de órdenes</label>
              </div>

              {/* Botones de Pie */}
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

      {/* Modal Crear Acceso Usuario */}
      {isAccessModalOpen && selectedEmpForAccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
              <KeyRound size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold">Crear Cuenta de Acceso</h3>
            </div>

            <form onSubmit={handleCreateAccess} className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-normal">
                <p className="font-bold">Asignación de credenciales:</p>
                <p className="mt-1">Se creará un usuario en Supabase Auth y se vinculará directamente a la ficha del técnico <strong>{selectedEmpForAccess.nombre}</strong>.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Usuario (Email)</label>
                <input
                  type="text"
                  value={selectedEmpForAccess.email || ''}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Contraseña de Acceso *</label>
                <input
                  type="password"
                  value={accessPassword}
                  onChange={(e) => setAccessPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                />
              </div>

              {/* Botones de Pie */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAccess}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50"
                >
                  {creatingAccess ? 'Creando Acceso...' : 'Crear Acceso'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
