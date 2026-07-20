'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  User, 
  Plus, 
  Trash2, 
  FileText, 
  MapPin, 
  Phone, 
  Save, 
  Trash,
  CheckCircle,
  AlertTriangle,
  Printer,
  Mail
} from 'lucide-react';
import {
  guardarServicio,
  eliminarServicio,
  buscarClientesCRM,
  obtenerSiguienteCodigoServicio,
  buscarPresupuestoCRM,
  obtenerPresupuestosClienteCRM
} from '@/app/(dashboard)/planning/actions';
import { enviarCorreoServicio } from '@/app/(dashboard)/correos/actions';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '../ui/ConfirmDialog';

interface CatalogoItem {
  id: number;
  nombre: string;
  color?: string | null;
}

interface EmpleadoItem {
  id: number;
  nombre: string;
  telefono: string | null;
}

interface Catalogos {
  tiendas: CatalogoItem[];
  estados: CatalogoItem[];
  tiposDocumentos: CatalogoItem[];
  tiposServicios: CatalogoItem[];
  empleados: EmpleadoItem[];
}

interface Material {
  id?: number;
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  total?: number;
}

interface Incidencia {
  id?: number;
  descripcion: string;
  solucionada: boolean;
  solucion: string | null;
}

interface ServicioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  servicioId?: number | null;
  fechaInicial?: string | null;
  horaInicial?: string | null;
  horaFinal?: string | null;
  empleadoInicialId?: number | null;
  catalogos: Catalogos;
}

