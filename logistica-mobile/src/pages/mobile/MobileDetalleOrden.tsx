import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/compressImage';
import { uploadToCloudinary } from '../../lib/cloudinary';

const MobileDetalleOrden = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [orden, setOrden] = useState<any>(null);
    const [reportes, setReportes] = useState<any[]>([]); 
    const [reporte, setReporte] = useState<any>(null); 
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [trabajadoresMap, setTrabajadoresMap] = useState<Map<string, { nombre: string; especialidad: string }>>(new Map());
    const [materialesOrden, setMaterialesOrden] = useState<any[]>([]);
    const [tipoServicioNombre, setTipoServicioNombre] = useState<string>('');
    const [estadoIds, setEstadoIds] = useState<Map<string, number>>(new Map());

    // Formulario de reporte
    const [fecha, setFecha] = useState('');
    const [trabajoRealizado, setTrabajoRealizado] = useState('');
    const [materialUtilizado, setMaterialUtilizado] = useState('');
    const [selectedHora, setSelectedHora] = useState(0);
    const [selectedMinuto, setSelectedMinuto] = useState(0);
    
    const [submitting, setSubmitting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [customError, setCustomError] = useState<string | null>(null);
    
    // Fotos del trabajo
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fotos, setFotos] = useState<string[]>([]);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);

    // Fotos de facturas/gastos
    const facturaInputRef = useRef<HTMLInputElement>(null);
    const [facturas, setFacturas] = useState<string[]>([]);
    const [uploadingFactura, setUploadingFactura] = useState(false);
    const [facturaPreviews, setFacturaPreviews] = useState<string[]>([]);
    
    // Canvas para firma y estados de reporte
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [showForm, setShowForm] = useState(false); 
    const [viewingReport, setViewingReport] = useState<any>(null); 
    
    // Nuevos estados para el flujo de firma mejorada y conclusión de orden
    const [concluido, setConcluido] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

    useEffect(() => {
        if (showForm) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [showForm]);

    useEffect(() => {
        if (id) {
            fetchOrden();
            localStorage.setItem('last_active_order', id);
        }
    }, [id]);

    const fetchOrden = async () => {
        setLoading(true);
        setCustomError(null);

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || null;
        setCurrentUserId(userId);

        if (!userId) {
            setLoading(false);
            return;
        }

        // Resolver IDs de estados por nombre para no depender de IDs hardcodeados
        const { data: estadosData, error: estadosError } = await supabase
            .from('estados')
            .select('id, nombre');
        if (estadosError) {
            console.error('Error fetching estados:', estadosError);
        }
        const estadosMap = new Map<string, number>(
            (estadosData || []).map((e: any) => [e.nombre, e.id])
        );
        setEstadoIds(estadosMap);

        // Perfil y rol de Ribera
        const { data: profile } = await supabase
            .from('perfiles')
            .select('nombre, rol')
            .eq('id', userId)
            .maybeSingle();

        const roleName = profile?.rol || 'Instalador';
        setCurrentUserRole(roleName);
        setCurrentUserName(profile?.nombre || userData?.user?.email?.split('@')[0] || 'Técnico');

        const [ordenReq, reportesReq, trabajadoresReq] = await Promise.all([
            // Traer el servicio con su tienda, estado, tipo de servicio y materiales
            supabase.from('servicios').select('*, tiendas(nombre), estados(nombre), tipos_servicios(nombre), servicios_materiales(*)').eq('id', id).single(),
            // Traer las intervenciones de este servicio
            supabase.from('reportes').select('*').eq('orden_id', id).order('creado_en', { ascending: false }),
            // Traer empleados para mapear nombres en la UI
            supabase.from('empleados').select('perfil_id, nombre')
        ]);

        if (ordenReq.error) {
            console.error('Error fetching orden:', ordenReq.error);
        }

        if (reportesReq.error) {
            console.error('Error fetching reportes:', reportesReq.error);
        }

        if (trabajadoresReq.error) {
            console.error('Error fetching trabajadores:', trabajadoresReq.error);
        }

        // Crear mapa de empleados
        if (!trabajadoresReq.error && trabajadoresReq.data) {
            const map = new Map<string, { nombre: string; especialidad: string }>();
            trabajadoresReq.data.forEach((t: any) => {
                if (t.perfil_id && t.nombre) {
                    map.set(t.perfil_id, {
                        nombre: t.nombre.trim(),
                        especialidad: 'Técnico'
                    });
                }
            });
            setTrabajadoresMap(map);
        }

        if (!ordenReq.error && ordenReq.data) {
            // Mapear los datos de Supabase Ribera al formato de la UI móvil
            const item = ordenReq.data;
            const fullDireccion = [
                item.dest_direccion,
                item.dest_num ? `Nº ${item.dest_num}` : '',
                item.dest_piso ? `Piso ${item.dest_piso}` : '',
                item.dest_letra ? `Letra ${item.dest_letra}` : '',
                item.dest_poblacion
            ].filter(Boolean).join(', ');

            setOrden({
                id: item.id,
                id_legible: item.codigo_servicio,
                cliente: item.nombre_cliente,
                aseguradora: item.tiendas?.nombre || 'Sin tienda',
                asegurado: item.dest_nombre || '',
                telefono_asegurado: item.dest_tel || '',
                direccion: fullDireccion || 'Sin dirección',
                descripcion: item.dest_observaciones || '',
                persona_contacto: item.dest_nombre || '',
                telefono_contacto: item.dest_tel || '',
                num_documento: item.num_documento || '',
                creado_en: item.creado_en,
                estado_id: item.estado_id
            });

            setTipoServicioNombre(item.tipos_servicios?.nombre || 'General');
            setMaterialesOrden(item.servicios_materiales || []);

            // Auto-marcar como "En curso" la primera vez que el técnico abre el servicio
            const pendienteId = estadosMap.get('Pendiente');
            const enCursoId = estadosMap.get('En curso');
            if (pendienteId && enCursoId && item.estado_id === pendienteId) {
                const { error: updateError, count, status } = await supabase
                    .from('servicios')
                    .update({ estado_id: enCursoId }, { count: 'exact' })
                    .eq('id', id);

                console.log('Auto-marcar En curso:', { pendienteId, enCursoId, estadoActual: item.estado_id, count, status });

                if (updateError) {
                    console.error('Error updating servicio to En curso:', updateError);
                    setCustomError('No se pudo marcar el servicio como "En curso": ' + updateError.message);
                } else if (count === 0) {
                    console.warn('Auto-marcar En curso: 0 filas actualizadas. Posible problema RLS o empleado_id no coincide.');
                    setCustomError(
                        'No se pudo actualizar el estado del servicio. Verifica que este servicio esté asignado a tu usuario en el backend (empleado_id).'
                    );
                } else {
                    // Actualizar el estado local para que el resto del formulario lo vea
                    setOrden((prev: any) => prev ? { ...prev, estado_id: enCursoId } : prev);
                }
            }

            if (item.creado_en) {
                setFecha(new Date(item.creado_en).toISOString().split('T')[0]);
            }
        }

        if (!reportesReq.error && reportesReq.data) {
            setReportes(reportesReq.data);
        }
        setLoading(false);
    };

    const handleDeleteReport = async (reportId: string) => {
        if (currentUserRole !== 'Administrador') return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este reporte técnico?')) return;

        setLoading(true);
        const { error } = await supabase.from('reportes').delete().eq('id', reportId);
        
        if (error) {
            alert('Error al eliminar el reporte: ' + error.message);
        } else {
            alert('Reporte eliminado correctamente.');
            fetchOrden();
        }
        setLoading(false);
    };

    const resetForm = () => {
        setReporte(null);
        setTrabajoRealizado('');
        setMaterialUtilizado('');
        setFotos([]);
        setFotoPreviews([]);
        setFacturas([]);
        setFacturaPreviews([]);
        setHasSignature(false);
        setSelectedHora(0);
        setSelectedMinuto(0);
        setFecha(new Date().toISOString().split('T')[0]);
        setFirmaDataUrl(null);
        setConcluido(orden?.estado_id === estadoIds.get('Terminado'));

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        if (facturaInputRef.current) facturaInputRef.current.value = '';
    };

    const loadReportData = (rep: any) => {
        setReporte(rep);
        setTrabajoRealizado(rep.trabajo_realizado || '');
        setMaterialUtilizado(rep.material_utilizado || '');
        
        const isSigned = !!rep.firma_url && 
                         typeof rep.firma_url === 'string' && 
                         rep.firma_url.startsWith('http') && 
                         rep.firma_url.length > 50; 
        setHasSignature(isSigned);
        setFirmaDataUrl(rep.firma_url || null);
        setConcluido(orden?.estado_id === estadoIds.get('Terminado'));

        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current?.width || 0, canvasRef.current?.height || 0);
        
        const reportDate = rep.fecha_trabajo || (rep.creado_en ? new Date(rep.creado_en).toISOString().split('T')[0] : '');
        setFecha(reportDate);
        
        const totalHours = rep.horas_trabajadas || 0;
        setSelectedHora(Math.floor(totalHours));
        setSelectedMinuto(Math.round((totalHours % 1) * 60));

        setFotos(rep.fotos_urls || []);
        setFotoPreviews(rep.fotos_urls || []);
        setFacturas(rep.facturas_urls || []);
        setFacturaPreviews(rep.facturas_urls || []);
        
        setShowForm(true);
    };

    // Subida de Fotos a Cloudinary
    const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingFoto(true);
        const newUrls: string[] = [];
        const newPreviews: string[] = [];

        for (const file of Array.from(files)) {
            try {
                const localPreview = URL.createObjectURL(file);
                newPreviews.push(localPreview);

                const compressed = await compressImage(file);
                const sizeKB = Math.round(compressed.size / 1024);
                console.log(`Compressed ${file.name}: ${Math.round(file.size/1024)}KB → ${sizeKB}KB`);

                const ordenId = orden?.id_legible || id || 'unknown';
                const fechaStr = new Date().toISOString().split('T')[0];
                const count = fotos.length + newUrls.length + 1;
                const filename = `${ordenId}_${fechaStr}_foto_${count}`;

                const result = await uploadToCloudinary(compressed, 'logistica/trabajos', filename);
                newUrls.push(result.secure_url);
            } catch (err) {
                console.error('Error uploading photo:', err);
                alert('Error al subir la fotografía.');
            }
        }
        setFotos(prev => [...prev, ...newUrls]);
        setFotoPreviews(prev => [...prev, ...newPreviews]);
        setUploadingFoto(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteFoto = async (index: number) => {
        setFotos(prev => prev.filter((_, i) => i !== index));
        setFotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Subida de Facturas a Cloudinary
    const handleFacturaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingFactura(true);
        const newUrls: string[] = [];
        const newPreviews: string[] = [];

        for (const file of Array.from(files)) {
            try {
                const localPreview = URL.createObjectURL(file);
                newPreviews.push(localPreview);

                const compressed = await compressImage(file);
                const sizeKB = Math.round(compressed.size / 1024);
                console.log(`Compressed factura ${file.name}: ${Math.round(file.size/1024)}KB → ${sizeKB}KB`);

                const ordenId = orden?.id_legible || id || 'unknown';
                const fechaStr = new Date().toISOString().split('T')[0];
                const count = facturas.length + newUrls.length + 1;
                const filename = `${ordenId}_${fechaStr}_factura_${count}`;

                const result = await uploadToCloudinary(compressed, 'logistica/facturas', filename);
                newUrls.push(result.secure_url);
            } catch (err) {
                console.error('Error uploading invoice:', err);
                alert('Error al subir la factura.');
            }
        }
        setFacturas(prev => [...prev, ...newUrls]);
        setFacturaPreviews(prev => [...prev, ...newPreviews]);
        setUploadingFactura(false);
        if (facturaInputRef.current) facturaInputRef.current.value = '';
    };

    const handleDeleteFactura = async (index: number) => {
        setFacturas(prev => prev.filter((_, i) => i !== index));
        setFacturaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    // Lógica para firma táctil/ratón en canvas dentro del modal
    const startDrawing = (e: any) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.beginPath(); 
        }
    };

    const draw = (e: any) => {
        if (!isDrawing || !canvasRef.current) return;
        setHasSignature(true); 
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const isTouch = e.type.includes('touch');
        const clientX = isTouch ? e.nativeEvent.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.nativeEvent.touches[0].clientY : e.clientY;
        
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a'; 

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const openSignatureModal = () => {
        setHasSignature(false);
        setShowSignatureModal(true);
        setTimeout(() => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }, 50);
    };

    const saveModalSignature = () => {
        if (canvasRef.current && hasSignature) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            setFirmaDataUrl(dataUrl);
            setShowSignatureModal(false);
        }
    };

    const cancelModalSignature = () => {
        setShowSignatureModal(false);
        if (!firmaDataUrl) {
            setHasSignature(false);
        }
    };

    const clearModalCanvas = () => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setHasSignature(false);
    };

    const clearSignature = () => {
        if (!window.confirm('¿Deseas limpiar la firma actual?')) return;
        
        if (reporte?.firma_url) {
            setReporte({...reporte, firma_url: null});
        }
        setFirmaDataUrl(null);
        setHasSignature(false);
    };

    // Guardado del reporte
    const handleComplete = async () => {
        try {
            if (!trabajoRealizado || !trabajoRealizado.trim()) {
                setCustomError("Por favor, introduce la descripción del trabajo realizado.");
                return;
            }

            if (concluido && !firmaDataUrl) {
                setCustomError("La firma del cliente es obligatoria para marcar el trabajo como Terminado.");
                return;
            }

            setSubmitting(true);
            let signatureUrl = null;

            if (firmaDataUrl) {
                if (firmaDataUrl.startsWith('data:image/png;base64,')) {
                    // Nueva firma dibujada en el modal, convertir dataURL a Blob y subir a Supabase
                    try {
                        const dataURLtoBlob = (dataurl: string) => {
                            const arr = dataurl.split(',');
                            const mime = arr[0].match(/:(.*?);/)![1];
                            const bstr = atob(arr[1]);
                            let n = bstr.length;
                            const u8arr = new Uint8Array(n);
                            while (n--) {
                                u8arr[n] = bstr.charCodeAt(n);
                            }
                            return new Blob([u8arr], { type: mime });
                        };

                        const blob = dataURLtoBlob(firmaDataUrl);
                        const fileName = `firmas/${id}/${Date.now()}-firma.png`;
                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('fotos-reportes')
                            .upload(fileName, blob, { contentType: 'image/png', upsert: true });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('fotos-reportes')
                            .getPublicUrl(uploadData.path);
                        
                        signatureUrl = publicUrl;
                    } catch (err) {
                        console.error('Error uploading signature:', err);
                        setCustomError("Error al subir la firma de conformidad: " + (err instanceof Error ? err.message : String(err)));
                        setSubmitting(false);
                        return;
                    }
                } else {
                    // Firma ya subida previamente
                    signatureUrl = firmaDataUrl;
                }
            }

            const parsedHoras = selectedHora + (selectedMinuto / 60);

            const reportData: any = {
                orden_id: parseInt(id!),
                creador_id: reporte?.creador_id || currentUserId,
                trabajo_realizado: trabajoRealizado,
                material_utilizado: materialUtilizado || '',
                firma_url: signatureUrl,
                horas_trabajadas: parsedHoras,
                fotos_urls: fotos.length > 0 ? fotos : [],
                facturas_urls: facturas.length > 0 ? facturas : [],
                fecha_trabajo: fecha || new Date().toISOString().split('T')[0],
                creado_en: reporte?.creado_en || new Date().toISOString()
            };

            const saveReport = async (data: any) => {
                if (reporte?.id) {
                    return await supabase.from('reportes').update(data).eq('id', reporte.id).select('id').single();
                } else {
                    return await supabase.from('reportes').insert(data).select('id').single();
                }
            };

            const { data: savedReport, error: errorReporte } = await saveReport(reportData);

            if (errorReporte) {
                console.error("Error saving report:", errorReporte);
                setCustomError("Error al guardar el reporte técnico: " + errorReporte.message);
                setSubmitting(false);
                return;
            }

            // Si es un parte nuevo, guardamos su id para que un reintento no duplique el registro
            if (savedReport && !reporte?.id) {
                setReporte({ ...reportData, id: savedReport.id });
            }

            // Actualizar el estado de la orden (servicio) en Ribera
            const terminadoId = estadoIds.get('Terminado');
            const enCursoId = estadoIds.get('En curso');
            const newEstadoId = concluido ? terminadoId : enCursoId;

            if (!newEstadoId) {
                setCustomError("Error interno: no se encontró el estado de servicio necesario. Contacte con oficina.");
                setSubmitting(false);
                return;
            }

            const { error: errorServicio, count, status } = await supabase
                .from('servicios')
                .update({ estado_id: newEstadoId }, { count: 'exact' })
                .eq('id', id);

            console.log('Finalizar servicio:', { newEstadoId, count, status });

            if (errorServicio) {
                console.error("Error updating orden status:", errorServicio);
                setCustomError(
                    "El parte se ha guardado, pero no se pudo actualizar el estado del servicio: " +
                    errorServicio.message +
                    ". Pulse 'Guardar cambios' de nuevo para reintentar."
                );
                setSubmitting(false);
                return;
            }

            if (count === 0) {
                console.warn('Finalizar servicio: 0 filas actualizadas. Posible problema RLS o empleado_id no coincide.');
                setCustomError(
                    "El parte se ha guardado, pero no se pudo cambiar el estado del servicio (0 filas afectadas). " +
                    "Comprueba en el backend que este servicio esté asignado a tu empleado vinculado."
                );
                setSubmitting(false);
                return;
            }

            setSubmitting(false);
            await fetchOrden();
            setSaveSuccess(true);
        } catch (globalError) {
            console.error("Error global en handleComplete:", globalError);
            setCustomError("Error crítico al procesar el guardado: " + (globalError instanceof Error ? globalError.message : String(globalError)));
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold mt-20">Cargando...</div>;

    return (
        <div className="bg-[#f0f2f5] min-h-[100dvh] font-sans pb-10">
            {/* Top Bar */}
            <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/m/ordenes')} className="text-slate-600">
                        <span className="material-symbols-outlined select-none">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">Servicio: {orden?.id_legible}</h1>
                </div>
            </div>

            {/* DATOS DEL SERVICIO */}
            <div className="bg-white p-5 space-y-4 shadow-sm border-b border-slate-200">
                 <div className="flex justify-between items-start">
                     <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Cliente</p>
                          <h2 className="text-lg font-bold text-slate-800 leading-tight mt-1">{orden?.cliente}</h2>
                     </div>
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                          {orden?.aseguradora}
                     </span>
                 </div>

                 {/* Contacto y Teléfono */}
                 {(orden?.asegurado || orden?.telefono_asegurado) && (
                     <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Contacto</p>
                              <p className="text-sm font-semibold text-slate-700 mt-1">{orden?.asegurado || '-'}</p>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">call</span>Teléfono</p>
                              {orden?.telefono_asegurado ? (
                                  <a href={`tel:${orden.telefono_asegurado}`} className="text-sm font-bold text-blue-600 mt-1 block">{orden.telefono_asegurado}</a>
                              ) : (
                                  <p className="text-sm text-slate-400 mt-1">-</p>
                              )}
                          </div>
                     </div>
                 )}
                 
                 {/* Dirección */}
                 <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>Dirección de Entrega / Trabajo</p>
                      <p className="text-sm font-semibold text-slate-700 mt-1">{orden?.direccion || 'No especificada'}</p>
                 </div>

                 {/* Información del Trabajo */}
                 <div className="pt-3 border-t border-slate-100 bg-blue-50/50 -mx-4 px-4 py-4 space-y-4">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-tight flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">assignment</span>
                          Información del Trabajo
                      </p>

                      {/* Tipo de servicio y documento de origen */}
                      <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                              {tipoServicioNombre}
                          </span>
                          {orden?.num_documento && (
                              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                  Ref. {orden.num_documento}
                              </span>
                          )}
                      </div>

                      {/* Notas / trabajo a realizar */}
                      <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight mb-1">Trabajo a realizar / Notas</p>
                          {orden?.descripcion ? (
                              <p className="text-sm font-medium text-slate-800 whitespace-pre-wrap">{orden.descripcion}</p>
                          ) : (
                              <p className="text-sm text-slate-400 italic">Sin notas registradas</p>
                          )}
                      </div>

                      {/* Materiales / Artículos a instalar o llevar */}
                      <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                              Materiales / Artículos
                          </p>
                          {materialesOrden.length > 0 ? (
                              <ul className="space-y-1.5">
                                  {materialesOrden.map((mat: any, idx: number) => (
                                      <li key={idx} className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
                                          <span className="flex-1">{mat.descripcion}</span>
                                          <span className="shrink-0 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">x{Number(mat.cantidad || 1).toFixed(2)}</span>
                                      </li>
                                  ))}
                              </ul>
                          ) : (
                              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                                  Sin materiales registrados — consulte con oficina
                              </p>
                          )}
                      </div>
                 </div>

                  {/* INTERVENCIONES REALIZADAS */}
                  <div className="pt-5 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                           <span className="material-symbols-outlined text-[18px]">history</span>
                           Partes de Trabajo ({reportes.length})
                        </h3>
                        <button
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                            className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            NUEVO PARTE
                        </button>
                      </div>

                      {reportes.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                            <p className="text-xs text-slate-400 font-medium italic">No hay partes de trabajo registrados aún.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                            {reportes.map((rep, idx) => {
                                const canEdit = currentUserRole === 'Administrador' || currentUserRole === 'Coordinador' || rep.creador_id === currentUserId;
                                const canDelete = currentUserRole === 'Administrador';
                                const tecnicoInfo = trabajadoresMap.get(rep.creador_id);
                                const tecnicoName = tecnicoInfo?.nombre || 'Técnico';

                                return (
                                    <div
                                        key={rep.id}
                                        className={`p-3 rounded-xl border transition-all relative ${reporte?.id === rep.id ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">PARTE #{reportes.length - idx}</span>
                                                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">person</span>
                                                    {tecnicoName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded uppercase">
                                                    {new Date(rep.fecha_trabajo || rep.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                                </span>
                                                {canDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(rep.id); }}
                                                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 active:scale-90 transition-all"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xs font-bold text-slate-800 line-clamp-2">
                                                {rep.trabajo_realizado || <span className="italic text-slate-400 font-normal">(Sin descripción)</span>}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {rep.horas_trabajadas > 0 && (
                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">schedule</span> {rep.horas_trabajadas}h
                                                        </span>
                                                    )}
                                                    {(rep.firma_url && typeof rep.firma_url === 'string' && rep.firma_url.length > 50) && (
                                                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">verified</span> FIRMADO
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={() => setViewingReport(rep)}
                                                    className="flex-1 bg-primary/10 text-primary text-[10px] font-black py-2 rounded-lg hover:bg-primary/20 active:scale-95 transition-all"
                                                >
                                                    VER DETALLE
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => loadReportData(rep)}
                                                        className="flex-1 bg-primary text-white text-[10px] font-black py-2 rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                                                    >
                                                        EDITAR
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      )}
                  </div>
            </div>

            {/* MODAL FORMULARIO DE INTERVENCIÓN */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !submitting && setShowForm(false)}
                    />

                    <div className="relative w-full max-w-2xl bg-[#f0f2f5] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[95vh] flex flex-col">
                        
                        <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reporte?.id ? 'bg-primary text-white shadow-md' : 'bg-primary/10 text-primary'}`}>
                                    <span className="material-symbols-outlined text-[20px]">{reporte?.id ? 'edit_note' : 'add_notes'}</span>
                                </div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight">
                                    {reporte?.id ? 'Editar Parte de Trabajo' : 'Nueva Intervención'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => !submitting && setShowForm(false)}
                                className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all p-1"
                            >
                                <span className="material-symbols-outlined text-[28px]">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 pb-24 space-y-6">
                            {/* Fecha y Horas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Fecha del Trabajo</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <div>
                                         <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Horas</label>
                                         <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-3 py-2">
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedHora(Math.max(0, selectedHora - 1))}
                                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold"
                                            >
                                                −
                                            </button>
                                            <span className="text-xl font-black text-primary">{selectedHora.toString().padStart(2, '0')}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedHora(selectedHora + 1)}
                                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold"
                                            >
                                                +
                                            </button>
                                         </div>
                                     </div>
                                     <div>
                                         <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Minutos</label>
                                         <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-3 py-2">
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedMinuto(Math.max(0, selectedMinuto - 15))}
                                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold"
                                            >
                                                −
                                            </button>
                                            <span className="text-xl font-black text-primary">{selectedMinuto.toString().padStart(2, '0')}</span>
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedMinuto(Math.min(45, selectedMinuto + 15))}
                                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold"
                                            >
                                                +
                                            </button>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            {/* Técnico asignado */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Técnico encargado</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
                                    <span className="text-sm font-bold text-slate-800">{currentUserName}</span>
                                </div>
                            </div>

                            {/* Trabajo Realizado */}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-2 pl-1">Trabajo Realizado</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Describa qué se ha hecho en esta visita..."
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    value={trabajoRealizado}
                                    onChange={(e) => setTrabajoRealizado(e.target.value)}
                                />
                            </div>

                            {/* Material Utilizado */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-800 pl-1">Material y Gastos</label>
                                    <button
                                        type="button"
                                        onClick={() => facturaInputRef.current?.click()}
                                        disabled={uploadingFactura}
                                        className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg disabled:opacity-50"
                                    >
                                        {uploadingFactura ? 'Subiendo...' : 'Añadir Factura/Gasto'}
                                    </button>
                                </div>
                                <input
                                    ref={facturaInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleFacturaUpload}
                                />
                                <textarea 
                                    rows={3}
                                    placeholder="Materiales usados, repuestos, peajes, etc..."
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                    value={materialUtilizado}
                                    onChange={(e) => setMaterialUtilizado(e.target.value)}
                                />
                                {facturaPreviews.length > 0 && (
                                    <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                                        {facturaPreviews.map((src, i) => (
                                            <div key={i} className="relative shrink-0">
                                                <img src={src} alt="Factura" className="w-16 h-16 object-cover rounded-lg border border-amber-200" />
                                                <button onClick={() => handleDeleteFactura(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CONCLUSIÓN DEL TRABAJO / ESTADO TRAS LA VISITA */}
                            <div className="space-y-3 pt-2">
                                <label className="block text-xs font-bold text-slate-800 pl-1 font-sans">Estado tras la visita (Conclusión de la orden)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setConcluido(false)}
                                        className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border shadow-sm ${
                                            !concluido 
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-amber-100' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">pending</span>
                                        SIGUE EN CURSO
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setConcluido(true)}
                                        className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border shadow-sm ${
                                            concluido 
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        TRABAJO TERMINADO
                                    </button>
                                </div>
                            </div>

                            {/* FIRMA DE CONFORMIDAD */}
                            <div className="space-y-4 pt-2">
                                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Conformidad del Cliente (Firma)</h2>
                                <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative h-[180px] flex flex-col items-center justify-center">
                                    {firmaDataUrl ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-2 relative">
                                            <img src={firmaDataUrl} alt="Firma del Cliente" className="h-full object-contain select-none pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 select-none">
                                            <span className="material-symbols-outlined text-[32px] text-slate-300">gesture</span>
                                            <span className="text-xs">Sin firma registrada</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    {firmaDataUrl ? (
                                        <button 
                                            type="button"
                                            onClick={clearSignature} 
                                            className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-50 hover:bg-red-100/60 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                            Borrar Firma
                                        </button>
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={openSignatureModal} 
                                            className="flex items-center gap-1.5 text-primary font-bold text-xs bg-slate-100 hover:bg-slate-200/80 px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit_square</span>
                                            FIRMAR
                                        </button>
                                    )}
                                    <p className="text-[10px] text-slate-400 italic">
                                        {concluido ? 'Requerido para guardar como Terminado' : 'Opcional si sigue en curso'}
                                    </p>
                                </div>
                            </div>

                            {/* BOTONES DE ACCIÓN */}
                            <div className="space-y-4 pt-6">
                                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
                                
                                {fotoPreviews.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {fotoPreviews.map((src, i) => (
                                            <div key={i} className="relative shrink-0">
                                                <img src={src} className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm" alt="Trabajo" />
                                                <button onClick={() => handleDeleteFoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFoto}
                                    className="w-full bg-accent text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">photo_camera</span>
                                    {uploadingFoto ? 'SUBIENDO...' : 'AÑADIR FOTOS DE LA VISITA'}
                                </button>

                                <button 
                                    onClick={handleComplete}
                                    disabled={submitting || uploadingFoto}
                                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex justify-center items-center gap-3 text-lg"
                                >
                                    <span className="material-symbols-outlined">
                                        {submitting ? 'sync' : 'done_all'}
                                    </span>
                                    {submitting ? 'GUARDANDO...' : (reporte?.id ? 'GUARDAR CAMBIOS' : 'GUARDAR PARTE DE TRABAJO')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA FIRMA DEL CLIENTE */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={cancelModalSignature}
                    />

                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in scale-in duration-200">
                        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">edit_square</span>
                                <h3 className="text-base font-black text-slate-800 tracking-tight">Firma de Conformidad</h3>
                            </div>
                            <button 
                                onClick={cancelModalSignature}
                                className="text-slate-400 hover:text-slate-600 active:scale-95 transition-all p-1"
                            >
                                <span className="material-symbols-outlined text-[24px]">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                Por favor, indique al cliente que dibuje su firma sobre el lienzo en blanco. Intente realizar trazos firmes.
                            </p>
                            
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden touch-none relative h-[240px] flex items-center justify-center">
                                <canvas 
                                    ref={canvasRef}
                                    className="w-full h-full relative z-10 cursor-crosshair bg-slate-50"
                                    onMouseDown={startDrawing}
                                    onMouseUp={stopDrawing}
                                    onMouseOut={stopDrawing}
                                    onMouseMove={draw}
                                    onTouchStart={startDrawing}
                                    onTouchEnd={stopDrawing}
                                    onTouchCancel={stopDrawing}
                                    onTouchMove={draw}
                                    width={600}
                                    height={300}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={clearModalCanvas}
                                    className="flex-1 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-xs flex justify-center items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                                    LIMPIAR LIENZO
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={saveModalSignature}
                                    disabled={!hasSignature}
                                    className="flex-1 bg-primary disabled:opacity-50 text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 active:scale-95 transition-all text-xs flex justify-center items-center gap-1.5 shadow-md"
                                >
                                    <span className="material-symbols-outlined text-[16px]">done</span>
                                    CONFIRMAR FIRMA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETALLE SOLO LECTURA */}
            {viewingReport && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setViewingReport(null)}
                    />

                    <div className="relative w-full max-w-2xl bg-[#f0f2f5] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] flex flex-col">
                        
                        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-2xl">person</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight">
                                            {trabajadoresMap.get(viewingReport.creador_id)?.nombre || 'Técnico'}
                                        </h2>
                                        <p className="text-sm text-white/80 font-medium">Técnico Instalador</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingReport(null)} className="text-white/80 hover:text-white">
                                    <span className="material-symbols-outlined text-[28px]">close</span>
                                </button>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-sm text-white/70">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                    {new Date(viewingReport.fecha_trabajo || viewingReport.creado_en).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                                {viewingReport.horas_trabajadas > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                                        {viewingReport.horas_trabajadas}h
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="overflow-y-auto p-6 pb-24 space-y-6">
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Trabajo Realizado</h3>
                                <div className="bg-white rounded-xl p-4 border border-slate-200">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingReport.trabajo_realizado || 'Sin descripción'}</p>
                                </div>
                            </div>

                            {viewingReport.material_utilizado && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Materiales / Gastos</h3>
                                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingReport.material_utilizado}</p>
                                    </div>
                                </div>
                            )}

                            {viewingReport.fotos_urls && viewingReport.fotos_urls.length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Fotos del Trabajo ({viewingReport.fotos_urls.length})</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {viewingReport.fotos_urls.map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white">
                                                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewingReport.facturas_urls && viewingReport.facturas_urls.length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Facturas / Recibos ({viewingReport.facturas_urls.length})</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {viewingReport.facturas_urls.map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden border border-amber-200 bg-white">
                                                <img src={url} alt={`Factura ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewingReport.firma_url && (
                                <div>
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Firma del Cliente</h3>
                                    <div className="bg-white rounded-xl p-4 border border-slate-200 flex justify-center">
                                        <img src={viewingReport.firma_url} alt="Firma" className="max-h-32 object-contain" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ERROR PERSONALIZADO */}
            {customError && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCustomError(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden animate-in scale-in duration-200 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[28px]">error</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mt-2">Atención</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">{customError}</p>
                            
                            <button
                                onClick={() => setCustomError(null)}
                                className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all text-sm shadow-md mt-4"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ÉXITO PERSONALIZADO */}
            {saveSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden animate-in scale-in duration-200 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[28px]">check_circle</span>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight mt-2">¡Guardado con éxito!</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">El reporte técnico se ha guardado correctamente.</p>
                            
                            <div className="flex flex-col w-full gap-2 mt-6">
                                <button
                                    onClick={() => {
                                        setSaveSuccess(false);
                                        setShowForm(false);
                                        localStorage.setItem('last_active_order', id || '');
                                        navigate('/m/ordenes');
                                    }}
                                    className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all text-sm shadow-md"
                                >
                                    Volver a Órdenes
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setSaveSuccess(false);
                                        resetForm();
                                        setShowForm(true);
                                    }}
                                    className="w-full bg-accent text-white font-black py-3.5 rounded-xl hover:bg-accent/90 active:scale-95 transition-all text-sm shadow-md"
                                >
                                    Añadir otro parte
                                </button>

                                <button
                                    onClick={() => {
                                        setSaveSuccess(false);
                                        setShowForm(false);
                                    }}
                                    className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 active:scale-95 transition-all text-sm"
                                >
                                    Cerrar y Ver Orden
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileDetalleOrden;
