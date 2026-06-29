# Contexto del Proyecto: Sistema de Logística y Calendario de Instalaciones
Estamos migrando un sistema legacy de Delphi a una arquitectura web moderna (Serverless y Autogestionada). El programa original es un software de logística enfocado en un calendario de atención al cliente e instalaciones de equipos, que interactúa con la base de datos de un CRM y cuenta con niveles de acceso de usuario.

La base de datos original está en MySQL sobre un servidor Windows obsoleto que se desea dar de baja. La nueva base de datos y la autenticación se gestionarán en **Supabase** (PostgreSQL cloud) y la aplicación se desplegará en **Netlify**.

## Stack Tecnológico Obligatorio
- **Frontend:** Next.js 14 o superior (App Router, TypeScript).
- **Estilos y UI:** Tailwind CSS, shadcn/ui (para componentes premium, consistentes y profesionales).
- **Base de Datos & Auth:** Supabase (PostgreSQL, Row Level Security - RLS).
- **ORMs/Query Builders:** Drizzle ORM o Prisma (se prefiere Drizzle por su velocidad y compatibilidad nativa con entornos Serverless).
- **Gestión de Calendario:** `@fullcalendar/react` junto con vistas de recursos (ideal para asignación de instaladores/vehículos) o `react-big-calendar`.
- **Hosting & Backend:** Netlify. Se priorizarán Next.js Server Actions sobre Netlify Functions individuales para simplificar la arquitectura, utilizando Netlify Functions solo cuando se requieran tareas programadas (Cron jobs) o procesos desacoplados de larga duración.

## Estructura de Base de Datos y Seguridad (Supabase RLS)
1. **Modelado de Datos:** PostgreSQL en Supabase. Se deben crear tablas bien normalizadas para:
   - `perfiles` (perfiles de usuario vinculados a `auth.users` de Supabase, con campos como `rol`, `nombre`, `activo`).
   - `citas` o `instalaciones` (evento, cliente, dirección, fecha_inicio, fecha_fin, instalador_id, estado, notas).
   - `recursos_instalacion` (si se requiere asociar herramientas o vehículos).
   - `crm_cache` o tablas de integración (para consultar/almacenar datos sincronizados del CRM).
2. **Row Level Security (RLS):** Cada tabla debe tener RLS habilitado.
   - Los clientes o instaladores solo deben ver y modificar los datos que les corresponden.
   - Los administradores y coordinadores de logística tendrán acceso global de lectura/escritura.
   - Las políticas RLS deben definirse mediante scripts SQL en la carpeta `src/database` o mediante migraciones de Drizzle.

## Estrategia de Migración de MySQL a Supabase
1. **Esquema:** Convertir la estructura de tablas de MySQL (DDL) a PostgreSQL compatible con Supabase.
2. **Migración de Datos:**
   - Exportar los datos de la base de datos MySQL en formato CSV o JSON.
   - Crear scripts de carga/siembra (seed scripts) en Node.js o Python para insertar los datos históricos en Supabase de forma segura, adaptando tipos de datos y relaciones de llaves foráneas.
   - Asegurar la encriptación y protección de datos sensibles durante el traslado.

## Directrices de Desarrollo
1. **Alineación Arquitectural:**
   - Toda la lógica de conexión a base de datos debe pasar por clientes seguros en el servidor (no exponer claves de Supabase `service_role` en el cliente).
   - Manejo de estados de carga (skeletons) y optimizaciones en la carga del calendario para asegurar una experiencia fluida.
   - Implementar un diseño responsivo excelente (móvil y escritorio) ya que los instaladores usarán la app en movilidad.
2. **Estética Visual Premium:**
   - La interfaz del calendario y las pantallas de gestión logística deben verse modernas, limpias y profesionales.
   - Utilizar una paleta de colores coherente y moderna (dark mode opcional o componentes con bordes suaves, sombras sutiles y micro-transiciones).
   - Nada de placeholders. Usar datos realistas o imágenes reales generadas.

## Reglas para los Agentes
1. **Autonomía Limitada:** El agente puede ejecutar comandos en la terminal (ej. iniciar el proyecto, instalar dependencias, correr scripts de migración), pero **debe generar un "Implementation Plan"** en los Artifacts antes de modificar o crear estructuras complejas de código o base de datos.
2. **Seguridad Absoluta:** Nunca hardcodear credenciales, tokens de API o contraseñas. Utilizar siempre variables de entorno (`.env.local` para desarrollo local y configuración de entorno en Netlify para producción).
3. **Validación Exhaustiva:** Probar visualmente cada nueva pantalla o flujo relevante con el navegador integrado (`Browser Use`) antes de marcar una tarea como completada.
4. **Respeto a las Preferencias del Usuario:**
   - Comunicarse prioritariamente en **español**.
   - **NO reiniciar los servidores de desarrollo de forma automática.** Permitir que el usuario lo haga o solicitarle que lo haga si es estrictamente necesario, respetando su preferencia.
   - **Preguntar dudas:** Ante cualquier duda razonable sobre la arquitectura, diseño o lógica de negocio, detenerse y consultar al usuario.
   - **Límite de reintentos (Evitar bucles):** Si una acción, comando o modificación de código falla 5 veces seguidas, detenerse de inmediato y notificar el problema con los detalles del error para decidir juntos el siguiente paso.
