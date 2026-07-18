-- ========================================================
-- AMPLIACIÓN DE ESQUEMA PARA TÉCNICOS EXTERNOS Y PAGOS
-- Compatibilidad: PostgreSQL / Supabase
-- ========================================================

-- 1. Ampliar la tabla de empleados (técnicos)
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'interno'; -- 'interno', 'empresa_externa', 'autonomo'
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS razon_social TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS cif_nif TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS direccion_fiscal TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS tecnico_autorizado TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS iban TEXT;
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(6,2) DEFAULT 0.00;

-- 2. Añadir control financiero detallado en la tabla de reportes
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS estado_liquidacion TEXT DEFAULT 'Pendiente'; -- 'Pendiente', 'Pagado'
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS fecha_pago DATE;
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS medio_pago TEXT; -- 'Transferencia', 'Recibo Bancario', 'Efectivo', 'Otros'
ALTER TABLE public.reportes ADD COLUMN IF NOT EXISTS notas_pago TEXT;
