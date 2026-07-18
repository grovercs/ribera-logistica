-- ==========================================
-- TABLA DE REPORTES TÉCNICOS - LOGÍSTICA RIBERA
-- Compatibilidad: PostgreSQL / Supabase
-- ==========================================

-- Tabla de Reportes/Partes de Trabajo que rellenan los técnicos
CREATE TABLE IF NOT EXISTS public.reportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id INTEGER REFERENCES public.servicios(id) ON DELETE CASCADE,
    creador_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL, -- Enlazado al perfil del técnico
    fecha_trabajo DATE NOT NULL DEFAULT CURRENT_DATE,
    trabajo_realizado TEXT NOT NULL,
    material_utilizado TEXT,
    horas_trabajadas NUMERIC(4,2) DEFAULT 0.00,
    firma_url TEXT,
    fotos_urls TEXT[] DEFAULT '{}',
    facturas_urls TEXT[] DEFAULT '{}',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas si existen
DROP POLICY IF EXISTS "Permitir lectura de reportes a todos los autenticados" ON public.reportes;
DROP POLICY IF EXISTS "Permitir inserción de reportes a los tecnicos" ON public.reportes;
DROP POLICY IF EXISTS "Permitir actualización de reportes a administradores o al creador" ON public.reportes;

-- Políticas de RLS
CREATE POLICY "Permitir lectura de reportes a todos los autenticados" 
ON public.reportes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción de reportes a los tecnicos" 
ON public.reportes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir actualización de reportes a administradores o al creador" 
ON public.reportes FOR UPDATE TO authenticated USING (
  auth.uid() = creador_id OR 
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol IN ('Administrador', 'Coordinador'))
);

-- -------------------------------------------------------
-- CONFIGURACIÓN DE STORAGE EN SUPABASE (BUCKET PARA FOTOS/FIRMAS)
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-reportes', 'fotos-reportes', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas para el bucket fotos-reportes si no existen
DROP POLICY IF EXISTS "Permitir acceso público de lectura a fotos-reportes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida a usuarios autenticados en fotos-reportes" ON storage.objects;

CREATE POLICY "Permitir acceso público de lectura a fotos-reportes" 
ON storage.objects FOR SELECT TO public USING (bucket_id = 'fotos-reportes');

CREATE POLICY "Permitir subida a usuarios autenticados en fotos-reportes" 
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos-reportes');

