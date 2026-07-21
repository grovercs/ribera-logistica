-- =======================================================
-- SEGURIDAD Y CONTROL DE ACCESO (RLS) - LOGÍSTICA RIBERA
-- Compatibilidad: PostgreSQL / Supabase
-- =======================================================

-- -------------------------------------------------------
-- 1. SINCRONIZACIÓN DE USUARIOS (auth.users -> public.perfiles)
-- -------------------------------------------------------

-- Función para manejar la inserción automática de perfiles desde auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, rol, activo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Nuevo Usuario'),
        COALESCE((new.raw_user_meta_data->>'rol')::public.rol_usuario, 'Instalador'::public.rol_usuario),
        true
    );
    
    -- Vincular automáticamente empleado si coincide el email
    UPDATE public.empleados
    SET perfil_id = new.id
    WHERE email = new.email;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función anterior al registrar usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------
-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------

ALTER TABLE public.tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_crm_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correos_historial ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 3. FUNCIONES AUXILIARES PARA POLÍTICAS
-- -------------------------------------------------------

-- Función para comprobar si el usuario actual es Administrador o Coordinador
CREATE OR REPLACE FUNCTION public.es_personal_logistica(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_rol public.rol_usuario;
BEGIN
    SELECT rol INTO v_rol FROM public.perfiles WHERE id = user_id;
    RETURN v_rol IN ('Administrador', 'Coordinador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- 4. POLÍTICAS DE ACCESO (POLICIES)
-- -------------------------------------------------------

-- --- TABLAS DE CATÁLOGO (Lectura pública, Escritura Admin/Coordinador) ---

CREATE POLICY "Lectura para usuarios autenticados" ON public.tiendas
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura completa para Administradores y Coordinadores" ON public.tiendas
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Lectura para usuarios autenticados" ON public.estados
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura completa para Administradores y Coordinadores" ON public.estados
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Lectura para usuarios autenticados" ON public.tipos_documentos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura completa para Administradores y Coordinadores" ON public.tipos_documentos
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Lectura para usuarios autenticados" ON public.tipos_servicios
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Escritura completa para Administradores y Coordinadores" ON public.tipos_servicios
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));


-- --- PERFILES DE USUARIO ---

CREATE POLICY "Lectura de perfiles para usuarios autenticados" ON public.perfiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Actualizar propio perfil" ON public.perfiles
    FOR UPDATE TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Administración de perfiles" ON public.perfiles
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));


-- --- EMPLEADOS Y VEHÍCULOS ---

CREATE POLICY "Lectura de empleados para usuarios autenticados" ON public.empleados
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestión de empleados para personal de logística" ON public.empleados
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Lectura de vehículos para usuarios autenticados" ON public.vehiculos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestión de vehículos para personal de logística" ON public.vehiculos
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));


-- --- CACHÉ DE CLIENTES CRM ---

CREATE POLICY "Lectura de clientes crm para usuarios autenticados" ON public.clientes_crm_cache
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestión de clientes crm para personal de logística" ON public.clientes_crm_cache
    FOR ALL TO authenticated USING (public.es_personal_logistica(auth.uid()));


-- --- SERVICIOS (LÓGICA PRINCIPAL DE LOGÍSTICA) ---

-- Políticas para servicios
CREATE POLICY "Lectura de servicios" ON public.servicios
    FOR SELECT TO authenticated
    USING (
        public.es_personal_logistica(auth.uid())
        OR 
        empleado_id IN (
            SELECT id FROM public.empleados WHERE perfil_id = auth.uid()
        )
    );

CREATE POLICY "Inserción de servicios" ON public.servicios
    FOR INSERT TO authenticated
    WITH CHECK (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Actualización de servicios" ON public.servicios
    FOR UPDATE TO authenticated
    USING (
        public.es_personal_logistica(auth.uid())
        OR 
        empleado_id IN (
            SELECT id FROM public.empleados WHERE perfil_id = auth.uid()
        )
    )
    WITH CHECK (
        public.es_personal_logistica(auth.uid())
        OR 
        -- Los instaladores solo pueden actualizar el estado de sus propios servicios
        (
            empleado_id IN (
                SELECT id FROM public.empleados WHERE perfil_id = auth.uid()
            )
            -- Y no pueden cambiar otros datos de la cabecera (eso lo controla el Frontend/Server Actions)
        )
    );

CREATE POLICY "Eliminación de servicios" ON public.servicios
    FOR DELETE TO authenticated
    USING (public.es_personal_logistica(auth.uid()));


-- --- TABLAS RELACIONADAS / HIJAS (Heredan visibilidad de Servicios) ---

-- Materiales
CREATE POLICY "Lectura de materiales por servicio visible" ON public.servicios_materiales
    FOR SELECT TO authenticated
    USING (servicio_id IN (SELECT id FROM public.servicios));

CREATE POLICY "Gestión de materiales de servicios" ON public.servicios_materiales
    FOR ALL TO authenticated
    USING (public.es_personal_logistica(auth.uid()))
    WITH CHECK (public.es_personal_logistica(auth.uid()));

-- Trabajos Propios
CREATE POLICY "Lectura de trabajos propios por servicio visible" ON public.servicios_trabajos
    FOR SELECT TO authenticated
    USING (servicio_id IN (SELECT id FROM public.servicios));

CREATE POLICY "Gestión de trabajos propios de servicios" ON public.servicios_trabajos
    FOR ALL TO authenticated
    USING (public.es_personal_logistica(auth.uid()))
    WITH CHECK (public.es_personal_logistica(auth.uid()));

-- Servicios Externos
CREATE POLICY "Lectura de servicios externos por servicio visible" ON public.servicios_externos
    FOR SELECT TO authenticated
    USING (servicio_id IN (SELECT id FROM public.servicios));

CREATE POLICY "Gestión de servicios externos de servicios" ON public.servicios_externos
    FOR ALL TO authenticated
    USING (public.es_personal_logistica(auth.uid()))
    WITH CHECK (public.es_personal_logistica(auth.uid()));

-- Incidencias
CREATE POLICY "Lectura de incidencias por servicio visible" ON public.servicios_incidencias
    FOR SELECT TO authenticated
    USING (servicio_id IN (SELECT id FROM public.servicios));

CREATE POLICY "Actualización y creación de incidencias" ON public.servicios_incidencias
    FOR ALL TO authenticated
    USING (
        public.es_personal_logistica(auth.uid())
        OR 
        servicio_id IN (
            SELECT id FROM public.servicios WHERE empleado_id IN (
                SELECT id FROM public.empleados WHERE perfil_id = auth.uid()
            )
        )
    );

-- Historial de Correos
CREATE POLICY "Lectura de historial de correos" ON public.servicios_correos
    FOR SELECT TO authenticated
    USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Inserción en historial de correos" ON public.servicios_correos
    FOR INSERT TO authenticated
    WITH CHECK (public.es_personal_logistica(auth.uid()));

-- Configuración de Correo (SMTP)
ALTER TABLE public.configuracion_correo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de configuración de correo" ON public.configuracion_correo
    FOR SELECT TO authenticated
    USING (public.es_personal_logistica(auth.uid()));

CREATE POLICY "Gestión de configuración de correo" ON public.configuracion_correo
    FOR ALL TO authenticated
    USING (public.es_personal_logistica(auth.uid()))
    WITH CHECK (public.es_personal_logistica(auth.uid()));
