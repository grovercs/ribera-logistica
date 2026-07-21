'use client';

import React, { useState } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Phone, UserPlus, Settings, Store, Euro, Landmark, Building2, KeyRound, Mail, ShieldCheck, Send, Save, Users, Shield, UserCog } from 'lucide-react';
import { guardarEmpleado, toggleEmpleadoActivo, crearAccesoUsuario, obtenerConfiguracionCorreo, guardarConfiguracionCorreo, probarConfiguracionCorreo, ConfiguracionCorreoInput, obtenerPerfilesUsuarios, actualizarRolUsuario, toggleActivoUsuario } from '@/app/(dashboard)/configuracion/actions';
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

interface ConfiguracionCorreo {
  id?: number;
  remitente_email: string;
  remitente_nombre: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
}

interface PerfilUsuario {
  id: string;
  email: string;
  nombre: string | null;
  telefono: string | null;
  rol: string;
  activo: boolean;
  creado_en: string;
  empleados?: { id: number; nombre: string }[] | null;
}

interface ConfiguracionContainerProps {
  initialEmpleados: Empleado[];
  initialTiendas: Tienda[];
  initialConfigCorreo: ConfiguracionCorreo | null;
  initialPerfiles: PerfilUsuario[];
}

export default function ConfiguracionContainer({ initialEmpleados, initialTiendas, initialConfigCorreo, initialPerfiles }: ConfiguracionContainerProps) {
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'tiendas' | 'correo' | 'usuarios'>('tecnicos');
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

  // Configuración de correo SMTP
  const [configCorreo, setConfigCorreo] = useState<ConfiguracionCorreo>(initialConfigCorreo || {
    remitente_email: '',
    remitente_nombre: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: ''
  });
  const [savingCorreo, setSavingCorreo] = useState(false);
  const [testingCorreo, setTestingCorreo] = useState(false);
  const [emailPrueba, setEmailPrueba] = useState('');

  // Gestión de usuarios y roles
  const [perfiles, setPerfiles] = useState<PerfilUsuario[]>(initialPerfiles);
  const [updatingRol, setUpdatingRol] = useState<string | null>(null);
  const [togglingUsuario, setTogglingUsuario] = useState<string | null>(null);

  const rolesDisponibles = ['Administrador', 'Coordinador', 'Operario', 'Consultivo', 'Instalador'];

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

  const handleSaveConfigCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCorreo(true);
    const res = await guardarConfiguracionCorreo(configCorreo);
    setSavingCorreo(false);

    if (res.success) {
      alert('Configuración de correo guardada correctamente.');
    } else {
      alert(`Error al guardar la configuración: ${res.error}`);
    }
  };

  const handleTestConfigCorreo = async () => {
    setTestingCorreo(true);
    const res = await probarConfiguracionCorreo(configCorreo, emailPrueba);
    setTestingCorreo(false);

    if (res.success) {
      alert(`Correo de prueba enviado correctamente a ${emailPrueba || configCorreo.remitente_email}.`);
    } else {
      alert(`Error al enviar el correo de prueba: ${res.error}`);
    }
  };

  const refreshPerfiles = async () => {
    const res = await obtenerPerfilesUsuarios();
    if (res.success && res.perfiles) {
      setPerfiles(res.perfiles as PerfilUsuario[]);
    }
  };

  const handleCambiarRol = async (perfilId: string, nuevoRol: string) => {
    if (!confirm(`¿Seguro que quieres cambiar el rol a "${nuevoRol}"?`)) return;
    setUpdatingRol(perfilId);
    const res = await actualizarRolUsuario(perfilId, nuevoRol);
    setUpdatingRol(null);

    if (res.success) {
      await refreshPerfiles();
    } else {
      alert(`Error al cambiar rol: ${res.error}`);
    }
  };

  const handleToggleUsuario = async (perfil: PerfilUsuario) => {
    const accion = perfil.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Seguro que quieres ${accion} la cuenta de ${perfil.email}?`)) return;
    setTogglingUsuario(perfil.id);
    const res = await toggleActivoUsuario(perfil.id, perfil.activo);
    setTogglingUsuario(null);

    if (res.success) {
      await refreshPerfiles();
    } else {
      alert(`Error al cambiar estado: ${res.error}`);
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
                ? 'bg-primary/5 text-primary border-l-4 border-primary'
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
                ? 'bg-primary/5 text-primary border-l-4 border-primary'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Store size={15} />
            <span>Tiendas / Almacenes</span>
          </button>
          <button
            onClick={() => setActiveTab('correo')}
            className={`w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === 'correo'
                ? 'bg-primary/5 text-primary border-l-4 border-primary'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Mail size={15} />
            <span>Envío de Correo</span>
          </button>
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
              activeTab === 'usuarios'
                ? 'bg-primary/5 text-primary border-l-4 border-primary'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users size={15} />
            <span>Usuarios y Roles</span>
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
                className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/10 cursor-pointer transition-all"
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
                              'bg-primary/5 text-primary border border-primary/20'
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
                                className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 hover:bg-primary/10 px-2.5 py-1 rounded-full transition-all cursor-pointer inline-flex items-center gap-1"
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

        {/* PESTAÑA ENVÍO DE CORREO */}
        {activeTab === 'correo' && (
          <form onSubmit={handleSaveConfigCorreo} className="space-y-4">

            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Configuración de Envío de Correo</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Datos del servidor SMTP y remitente para el envío de órdenes e incidencias.</p>
              </div>
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Mail size={18} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[10px] font-semibold text-amber-700">
              <span className="font-bold">Nota:</span> El puerto 587 utiliza STARTTLS; deja desmarcada la casilla “Conexión segura”. El puerto 465 requiere SSL/TLS.
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Dirección de Email (remitente)</label>
                  <input
                    type="email"
                    value={configCorreo.remitente_email}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, remitente_email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="ventas@vielhacomputer.com"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nombre del Remitente</label>
                  <input
                    type="text"
                    value={configCorreo.remitente_nombre}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, remitente_nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="BigMat Ribera"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Servidor SMTP</label>
                  <input
                    type="text"
                    value={configCorreo.smtp_host}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, smtp_host: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="smtp.1and1.es"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Puerto SMTP</label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={configCorreo.smtp_port}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, smtp_port: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="587"
                    required
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configCorreo.smtp_secure}
                      onChange={(e) => setConfigCorreo({ ...configCorreo, smtp_secure: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-semibold text-slate-700">Conexión segura (SSL/TLS)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Activar para puerto 465; desactivar para 587.</span>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Usuario SMTP</label>
                  <input
                    type="text"
                    value={configCorreo.smtp_user}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, smtp_user: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="ventas@vielhacomputer.com"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Contraseña SMTP</label>
                  <input
                    type="password"
                    value={configCorreo.smtp_pass}
                    onChange={(e) => setConfigCorreo({ ...configCorreo, smtp_pass: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck size={16} className="text-primary" />
                  <h4 className="text-xs font-bold">Comprobar configuración</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Email de prueba</label>
                    <input
                      type="email"
                      value={emailPrueba}
                      onChange={(e) => setEmailPrueba(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                      placeholder="correo@ejemplo.com (opcional; si está vacío se envía al remitente)"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleTestConfigCorreo}
                      disabled={testingCorreo}
                      className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {testingCorreo ? 'Comprobando...' : (
                        <>
                          <Send size={14} className="text-primary" />
                          <span>Enviar prueba</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingCorreo}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{savingCorreo ? 'Guardando...' : 'Guardar Configuración'}</span>
                </button>
              </div>
            </div>

          </form>
        )}

        {/* PESTAÑA USUARIOS Y ROLES */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">

            <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Usuarios y Roles de Acceso</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Gestiona quién puede acceder al sistema y qué permisos tiene.</p>
              </div>
              <div className="p-2 bg-primary/5 text-primary rounded-lg">
                <Shield size={18} />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[10px] font-semibold text-amber-700">
              <span className="font-bold">Nota:</span> Para crear una cuenta nueva, ve a la pestaña “Técnicos (Operarios)”, añade el email del técnico y pulsa “Crear Acceso”. Desde aquí solo puedes cambiar roles y activar/desactivar cuentas.
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Usuario</th>
                      <th className="px-5 py-3.5 w-40">Rol</th>
                      <th className="px-5 py-3.5 w-40">Técnico vinculado</th>
                      <th className="px-5 py-3.5 w-28 text-center">Estado</th>
                      <th className="px-5 py-3.5 w-28 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                    {perfiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                          -- No hay usuarios registrados --
                        </td>
                      </tr>
                    ) : (
                      perfiles.map((perfil) => (
                        <tr key={perfil.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-slate-900 font-bold text-sm">{perfil.email}</p>
                            {perfil.nombre && <p className="text-[10px] text-slate-400 font-medium">{perfil.nombre}</p>}
                          </td>
                          <td className="px-5 py-3.5">
                            <select
                              value={perfil.rol}
                              onChange={(e) => handleCambiarRol(perfil.id, e.target.value)}
                              disabled={updatingRol === perfil.id}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-primary transition-all disabled:opacity-50"
                            >
                              {rolesDisponibles.map((rol) => (
                                <option key={rol} value={rol}>{rol}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-3.5">
                            {perfil.empleados && perfil.empleados.length > 0 ? (
                              <span className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 px-2 py-1 rounded-full">
                                {perfil.empleados[0].nombre}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin vínculo</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1 border ${
                              perfil.activo
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-red-50 text-red-500 border-red-100'
                            }`}>
                              {perfil.activo ? <><CheckCircle2 size={10} /> <span>Activo</span></> : <><XCircle size={10} /> <span>Inactivo</span></>}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUsuario(perfil)}
                              disabled={togglingUsuario === perfil.id}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer disabled:opacity-50 ${
                                perfil.activo
                                  ? 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}
                            >
                              {togglingUsuario === perfil.id ? 'Procesando...' : (perfil.activo ? 'Desactivar' : 'Activar')}
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

      </div>

      {/* Modal Técnico (Editar/Crear) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center gap-2">
              <UserPlus size={16} className="text-primary/70" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                    placeholder="Ej. 600 000 000"
                  />
                </div>
              </div>

              {/* Sección Condicional: Empresa Externa o Autónomo */}
              {empTipo !== 'interno' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="ES21 0000 0000 0000 0000 0000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Configuración Financiera (Tarifa pactada por hora) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                  className="rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
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
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer shadow-lg shadow-primary/10 transition-all disabled:opacity-50"
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
              <KeyRound size={16} className="text-primary/70" />
              <h3 className="text-sm font-bold">Crear Cuenta de Acceso</h3>
            </div>

            <form onSubmit={handleCreateAccess} className="p-5 space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-primary-dark leading-normal">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary focus:bg-white transition-all"
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
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-xs font-bold cursor-pointer shadow-lg shadow-primary/10 transition-all disabled:opacity-50"
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
