const sql = require('mssql');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' });

// 1. Configuración de conexión a SQL Server (CRM local)
const configCrm = {
  server: process.env.CRM_DB_HOST || '192.168.1.215',
  user: process.env.CRM_DB_USER,
  password: process.env.CRM_DB_PASSWORD,
  database: process.env.CRM_DB_NAME || 'INTEGRAL',
  options: {
    encrypt: process.env.CRM_DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    connectTimeout: 10000,
    instanceName: process.env.CRM_DB_INSTANCE || 'INTEGRAL'
  }
};

// 2. Configuración de conexión a Supabase (PostgreSQL)
const pgConnectionString = process.env.DATABASE_URL;

if (!pgConnectionString) {
  console.error("ERROR: DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

if (!configCrm.user || !configCrm.password) {
  console.error("ERROR: Faltan credenciales de SQL Server en .env.local (CRM_DB_USER, CRM_DB_PASSWORD)");
  process.exit(1);
}

// Adaptar la URL de Supabase para el Pooler IPv4 si es necesario
let cleanConnectionString = pgConnectionString.replace(/^"|"$/g, '');
try {
  const url = new URL(cleanConnectionString);
  if (url.hostname.includes('supabase.co') && !url.hostname.includes('pooler')) {
    const hostParts = url.hostname.split('.');
    const projectId = hostParts[1];
    url.username = `${url.username}.${projectId}`;
    url.hostname = 'aws-0-eu-west-3.pooler.supabase.com';
    url.port = '6543';
    cleanConnectionString = url.toString();
  }
} catch (e) {
  console.warn("Advertencia al parsear DATABASE_URL:", e.message);
}

const pgPool = new Pool({
  connectionString: cleanConnectionString,
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  console.log("=== INICIANDO SINCRONIZACIÓN CRM A SUPABASE ===");
  console.log(`Fecha/Hora: ${new Date().toISOString()}`);

  let crmPool;
  let pgClient;
  try {
    // Conectar a SQL Server
    console.log(`Conectando a SQL Server local (${configCrm.server})...`);
    crmPool = await sql.connect(configCrm);
    console.log("✓ Conexión con SQL Server establecida.");

    // Conectar a Supabase
    console.log("Estableciendo conexión con Supabase...");
    pgClient = await pgPool.connect();
    console.log("✓ Conectado a Supabase.");

    // ==========================================
    // 1. SINCRONIZACIÓN DE CLIENTES (Upsert Masivo)
    // ==========================================
    console.log("\n--- SINCRONIZANDO CLIENTES ---");
    console.log("Obteniendo clientes del CRM local...");
    const crmClientesResult = await crmPool.request().query(`
      SELECT 
        cod_cliente, 
        cif, 
        nombre_comercial, 
        razon_social, 
        direccion1, 
        direccion2, 
        CP, 
        poblacion, 
        provincia, 
        telefono, 
        telefono2,
        e_mail
      FROM clientes
      WHERE cod_cliente IS NOT NULL AND cod_cliente > 0
    `);

    const clientes = crmClientesResult.recordset;
    console.log(`Obtenidos ${clientes.length} clientes desde SQL Server.`);

    if (clientes.length > 0) {
      const batchSize = 500;
      console.log(`Iniciando Upsert de clientes en lotes de ${batchSize}...`);

      for (let i = 0; i < clientes.length; i += batchSize) {
        const batch = clientes.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];
        
        batch.forEach((c, index) => {
          const baseIndex = index * 10;
          const nombre = (c.nombre_comercial || c.razon_social || '').trim();
          const razonSocial = (c.razon_social || '').trim();
          const direccion = `${(c.direccion1 || '').trim()} ${(c.direccion2 || '').trim()}`.trim();
          const telefono = (c.telefono || c.telefono2 || '').trim();
          
          values.push(
            c.cod_cliente,
            (c.cif || '').trim(),
            nombre,
            razonSocial,
            direccion,
            (c.poblacion || '').trim(),
            (c.CP || '').trim(),
            (c.provincia || '').trim(),
            telefono,
            (c.e_mail || '').trim()
          );

          placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`);
        });

        const queryText = `
          INSERT INTO public.clientes_crm_cache (
            codigo_cliente, cif, nombre, razon_social, direccion, poblacion, cod_postal, provincia, telefono, email
          )
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (codigo_cliente) 
          DO UPDATE SET
            cif = EXCLUDED.cif,
            nombre = EXCLUDED.nombre,
            razon_social = EXCLUDED.razon_social,
            direccion = EXCLUDED.direccion,
            poblacion = EXCLUDED.poblacion,
            cod_postal = EXCLUDED.cod_postal,
            provincia = EXCLUDED.provincia,
            telefono = EXCLUDED.telefono,
            email = EXCLUDED.email,
            creado_en = now()
        `;

        await pgClient.query(queryText, values);
        console.log(`- Procesados ${i + batch.length} de ${clientes.length} clientes...`);
      }
      console.log("✓ Sincronización de clientes completada.");
    }

    // ==========================================
    // 2. SINCRONIZACIÓN DE PRESUPUESTOS (Último Trimestre - 90 días)
    // ==========================================
    console.log("\n--- SINCRONIZANDO PRESUPUESTOS (ÚLTIMO TRIMESTRE) ---");
    console.log("Buscando presupuestos de los últimos 90 días...");
    
    // Consulta principal: últimos 90 días
    let presupuestosQuery = `
      SELECT 
        cod_venta, 
        cod_documento, 
        cod_cliente, 
        nombre_comercial, 
        cif, 
        direccion1, 
        cp, 
        poblacion, 
        provincia, 
        telefono, 
        e_mail,
        fecha_venta,
        COALESCE(importe_impuestos, importe, 0) AS total
      FROM ventas_cabecera
      WHERE fecha_venta >= DATEADD(day, -90, GETDATE())
        AND cod_venta IS NOT NULL AND cod_venta > 0
      ORDER BY fecha_venta DESC, cod_venta DESC
    `;

    let crmPresupuestosResult = await crmPool.request().query(presupuestosQuery);
    let presupuestos = crmPresupuestosResult.recordset;

    // Fallback: Si da 0 (como en base de datos local de desarrollo histórica), 
    // traemos los últimos 100 presupuestos del histórico para poder realizar pruebas.
    let isFallback = false;
    if (presupuestos.length === 0) {
      console.log("No se encontraron presupuestos en los últimos 90 días.");
      console.log("Aplicando fallback: Obteniendo los 100 presupuestos más recientes del histórico...");
      
      presupuestosQuery = `
        SELECT TOP 100
          cod_venta, 
          cod_documento, 
          cod_cliente, 
          nombre_comercial, 
          cif, 
          direccion1, 
          cp, 
          poblacion, 
          provincia, 
          telefono, 
          e_mail,
          fecha_venta,
          COALESCE(importe_impuestos, importe, 0) AS total
        FROM ventas_cabecera
        WHERE cod_venta IS NOT NULL AND cod_venta > 0
        ORDER BY fecha_venta DESC, cod_venta DESC
      `;
      crmPresupuestosResult = await crmPool.request().query(presupuestosQuery);
      presupuestos = crmPresupuestosResult.recordset;
      isFallback = true;
    }

    console.log(`Obtenidos ${presupuestos.length} presupuestos desde SQL Server ${isFallback ? '(Modo Fallback)' : '(Último Trimestre)'}.`);

    // Obtener las líneas de artículos asociadas a los presupuestos seleccionados
    let lineas = [];
    if (presupuestos.length > 0) {
      console.log("Obteniendo líneas de artículos asociadas...");
      const codigosVenta = presupuestos.map(p => p.cod_venta);
      
      const crmLineasResult = await crmPool.request().query(`
        SELECT 
          cod_venta, 
          cod_articulo, 
          descripcion, 
          cantidad, 
          precio, 
          importe
        FROM ventas_linea
        WHERE cod_venta IN (${codigosVenta.join(',')})
      `);
      lineas = crmLineasResult.recordset;
      console.log(`Obtenidas ${lineas.length} líneas de artículos desde SQL Server.`);
    }

    // Limpiar presupuestos antiguos en Supabase antes de la inserción
    console.log("Limpiando caché de presupuestos en Supabase...");
    await pgClient.query("TRUNCATE public.presupuestos_crm_cache CASCADE");

    if (presupuestos.length > 0) {
      console.log("Insertando cabeceras de presupuestos en Supabase...");
      
      const batchSize = 100;
      for (let i = 0; i < presupuestos.length; i += batchSize) {
        const batch = presupuestos.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];

        batch.forEach((p, index) => {
          const baseIndex = index * 13;
          values.push(
            p.cod_venta,
            p.cod_documento ? p.cod_documento.trim() : null,
            p.cod_cliente,
            p.nombre_comercial ? p.nombre_comercial.trim() : null,
            p.cif ? p.cif.trim() : null,
            p.direccion1 ? p.direccion1.trim() : null,
            p.poblacion ? p.poblacion.trim() : null,
            p.cp ? p.cp.trim() : null,
            p.provincia ? p.provincia.trim() : null,
            p.telefono ? p.telefono.trim() : null,
            p.e_mail ? p.e_mail.trim() : null,
            p.fecha_venta,
            Number(p.total) || 0
          );

          placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13})`);
        });

        const queryText = `
          INSERT INTO public.presupuestos_crm_cache (
            cod_venta, cod_documento, cliente_id, nombre_cliente, cif, direccion, poblacion, cod_postal, provincia, telefono, email, fecha_venta, total
          )
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (cod_venta) 
          DO UPDATE SET
            cod_documento = EXCLUDED.cod_documento,
            cliente_id = EXCLUDED.cliente_id,
            nombre_cliente = EXCLUDED.nombre_cliente,
            cif = EXCLUDED.cif,
            direccion = EXCLUDED.direccion,
            poblacion = EXCLUDED.poblacion,
            cod_postal = EXCLUDED.cod_postal,
            provincia = EXCLUDED.provincia,
            telefono = EXCLUDED.telefono,
            email = EXCLUDED.email,
            fecha_venta = EXCLUDED.fecha_venta,
            total = EXCLUDED.total,
            creado_en = now()
        `;

        await pgClient.query(queryText, values);
      }
      console.log(`✓ ${presupuestos.length} cabeceras de presupuestos guardadas.`);
    }

    if (lineas.length > 0) {
      console.log("Insertando líneas de materiales en Supabase...");
      
      const batchSize = 300;
      for (let i = 0; i < lineas.length; i += batchSize) {
        const batch = lineas.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];

        batch.forEach((l, index) => {
          const baseIndex = index * 5;
          values.push(
            l.cod_venta,
            l.cod_articulo ? l.cod_articulo.trim() : '0000',
            l.descripcion ? l.descripcion.trim() : '',
            Number(l.precio) || 0,
            Number(l.cantidad) || 1
          );

          placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`);
        });

        const queryText = `
          INSERT INTO public.presupuestos_materiales_crm_cache (
            presupuesto_id, codigo, descripcion, precio, cantidad
          )
          VALUES ${placeholders.join(', ')}
        `;

        await pgClient.query(queryText, values);
      }
      console.log(`✓ ${lineas.length} líneas de materiales guardadas.`);
    }

    console.log("\n==========================================");
    console.log("✓ SINCRONIZACIÓN COMPLETA FINALIZADA CON ÉXITO.");
    console.log("==========================================");

  } catch (error) {
    console.error("\n❌ ERROR DURANTE LA SINCRONIZACIÓN:", error);
    process.exit(1);
  } finally {
    if (crmPool) {
      await sql.close();
    }
    if (pgClient) {
      pgClient.release();
    }
    await pgPool.end();
  }
}

sync();
