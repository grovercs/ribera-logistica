-- =======================================================
-- DATOS DE INICIALIZACIÓN (SEED) - LOGÍSTICA RIBERA
-- Compatibilidad: PostgreSQL / Supabase
-- =======================================================

-- -------------------------------------------------------
-- 1. TIENDAS / ALMACENES
-- -------------------------------------------------------
INSERT INTO public.tiendas (id, nombre) VALUES
(1, 'ALMACEN'),
(2, 'Brico'),
(3, 'Decor'),
(4, 'Expo'),
(5, 'Hogar'),
(6, 'OFICINAS')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Ajustar la secuencia de IDs de tiendas
SELECT setval('public.tiendas_id_seq', COALESCE((SELECT MAX(id) FROM public.tiendas), 1));

-- -------------------------------------------------------
-- 2. ESTADOS DE SERVICIO
-- -------------------------------------------------------
INSERT INTO public.estados (id, nombre) VALUES
(1, 'Pendiente'),
(2, 'En curso'),
(3, 'Terminado'),
(4, 'Facturado/Cerrado'),
(5, 'Aplazado'),
(6, 'Anulado')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Ajustar la secuencia de IDs de estados
SELECT setval('public.estados_id_seq', COALESCE((SELECT MAX(id) FROM public.estados), 1));

-- -------------------------------------------------------
-- 3. TIPOS DE DOCUMENTO
-- -------------------------------------------------------
INSERT INTO public.tipos_documentos (id, nombre) VALUES
(1, 'Presupuesto'),
(2, 'Pedido'),
(3, 'Albarán'),
(4, 'Factura'),
(5, 'SERVICIO INTERNO')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Ajustar la secuencia de IDs de tipos de documentos
SELECT setval('public.tipos_documentos_id_seq', COALESCE((SELECT MAX(id) FROM public.tipos_documentos), 1));

-- -------------------------------------------------------
-- 4. TIPOS DE SERVICIO CON COLORES DE INTERFAZ DELPHI
-- -------------------------------------------------------
INSERT INTO public.tipos_servicios (id, nombre, color) VALUES
(1, 'Solo llevar', '#A0A0A0'),                   -- Gris
(2, 'Llevar y montar', '#808000'),                -- Verde Oliva / Ocre
(3, 'DIA PERSONAL', '#000080'),                   -- Azul Marino
(4, 'Llevar e instalar + trabajos', '#800080'),   -- Púrpura / Morado
(5, 'Medir', '#008080'),                          -- Verde Azulado
(6, 'RIBERA VIELHA', '#C0C0C0'),                  -- Gris Claro
(7, 'REPARACION VELUX', '#FF0000'),               -- Rojo
(8, 'VACACIONES', '#00FF00'),                     -- Verde Brillante
(9, 'TRABAJOS VARIOS', '#808080'),                -- Gris Oscuro
(10, 'MANTENIMIENTO ESTUFA', '#FF3333'),          -- Rojo Claro
(11, 'FURGO', '#339999'),                         -- Turquesa
(12, 'FIESTA', '#3399FF'),                        -- Azul Claro
(13, 'MONTAJE VELUX', '#FF6600'),                 -- Naranja
(14, 'MONTAR MAMPARA', '#CC0099')                 -- Fucsia
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, color = EXCLUDED.color;

-- Ajustar la secuencia de IDs de tipos de servicios
SELECT setval('public.tipos_servicios_id_seq', COALESCE((SELECT MAX(id) FROM public.tipos_servicios), 1));
