-- ==========================================
-- ESQUEMA DE BASE DE DATOS - LOGÍSTICA RIBERA
-- Compatibilidad: PostgreSQL / Supabase
-- ==========================================

-- Habilitar extensión UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 1. CATÁLOGOS BÁSICOS
-- ------------------------------------------

-- Catálogo de Tiendas / Almacenes
CREATE TABLE IF NOT EXISTS public.tiendas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- Catálogo de Estados del Servicio
CREATE TABLE IF NOT EXISTS public.estados (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- Catálogo de Tipos de Documento CRM
CREATE TABLE IF NOT EXISTS public.tipos_documentos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- Catálogo de Tipos de Servicio y sus Colores
CREATE TABLE IF NOT EXISTS public.tipos_servicios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT -- Almacenará el color en código hexadecimal (ej: #FF5733)
);

-- ------------------------------------------
-- 2. USUARIOS, OPERARIOS Y RECURSOS
-- ------------------------------------------

-- Enumeración de Roles de Acceso
CREATE TYPE public.rol_usuario AS ENUM ('Administrador', 'Coordinador', 'Operario', 'Consultivo', 'Instalador');

-- Perfiles de usuario (Vinculados con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT,
    telefono TEXT,
    rol public.rol_usuario NOT NULL DEFAULT 'Instalador',
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Operarios/Empleados de Campo
CREATE TABLE IF NOT EXISTS public.empleados (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    notas TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL
);

-- Flota de Vehículos
CREATE TABLE IF NOT EXISTS public.vehiculos (
    id SERIAL PRIMARY KEY,
    vehiculo TEXT NOT NULL,
    matricula TEXT,
    tipo TEXT CHECK (tipo IN ('Coche', 'Furgoneta', 'Camión'))
);

-- ------------------------------------------
-- 3. CACHÉ DE INTEGRACIÓN CRM (LECTURA)
-- ------------------------------------------

-- Caché local de Clientes del CRM (para optimización y offline)
CREATE TABLE IF NOT EXISTS public.clientes_crm_cache (
    id SERIAL PRIMARY KEY,
    codigo_cliente INTEGER NOT NULL UNIQUE,
    cif TEXT,
    nombre TEXT,
    razon_social TEXT,
    direccion TEXT,
    poblacion TEXT,
    cod_postal TEXT,
    provincia TEXT,
    telefono TEXT,
    email TEXT,
    nombre_contacto TEXT,
    telefono_contacto TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------
-- 4. SERVICIOS Y LOGÍSTICA (TABLAS PRINCIPALES)
-- ------------------------------------------

-- Tabla Principal de Servicios/Instalaciones
CREATE TABLE IF NOT EXISTS public.servicios (
    id SERIAL PRIMARY KEY,
    codigo_servicio TEXT NOT NULL UNIQUE, -- Formato: YY-TiendaId-Correlativo (ej. 26-2-07053)
    codigo_barras TEXT,
    
    -- Relación con Cliente (Caché CRM)
    cliente_id INTEGER, -- Puede hacer referencia a public.clientes_crm_cache.codigo_cliente
    nombre_cliente TEXT NOT NULL,
    
    -- Relaciones con Catálogos
    tienda_id INTEGER REFERENCES public.tiendas(id) ON DELETE RESTRICT,
    tipo_servicio_id INTEGER REFERENCES public.tipos_servicios(id) ON DELETE RESTRICT,
    estado_id INTEGER REFERENCES public.estados(id) ON DELETE RESTRICT,
    tipo_documento_id INTEGER REFERENCES public.tipos_documentos(id) ON DELETE RESTRICT,
    
    -- Documentación
    num_documento TEXT,
    ubicacion TEXT, -- Ubicación física o referencia interna
    
    -- Fechas y Horarios
    fecha_entrega DATE,
    fecha_prevista DATE,
    fecha_inicio DATE,
    fecha_fin DATE,
    hora_entrega_ini TIME,
    hora_entrega_fin TIME,
    
    -- Asignación
    empleado_id INTEGER REFERENCES public.empleados(id) ON DELETE SET NULL, -- Operario asignado
    
    -- Destino y Logística de Entrega
    dest_direccion TEXT,
    dest_num TEXT,
    dest_piso TEXT,
    dest_letra TEXT,
    dest_cod_postal TEXT,
    dest_poblacion TEXT,
    dest_provincia TEXT,
    dest_ascensor BOOLEAN DEFAULT false,
    dest_acceso_furgo BOOLEAN DEFAULT false,
    dest_acceso_camion BOOLEAN DEFAULT false,
    dest_nombre TEXT, -- Persona de contacto en destino
    dest_tel TEXT,
    dest_observaciones TEXT,
    
    -- Totales Económicos
    total_materiales NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_serv_propio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_serv_ext NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    
    -- Control y Auditoría
    incidencias BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_servicios_fecha_entrega ON public.servicios(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_servicios_empleado_id ON public.servicios(empleado_id);
CREATE INDEX IF NOT EXISTS idx_servicios_codigo ON public.servicios(codigo_servicio);

-- Desglose de Materiales por Servicio
CREATE TABLE IF NOT EXISTS public.servicios_materiales (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE NOT NULL,
    codigo TEXT,
    descripcion TEXT NOT NULL,
    precio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    total NUMERIC(10,2) GENERATED ALWAYS AS (precio * cantidad) STORED
);

-- Desglose de Trabajos Propios / Internos
CREATE TABLE IF NOT EXISTS public.servicios_trabajos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE NOT NULL,
    codigo TEXT,
    descripcion TEXT NOT NULL,
    precio NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    total NUMERIC(10,2) GENERATED ALWAYS AS (precio * cantidad) STORED
);

-- Desglose de Servicios Externos Subcontratados
CREATE TABLE IF NOT EXISTS public.servicios_externos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE NOT NULL,
    empresa TEXT,
    contacto TEXT,
    telefono TEXT,
    importe NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    observaciones TEXT
);

-- Incidencias Registradas en los Servicios
CREATE TABLE IF NOT EXISTS public.servicios_incidencias (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE NOT NULL,
    descripcion TEXT NOT NULL,
    solucionada BOOLEAN NOT NULL DEFAULT false,
    solucion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Historial de Correos Electrónicos Enviados
CREATE TABLE IF NOT EXISTS public.servicios_correos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE,
    destinatario TEXT NOT NULL,
    asunto TEXT NOT NULL,
    cuerpo TEXT,
    estado TEXT NOT NULL DEFAULT 'Enviado',
    error_log TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
