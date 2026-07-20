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

    // Formulario de reporte
    const [fecha, setFecha] = useState('');
    const [trabajoRealizado, setTrabajoRealizado] = useState('');
    const [materialUtilizado, setMaterialUtilizado] = useState('');
    const [selectedHora, setSelectedHora] = useState(0);
    const [selectedMinuto, setSelectedMinuto] = useState(0);
    
    const [submitting, setSubmitting] = useState(false);
    
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
    
    // Canvas para firma
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [showForm, setShowForm] = useState(false); 
    const [viewingReport, setViewingReport] = useState<any>(null); 

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
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || null;
        setCurrentUserId(userId);

        if (!userId) return;

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
            // Traer el servicio con su tienda y estado
            supabase.from('servicios').select('*, tiendas(nombre), estados(nombre)').eq('id', id).single(),
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
                creado_en: item.creado_en
            });

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

    // Lógica para firma táctil/ratón en canvas
    const startDrawing = (e: any) => {
        if (reporte?.firma_url) return; 
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

    const clearSignature = () => {
        if (!window.confirm('¿Deseas limpiar la firma actual?')) return;
        
        if (reporte?.firma_url) {
            setReporte({...reporte, firma_url: null});
        }
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        setHasSignature(false);
    };

    // Guardado del reporte
    const handleComplete = async () => {
        if (!trabajoRealizado.trim()) {
            alert("Por favor, introduce la descripción del trabajo realizado.");
            return;
        }

        setSubmitting(true);
        let signatureUrl = reporte?.firma_url;

        if (!hasSignature) {
            signatureUrl = null;
        } 
        else if (canvasRef.current && (!reporte?.firma_url || canvasRef.current.toDataURL('image/png') !== reporte.firma_url)) {
            try {
                const blob = await new Promise<Blob>((resolve) => canvasRef.current!.toBlob((b) => resolve(b!), 'image/png'));
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
                alert("Error al subir la firma de conformidad.");
                setSubmitting(false);
                return;
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
                return await supabase.from('reportes').update(data).eq('id', reporte.id);
            } else {
                return await supabase.from('reportes').insert(data);
            }
        };

        const { error: errorReporte } = await saveReport(reportData);

        if (errorReporte) {
            console.error("Error saving report:", errorReporte);
            alert("Error al guardar el reporte técnico: " + errorReporte.message);
            setSubmitting(false);
            return;
        }
        
        // Actualizar el estado de la orden (servicio) en Ribera
        // 3 = Terminado (si se firmó), 2 = En curso (si no se firmó)
        const newEstadoId = signatureUrl ? 3 : 2; 
        
        const { error: errorServicio } = await supabase
            .from('servicios')
            .update({ 
                estado_id: newEstadoId,
            })
            .eq('id', id);

        if (errorServicio) {
            console.error("Error updating orden status:", errorServicio);
            alert("Aviso: El reporte se ha guardado, pero no se pudo actualizar el estado de la orden: " + errorServicio.message);
        }

        setSubmitting(false);
        await fetchOrden(); 

        if (window.confirm("¡Reporte técnico guardado correctamente!\n\n¿Deseas volver al listado de órdenes? (Aceptar para volver, Cancelar para quedarte en esta pantalla)")) {
            setShowForm(false); 
            localStorage.setItem('last_active_order', id || '');
            navigate('/m/ordenes');
        } else {
            setShowForm(false);
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

                 {/* Observaciones / Detalles */}
                 {orden?.descripcion && (
                     <div className="pt-3 border-t border-slate-100 bg-blue-50/50 -mx-4 px-4 py-3">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-tight flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">assignment</span>
                              Detalles de la Agenda
                          </p>
                          <p className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-wrap">{orden.descripcion}</p>
                     </div>
                 )}

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

                            {/* FIRMA DE CONFORMIDAD */}
                            <div className="space-y-4 pt-2">
                                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Conformidad del Cliente (Firma)</h2>
                                <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden touch-none relative h-[180px]">
                                    {reporte?.firma_url ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                                            <img src={reporte.firma_url} alt="Firma Guardada" className="h-full object-contain" />
                                        </div>
                                    ) : (
                                        <>
                                            {!hasSignature && (
                                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm select-none">
                                                    Firmar aquí en pantalla
                                                </span>
                                            )}
                                            <canvas 
                                                ref={canvasRef}
                                                className="w-full h-full relative z-10 cursor-crosshair"
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
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] text-slate-400 italic">Requerido para finalizar el servicio</p>
                                    <button onClick={clearSignature} className="flex items-center gap-1 text-primary font-bold text-xs">
                                        <span className="material-symbols-outlined text-[14px]">ink_eraser</span>
                                        Limpiar Firma
                                    </button>
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
                                    className="w-full bg-[#ff7b1c] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
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
        </div>
    );
};

export default MobileDetalleOrden;