export default function ServicioModal({
  isOpen,
  onClose,
  onSaved,
  servicioId,
  fechaInicial,
  horaInicial,
  horaFinal,
  empleadoInicialId,
  catalogos
}: ServicioModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'materiales' | 'trabajos' | 'externos' | 'notas' | 'incidencias'>('materiales');
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  // Acción que está esperando confirmación del usuario (Guardar / Borrar).
  // Mantiene el diálogo abierto con estado "Procesando..." hasta que termina.
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [searchCrmQuery, setSearchCrmQuery] = useState('');
  const [crmSuggestions, setCrmSuggestions] = useState<any[]>([]);
  const [showCrmSuggestions, setShowCrmSuggestions] = useState(false);
  const [crmSearching, setCrmSearching] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [presupuestosCliente, setPresupuestosCliente] = useState<any[]>([]);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS LOCALES DE LOS CAMPOS ---
  const [id, setId] = useState<number | undefined>(undefined);
  const [codigoServicio, setCodigoServicio] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [tiendaId, setTiendaId] = useState<number | null>(1); // ALMACEN por defecto
  const [tipoServicioId, setTipoServicioId] = useState<number | null>(1);
  const [estadoId, setEstadoId] = useState<number | null>(1); // Pendiente por defecto
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | null>(1);
  const [numDocumento, setNumDocumento] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaPrevista, setFechaPrevista] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaEntregaIni, setHoraEntregaIni] = useState('08:30');
  const [horaEntregaFin, setHoraEntregaFin] = useState('09:00');
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  
  // Destino
  const [destDireccion, setDestDireccion] = useState('');
  const [destNum, setDestNum] = useState('');
  const [destPiso, setDestPiso] = useState('');
  const [destLetra, setDestLetra] = useState('');
  const [destCodPostal, setDestCodPostal] = useState('');
  const [destPoblacion, setDestPoblacion] = useState('');
  const [destProvincia, setDestProvincia] = useState('');
  const [destAscensor, setDestAscensor] = useState(false);
  const [destAccesoFurgo, setDestAccesoFurgo] = useState(false);
  const [destAccesoCamion, setDestAccesoCamion] = useState(false);
  const [destNombre, setDestNombre] = useState('');
  const [destTel, setDestTel] = useState('');
  const [destObservaciones, setDestObservaciones] = useState('');

  // Sincronización del cliente CRM
  const [cif, setCif] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [clientePoblacion, setClientePoblacion] = useState('');
  const [clienteCodPostal, setClienteCodPostal] = useState('');
  const [clienteProvincia, setClienteProvincia] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteContacto, setClienteContacto] = useState('');
  const [clienteTelContacto, setClienteTelContacto] = useState('');

  // Totales y listados locales
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [totalServPropio, setTotalServPropio] = useState(0);
  const [totalServExt, setTotalServExt] = useState(0);

  const [searchingDoc, setSearchingDoc] = useState(false);

  // Carga los presupuestos (documentos de venta) que un cliente tiene en el CRM Integral
  const cargarPresupuestosCliente = async (clienteId: number | null) => {
    if (!clienteId) {
      setPresupuestosCliente([]);
      return;
    }
    setLoadingPresupuestos(true);
    try {
      const docs = await obtenerPresupuestosClienteCRM(clienteId);
      setPresupuestosCliente(docs || []);
    } catch (err) {
      console.error("Error al obtener presupuestos del cliente:", err);
      setPresupuestosCliente([]);
    } finally {
      setLoadingPresupuestos(false);
    }
  };

  // Acepta un nº de documento opcional para poder importar directamente al elegir
  // un presupuesto del desplegable (sin esperar al refresco del state numDocumento).
  const handleImportarPresupuesto = async (docNum?: string) => {
    const numero = (docNum ?? numDocumento)?.trim();
    if (!numero || numero.length < 2) return;

    setSearchingDoc(true);
    try {
      const res = await buscarPresupuestoCRM(numero);
      if (res.error) {
        alert(res.error);
      } else if (res.success && res.documento) {
        const doc = res.documento;
        setClienteId(doc.cliente_id);
        setNombreCliente(doc.nombre_cliente);
        setCif(doc.cif);
        setClienteDireccion(doc.direccion);
        setClientePoblacion(doc.poblacion);
        setClienteCodPostal(doc.cod_postal);
        setClienteProvincia(doc.provincia);
        setClienteTelefono(doc.telefono);
        setClienteEmail(doc.email);
        setEmailInput(doc.email);
        
        // Importar materiales asociados si existen
        if (res.materiales && res.materiales.length > 0) {
          setMateriales(res.materiales);
          alert(`¡Éxito! Documento encontrado. Se importaron los datos del cliente y ${res.materiales.length} artículos del presupuesto.`);
        } else {
          alert("¡Éxito! Documento encontrado. Se importaron los datos del cliente.");
        }
      }
    } catch (err) {
      console.error("Error al importar presupuesto:", err);
      alert("Error de conexión al buscar el documento.");
    } finally {
      setSearchingDoc(false);
    }
  };

  // Material local editado en formulario
  const [newMatCodigo, setNewMatCodigo] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatPrecio, setNewMatPrecio] = useState(0);
  const [newMatCant, setNewMatCant] = useState(1);

  // Incidencia local editada
  const [newIncDesc, setNewIncDesc] = useState('');

  // Totales dinámicos
  const totalMateriales = materiales.reduce((sum, m) => sum + (m.precio * m.cantidad), 0);
  const total = totalMateriales + totalServPropio + totalServExt;

  // Cargar datos al abrir modal
  useEffect(() => {
    if (!isOpen) return;

    // Resetear formulario
    setId(undefined);
    setCodigoServicio('');
    setCodigoBarras('');
    setClienteId(null);
    setNombreCliente('');
    setTiendaId(1);
    setTipoServicioId(1);
    setEstadoId(1);
    setTipoDocumentoId(1);
    setNumDocumento('');
    setUbicacion('');
    setFechaEntrega(fechaInicial || new Date().toISOString().split('T')[0]);
    setFechaPrevista('');
    setFechaInicio(fechaInicial || '');
    setFechaFin(fechaInicial || '');
    setHoraEntregaIni(horaInicial || '08:30');
    setHoraEntregaFin(horaFinal || '09:00');
    setEmpleadoId(empleadoInicialId || null);
    setDestDireccion('');
    setDestNum('');
    setDestPiso('');
    setDestLetra('');
    setDestCodPostal('');
    setDestPoblacion('');
    setDestProvincia('');
    setDestAscensor(false);
    setDestAccesoFurgo(false);
    setDestAccesoCamion(false);
    setDestNombre('');
    setDestTel('');
    setDestObservaciones('');
    setMateriales([]);
    setIncidencias([]);
    setTotalServPropio(0);
    setTotalServExt(0);
    setCif( '');
    setSearchCrmQuery('');
    setCrmSuggestions([]);
    setShowCrmSuggestions(false);
    setCrmSearching(false);
    setCrmError(null);
    setPresupuestosCliente([]);
    setLoadingPresupuestos(false);
    setEmailInput('');
    setShowEmailModal(false);

    // Si es un servicio nuevo, autocalcular código
    if (!servicioId) {
      calcularCodigo(1); // ALMACEN (ID 1) por defecto
    } else {
      cargarServicioEdicion(servicioId);
    }
  }, [isOpen, servicioId, fechaInicial, horaInicial, horaFinal, empleadoInicialId]);

  // Manejar clics fuera de las sugerencias del CRM para cerrarlas
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowCrmSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carga un servicio existente para editar
  const cargarServicioEdicion = async (servId: number) => {
    setLoading(true);
    try {
      const { data: s, error } = await supabase
        .from('servicios')
        .select(`
          *,
          servicios_materiales(*),
          servicios_incidencias(*)
        `)
        .eq('id', servId)
        .single();

      if (error) throw error;

      if (s) {
        setId(s.id);
        setCodigoServicio(s.codigo_servicio);
        setCodigoBarras(s.codigo_barras || '');
        setClienteId(s.cliente_id);
        setNombreCliente(s.nombre_cliente);
        setTiendaId(s.tienda_id);
        setTipoServicioId(s.tipo_servicio_id);
        setEstadoId(s.estado_id);
        setTipoDocumentoId(s.tipo_documento_id);
        setNumDocumento(s.num_documento || '');
        setUbicacion(s.ubicacion || '');
        setFechaEntrega(s.fecha_entrega || '');
        setFechaPrevista(s.fecha_prevista || '');
        setFechaInicio(s.fecha_inicio || '');
        setFechaFin(s.fecha_fin || '');
        // Quitar segundos de la hora
        setHoraEntregaIni(s.hora_entrega_ini ? s.hora_entrega_ini.substring(0, 5) : '08:30');
        setHoraEntregaFin(s.hora_entrega_fin ? s.hora_entrega_fin.substring(0, 5) : '09:00');
        setEmpleadoId(s.empleado_id);
        setDestDireccion(s.dest_direccion || '');
        setDestNum(s.dest_num || '');
        setDestPiso(s.dest_piso || '');
        setDestLetra(s.dest_letra || '');
        setDestCodPostal(s.dest_cod_postal || '');
        setDestPoblacion(s.dest_poblacion || '');
        setDestProvincia(s.dest_provincia || '');
        setDestAscensor(!!s.dest_ascensor);
        setDestAccesoFurgo(!!s.dest_acceso_furgo);
        setDestAccesoCamion(!!s.dest_acceso_camion);
        setDestNombre(s.dest_nombre || '');
        setDestTel(s.dest_tel || '');
        setDestObservaciones(s.dest_observaciones || '');
        setTotalServPropio(Number(s.total_serv_propio) || 0);
        setTotalServExt(Number(s.total_serv_ext) || 0);

        // Listas relacionadas
        setMateriales(s.servicios_materiales || []);
        setIncidencias(s.servicios_incidencias || []);

        // Cargar datos de cliente del CRM si existían
        if (s.cliente_id) {
          const { data: cli } = await supabase
            .from('clientes_crm_cache')
            .select('*')
            .eq('codigo_cliente', s.cliente_id)
            .single();

          if (cli) {
            setCif(cli.cif || '');
            setClienteDireccion(cli.direccion || '');
            setClientePoblacion(cli.poblacion || '');
            setClienteCodPostal(cli.cod_postal || '');
            setClienteProvincia(cli.provincia || '');
            setClienteTelefono(cli.telefono || '');
            setClienteEmail(cli.email || '');
            setEmailInput(cli.email || '');
            setClienteContacto(cli.nombre_contacto || '');
            setClienteTelContacto(cli.telefono_contacto || '');
          }
        }

        // Cargar los presupuestos que el cliente tiene en el CRM Integral
        cargarPresupuestosCliente(s.cliente_id);
      }
    } catch (err) {
      console.error("Error al cargar el servicio de edición:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular código secuencial al cambiar de tienda
  const calcularCodigo = async (tId: number) => {
    const code = await obtenerSiguienteCodigoServicio(tId);
    setCodigoServicio(code);
  };

  // Autocomplete del buscador CRM
  const handleCrmSearch = async (val: string) => {
    setSearchCrmQuery(val);
    setNombreCliente(val); // Asignar temporalmente si es manual

    if (val.trim().length >= 2) {
      setCrmSearching(true);
      setCrmError(null);
      try {
        const res = await buscarClientesCRM(val);
        setCrmSuggestions(res || []);
        setShowCrmSuggestions(true);
      } catch (err: any) {
        // Si la server action falla (p.ej. no hay conexión al CRM), lo registramos
        // y lo mostramos para diagnosticar en lugar de quedar en silencio.
        console.error("Error al buscar clientes en el CRM:", err);
        setCrmSuggestions([]);
        setShowCrmSuggestions(false);
        setCrmError(err?.message || 'No se pudo consultar el CRM Integral.');
      } finally {
        setCrmSearching(false);
      }
    } else {
      setCrmSuggestions([]);
      setShowCrmSuggestions(false);
      setCrmError(null);
    }
  };

  // Seleccionar un cliente del buscador CRM
  const selectCrmCliente = (cli: any) => {
    setClienteId(cli.codigo_cliente);
    setNombreCliente(cli.nombre);
    setCif(cli.cif || '');
    setClienteDireccion(cli.direccion || '');
    setClientePoblacion(cli.poblacion || '');
    setClienteCodPostal(cli.cod_postal || '');
    setClienteProvincia(cli.provincia || '');
    setClienteTelefono(cli.telefono || '');
    setClienteEmail(cli.email || '');
    setEmailInput(cli.email || '');
    setClienteContacto(cli.nombre_contacto || '');
    setClienteTelContacto(cli.telefono_contacto || '');

    setShowCrmSuggestions(false);
    setSearchCrmQuery('');

    // Cargar los presupuestos que este cliente tiene en el CRM Integral
    setNumDocumento('');
    cargarPresupuestosCliente(cli.codigo_cliente);
  };

  // Copiar dirección del cliente a destino
  const usarDireccionCliente = () => {
    setDestDireccion(clienteDireccion);
    setDestPoblacion(clientePoblacion);
    setDestCodPostal(clienteCodPostal);
    setDestProvincia(clienteProvincia);
    setDestNombre(clienteContacto || nombreCliente);
    setDestTel(clienteTelefono);
  };

  // Agregar Material localmente
  const addMaterialLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatDesc) return;

    const newMat: Material = {
      codigo: newMatCodigo || '0000',
      descripcion: newMatDesc,
      precio: newMatPrecio,
      cantidad: newMatCant
    };

    setMateriales([...materiales, newMat]);
    
    // Resetear formulario de material
    setNewMatCodigo('');
    setNewMatDesc('');
    setNewMatPrecio(0);
    setNewMatCant(1);
  };

  // Borrar material local
  const removeMaterialLocal = (idx: number) => {
    const updated = materiales.filter((_, i) => i !== idx);
    setMateriales(updated);
  };

  // Agregar Incidencia local
  const addIncidenciaLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncDesc) return;

    const newInc: Incidencia = {
      descripcion: newIncDesc,
      solucionada: false,
      solucion: null
    };

    setIncidencias([...incidencias, newInc]);
    setNewIncDesc('');
  };

  // Toggle incidencia solucionada
  const toggleIncidenciaLocal = (idx: number) => {
    const updated = incidencias.map((inc, i) => {
      if (i === idx) {
        return { 
          ...inc, 
          solucionada: !inc.solucionada,
          solucion: !inc.solucionada ? (inc.solucion || 'Resuelta') : null
        };
      }
      return inc;
    });
    setIncidencias(updated);
  };

  // Borrar incidencia local
  const removeIncidenciaLocal = (idx: number) => {
    setIncidencias(incidencias.filter((_, i) => i !== idx));
  };

  // Guardar en Supabase (Llama a Server Action)
  const handleSave = async () => {
    if (!nombreCliente) {
      alert("Por favor, introduce el nombre del cliente.");
      return;
    }

    setLoading(true);
    
    const payload = {
      id,
      codigo_servicio: codigoServicio,
      codigo_barras: codigoBarras || null,
      cliente_id: clienteId,
      nombre_cliente: nombreCliente,
      tienda_id: tiendaId,
      tipo_servicio_id: tipoServicioId,
      estado_id: estadoId,
      tipo_documento_id: tipoDocumentoId,
      num_documento: numDocumento || null,
      ubicacion: ubicacion || null,
      fecha_entrega: fechaEntrega || null,
      fecha_prevista: fechaPrevista || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      hora_entrega_ini: horaEntregaIni || null,
      hora_entrega_fin: horaEntregaFin || null,
      empleado_id: empleadoId,
      dest_direccion: destDireccion || null,
      dest_num: destNum || null,
      dest_piso: destPiso || null,
      dest_letra: destLetra || null,
      dest_cod_postal: destCodPostal || null,
      dest_poblacion: destPoblacion || null,
      dest_provincia: destProvincia || null,
      dest_ascensor: destAscensor,
      dest_acceso_furgo: destAccesoFurgo,
      dest_acceso_camion: destAccesoCamion,
      dest_nombre: destNombre || null,
      dest_tel: destTel || null,
      dest_observaciones: destObservaciones || null,
      total_materiales: totalMateriales,
      total_serv_propio: totalServPropio,
      total_serv_ext: totalServExt,
      total: total,
      incidencias: incidencias.some(inc => !inc.solucionada),
      materiales,
      incidencias_lista: incidencias
    };

    const res = await guardarServicio(payload);

    setLoading(false);
    if (res.success) {
      onSaved();
      if (!id && res.id) {
        // Servicio nuevo: en lugar de cerrar, dejamos el modal abierto con el
        // nuevo id ya cargado. Así aparecen los botones de Imprimir / Email /
        // Borrar y el operario puede imprimir la orden para entregarla en mano
        // o enviarla por correo sin tener que reabrir el servicio.
        setId(res.id);
      } else {
        onClose();
      }
    } else {
      alert(`Error al guardar: ${res.error}`);
    }
  };

  // Eliminar servicio en Supabase
  const handleDelete = async () => {
    if (!id) return;

    setLoading(true);
    const res = await eliminarServicio(id);
    setLoading(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      alert(`Error al eliminar: ${res.error}`);
    }
  };

  // Ejecuta la acción que el usuario confirmó en el diálogo de confirmación,
  // y cierra el diálogo al terminar (salvo que el modal se haya cerrado ya).
  const runPendingAction = async () => {
    const action = pendingAction;
    try {
      if (action === 'save') {
        await handleSave();
      } else if (action === 'delete') {
        await handleDelete();
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handlePrint = () => {
    if (!id) return;
    window.open(`/servicios/${id}/print?print=true`, '_blank');
  };

  const handleSendEmail = async () => {
    if (!id) return;
    if (!emailInput) {
      alert("Por favor, introduce una dirección de correo válida.");
      return;
    }
    setSendingEmail(true);
    const res = await enviarCorreoServicio(id, emailInput);
    setSendingEmail(false);
    if (res.success) {
      alert("¡Correo enviado con éxito!");
      setShowEmailModal(false);
    } else {
      alert(`Error al enviar el correo: ${res.error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      
      {/* Caja del Modal */}
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabecera Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold rounded-lg flex items-center justify-center text-sm">
              S
            </div>
            <div>
              <h2 className="text-base font-bold">Detalles de Orden de Servicio</h2>
              <span className="text-xs text-slate-400 font-semibold">{codigoServicio || 'Nuevo Servicio'}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal (Scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Fila 1: Cabecera y datos del CRM */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Código del Servicio (solo lectura en edición) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Cód. Servicio</label>
              <input 
                type="text" 
                value={codigoServicio} 
                disabled 
                className="w-full bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-slate-500 text-sm font-bold"
              />
            </div>

            {/* Selector de Tienda / Sucursal */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Tienda / Almacén</label>
              <select
                value={tiendaId || 1}
                disabled={!!id} // Deshabilitar cambio en edición para proteger correlativo
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTiendaId(val);
                  calcularCodigo(val);
                }}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                {catalogos.tiendas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Buscador de Cliente (CRM) */}
            <div className="space-y-1 md:col-span-2 relative" ref={searchContainerRef}>
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Cliente (Buscador CRM)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={showCrmSuggestions ? searchCrmQuery : nombreCliente}
                  onChange={(e) => handleCrmSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                  placeholder="Introduce nombre o código del cliente..."
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {crmSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 animate-pulse">Buscando...</span>
                )}
              </div>

              {/* Aviso de error de conexión con el CRM */}
              {crmError && !showCrmSuggestions && (
                <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  <span>{crmError}</span>
                </p>
              )}

              {/* Dropdown de Sugerencias */}
              {showCrmSuggestions && crmSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-xl mt-1 z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {crmSuggestions.map(cli => (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => selectCrmCliente(cli)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer"
                    >
                      <span>{cli.nombre}</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Cód: {cli.codigo_cliente}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Fila 2: Fechas, Horas y Estados */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Fecha de Entrega</label>
              <input 
                type="date"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Horario Desde</label>
              <input 
                type="time"
                value={horaEntregaIni}
                onChange={(e) => setHoraEntregaIni(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Horario Hasta</label>
              <input 
                type="time"
                value={horaEntregaFin}
                onChange={(e) => setHoraEntregaFin(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Estado del Servicio</label>
              <select
                value={estadoId || 1}
                onChange={(e) => setEstadoId(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                {catalogos.estados.map(est => (
                  <option key={est.id} value={est.id}>{est.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo Documento</label>
              <select
                value={tipoDocumentoId || 1}
                onChange={(e) => setTipoDocumentoId(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                {catalogos.tiposDocumentos.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">
                Nº Documento / Presupuesto
                {presupuestosCliente.length > 0 && (
                  <span className="ml-1 text-[9px] text-blue-500 normal-case font-bold">({presupuestosCliente.length} del cliente)</span>
                )}
              </label>
              <div className="flex gap-1.5">
                {presupuestosCliente.length > 0 ? (
                  <select
                    value={numDocumento}
                    onChange={(e) => {
                      const cod = e.target.value;
                      setNumDocumento(cod);
                      if (cod) handleImportarPresupuesto(cod);
                    }}
                    disabled={searchingDoc}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">— Selecciona un presupuesto —</option>
                    {presupuestosCliente.map(p => (
                      <option key={p.cod_venta} value={p.cod_venta}>
                        {p.cod_documento ? p.cod_documento : `Nº ${p.cod_venta}`} {p.fecha ? `· ${p.fecha}` : ''} {p.total ? `· ${Number(p.total).toFixed(2)}€` : ''}
                      </option>
                    ))}
                  </select>
                ) : loadingPresupuestos ? (
                  <input
                    type="text"
                    disabled
                    placeholder="Cargando presupuestos..."
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-slate-400 text-sm font-semibold"
                  />
                ) : (
                  <input
                    type="text"
                    value={numDocumento}
                    onChange={(e) => setNumDocumento(e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="Ej. 23108160"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleImportarPresupuesto()}
                  disabled={searchingDoc || !numDocumento}
                  className="flex-shrink-0 px-3 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Buscar presupuesto en CRM Integral e importar datos"
                >
                  {searchingDoc ? 'Buscando...' : 'Importar'}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo de Servicio</label>
              <select
                value={tipoServicioId || 1}
                onChange={(e) => setTipoServicioId(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                {catalogos.tiposServicios.map(ts => (
                  <option key={ts.id} value={ts.id}>{ts.nombre}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Operario Asignado</label>
              <select
                value={empleadoId || ''}
                onChange={(e) => setEmpleadoId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Sin técnico asignado --</option>
                {catalogos.empleados.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Fila 3: Pestañas de Detalle y Panel de Destino */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Pestañas (Detalle Materiales / Notas) */}
            <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-[350px]">
              
              {/* Selector de Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50">
                {(['materiales', 'trabajos', 'externos', 'notas', 'incidencias'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-xs font-bold uppercase border-b-2 transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                    }`}
                  >
                    {tab === 'materiales' ? 'Materiales' :
                     tab === 'trabajos' ? 'Serv. Propios' :
                     tab === 'externos' ? 'Serv. Externos' :
                     tab === 'notas' ? 'Notas para el instalador' : 'Incidencias'}
                  </button>
                ))}
              </div>

              {/* Contenido de las Pestañas */}
              <div className="flex-1 p-4 overflow-y-auto">
                
                {/* 1. PESTAÑA MATERIALES */}
                {activeTab === 'materiales' && (
                  <div className="space-y-4 h-full flex flex-col">
                    {/* Formulario rápido para añadir material */}
                    <form onSubmit={addMaterialLocal} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-3 border-b border-slate-100">
                      <input 
                        type="text"
                        value={newMatCodigo}
                        onChange={(e) => setNewMatCodigo(e.target.value)}
                        placeholder="Código"
                        className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                      <input 
                        type="text"
                        value={newMatDesc}
                        onChange={(e) => setNewMatDesc(e.target.value)}
                        placeholder="Descripción del material..."
                        className="sm:col-span-5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                      <input 
                        type="number"
                        step="0.01"
                        value={newMatPrecio || ''}
                        onChange={(e) => setNewMatPrecio(Number(e.target.value))}
                        placeholder="Precio (€)"
                        className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                      <input 
                        type="number"
                        value={newMatCant || ''}
                        onChange={(e) => setNewMatCant(Number(e.target.value))}
                        placeholder="Cant"
                        className="sm:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                      <button 
                        type="submit"
                        className="sm:col-span-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg py-1.5 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Añadir</span>
                      </button>
                    </form>

                    {/* Tabla de Materiales */}
                    <div className="flex-1 overflow-x-auto min-h-[180px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 w-16">Código</th>
                            <th className="px-3 py-2">Descripción</th>
                            <th className="px-3 py-2 w-20 text-right">Precio</th>
                            <th className="px-3 py-2 w-16 text-center">Cant</th>
                            <th className="px-3 py-2 w-20 text-right">Total</th>
                            <th className="px-3 py-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                          {materiales.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-slate-400 font-normal italic">
                                -- No hay materiales añadidos --
                              </td>
                            </tr>
                          ) : (
                            materiales.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-bold">{m.codigo}</td>
                                <td className="px-3 py-2 truncate max-w-[200px]">{m.descripcion}</td>
                                <td className="px-3 py-2 text-right">{m.precio.toFixed(2)} €</td>
                                <td className="px-3 py-2 text-center">{m.cantidad}</td>
                                <td className="px-3 py-2 text-right font-bold text-slate-800">{(m.precio * m.cantidad).toFixed(2)} €</td>
                                <td className="px-3 py-2 text-center">
                                  <button 
                                    onClick={() => removeMaterialLocal(idx)}
                                    type="button" 
                                    className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. PESTAÑA SERVICIOS PROPIOS */}
                {activeTab === 'trabajos' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Introduce el coste estimado de los trabajos propios asociados al servicio:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Importe Trabajos Propios (€)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={totalServPropio || ''}
                          onChange={(e) => setTotalServPropio(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PESTAÑA SERVICIOS EXTERNOS */}
                {activeTab === 'externos' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Detalles de servicios de subcontratación externa:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Importe Trabajos Externos (€)</label>
                        <input 
                          type="number"
                          step="0.01"
                          value={totalServExt || ''}
                          onChange={(e) => setTotalServExt(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. PESTAÑA NOTAS */}
                {activeTab === 'notas' && (
                  <div className="space-y-2 h-full flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Notas para el instalador</label>
                    <p className="text-[10px] text-slate-400 mb-1">Estas notas las verá el instalador en la app móvil.</p>
                    <textarea
                      value={destObservaciones}
                      onChange={(e) => setDestObservaciones(e.target.value)}
                      className="w-full flex-1 min-h-[180px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                      placeholder="Indica aquí el trabajo a realizar, materiales a llevar, dificultades de acceso, indicaciones del cliente, etc."
                    />
                  </div>
                )}

                {/* 5. PESTAÑA INCIDENCIAS */}
                {activeTab === 'incidencias' && (
                  <div className="space-y-4 h-full flex flex-col">
                    {/* Formulario rápido para añadir incidencia */}
                    <form onSubmit={addIncidenciaLocal} className="flex gap-2 pb-3 border-b border-slate-100">
                      <input 
                        type="text"
                        value={newIncDesc}
                        onChange={(e) => setNewIncDesc(e.target.value)}
                        placeholder="Descripción de la incidencia surgida..."
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                      <button 
                        type="submit"
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg px-4 py-1.5 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-red-500/10"
                      >
                        <Plus size={14} />
                        <span>Añadir Incidencia</span>
                      </button>
                    </form>

                    {/* Listado de Incidencias */}
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-[180px]">
                      {incidencias.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          -- No hay incidencias reportadas en esta orden --
                        </div>
                      ) : (
                        incidencias.map((inc, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                              inc.solucionada 
                                ? 'bg-slate-50 border-slate-200 opacity-60' 
                                : 'bg-red-50 border-red-200 text-red-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {inc.solucionada ? (
                                <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                              ) : (
                                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 animate-pulse" />
                              )}
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${inc.solucionada ? 'line-through text-slate-500' : ''}`}>
                                  {inc.descripcion}
                                </p>
                                {inc.solucionada && (
                                  <span className="text-[9px] text-slate-500 block font-semibold mt-0.5">
                                    Solución: {inc.solucion || 'Resuelta'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleIncidenciaLocal(idx)}
                                className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                                  inc.solucionada 
                                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                                }`}
                              >
                                {inc.solucionada ? 'Reabrir' : 'Solucionar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeIncidenciaLocal(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Columna Derecha: Panel de Destino / Logística */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-600" />
                  <span>Destino / Logística</span>
                </h3>
                <button
                  type="button"
                  onClick={usarDireccionCliente}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline cursor-pointer"
                >
                  Dirección Cliente
                </button>
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Calle / Dirección</label>
                <input 
                  type="text" 
                  value={destDireccion}
                  onChange={(e) => setDestDireccion(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  placeholder="Calle y número..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Núm.</label>
                  <input 
                    type="text" 
                    value={destNum}
                    onChange={(e) => setDestNum(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Piso</label>
                  <input 
                    type="text" 
                    value={destPiso}
                    onChange={(e) => setDestPiso(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Letra</label>
                  <input 
                    type="text" 
                    value={destLetra}
                    onChange={(e) => setDestLetra(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">C.P.</label>
                  <input 
                    type="text" 
                    value={destCodPostal}
                    onChange={(e) => setDestCodPostal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Población</label>
                  <input 
                    type="text" 
                    value={destPoblacion}
                    onChange={(e) => setDestPoblacion(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Provincia</label>
                <input 
                  type="text" 
                  value={destProvincia}
                  onChange={(e) => setDestProvincia(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Acceso y Checklist */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase block">Accesibilidad</label>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={destAscensor}
                      onChange={(e) => setDestAscensor(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Ascensor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={destAccesoFurgo}
                      onChange={(e) => setDestAccesoFurgo(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Furgoneta</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={destAccesoCamion}
                      onChange={(e) => setDestAccesoCamion(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Camión</span>
                  </label>
                </div>
              </div>

              {/* Contacto en destino */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                  <Phone size={12} />
                  <span>Contacto Destino</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    value={destNombre}
                    onChange={(e) => setDestNombre(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="Nombre..."
                  />
                  <input 
                    type="text" 
                    value={destTel}
                    onChange={(e) => setDestTel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="Teléfono..."
                  />
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Pie del Modal: Totales Económicos y Botones */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Totales */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-500 text-xs font-semibold">
            <div>Materiales: <span className="text-slate-800 font-bold">{totalMateriales.toFixed(2)} €</span></div>
            <div>Serv. Propios: <span className="text-slate-800 font-bold">{totalServPropio.toFixed(2)} €</span></div>
            <div>Serv. Externos: <span className="text-slate-800 font-bold">{totalServExt.toFixed(2)} €</span></div>
            <div className="border-l border-slate-300 pl-4">Total Orden: <span className="text-blue-600 font-black text-sm">{total.toFixed(2)} €</span></div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            
            {/* Imprimir (si es edición) */}
            {id && (
              <button
                type="button"
                onClick={handlePrint}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Imprimir Albarán PDF"
              >
                <Printer size={14} className="text-slate-500" />
                <span>Imprimir</span>
              </button>
            )}

            {/* Enviar Correo (si es edición) */}
            {id && (
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Enviar por Correo Electrónico"
              >
                <Mail size={14} className="text-slate-500" />
                <span>Enviar Email</span>
              </button>
            )}
            
            {/* Eliminar (si es edición) */}
            {id && (
              <button
                type="button"
                onClick={() => setPendingAction('delete')}
                disabled={loading}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Trash size={14} />
                <span>Borrar</span>
              </button>
            )}

            {/* Cancelar */}
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
            >
              Cancelar
            </button>

            {/* Guardar */}
            <button
              type="button"
              onClick={() => setPendingAction('save')}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Save size={14} />
              <span>{loading ? 'Guardando...' : 'Guardar'}</span>
            </button>

          </div>

        </div>

      </div>

      {/* Submodal para solicitar el correo electrónico */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Enviar Albarán por Email</h3>
                <span className="text-[10px] text-slate-400 font-semibold block">Introduce la dirección de correo electrónico del receptor</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block">Email del Cliente</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {sendingEmail ? 'Enviando...' : 'Enviar Correo'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Diálogo de confirmación para Guardar / Borrar */}
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction === 'delete' ? 'Eliminar servicio' : 'Guardar servicio'}
        message={
          pendingAction === 'delete'
            ? `¿Seguro que deseas eliminar el servicio ${codigoServicio}? Esta acción no se puede deshacer.`
            : id
              ? '¿Confirmas guardar los cambios realizados en este servicio?'
              : '¿Confirmas crear este nuevo servicio?'
        }
        confirmText={pendingAction === 'delete' ? 'Eliminar' : 'Guardar'}
        variant={pendingAction === 'delete' ? 'danger' : 'primary'}
        loading={loading}
        onConfirm={runPendingAction}
        onCancel={() => { if (!loading) setPendingAction(null); }}
      />

    </div>
  );
}
