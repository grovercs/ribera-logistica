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

// Adaptar la URL de Supabase para el Pooler IPv4 si es necesario (copiado de migrate.js)
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
  console.log("=== INICIANDO SINCRONIZACIÓN DE CLIENTES CRM ===");
  console.log(`Fecha/Hora: ${new Date().toISOString()}`);

  let crmPool;
  try {
    // Conectar a SQL Server
    console.log(`Conectando a SQL Server local (${configCrm.server})...`);
    crmPool = await sql.connect(configCrm);
    console.log("✓ Conexión con SQL Server establecida.");

    // Consultar todos los clientes en SQL Server
    console.log("Obteniendo clientes del CRM local...");
    const crmResult = await crmPool.request().query(`
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

    const clientes = crmResult.recordset;
    console.log(`✓ Obtenidos ${clientes.length} clientes desde SQL Server.`);

    if (clientes.length === 0) {
      console.log("No hay clientes para sincronizar.");
      return;
    }

    // Conectar a Supabase
    console.log("Estableciendo conexión con Supabase...");
    const pgClient = await pgPool.connect();
    console.log("✓ Conectado a Supabase.");

    // Sincronizar por lotes (batch) para evitar saturación y límites de parámetros en Postgres
    const batchSize = 500;
    console.log(`Iniciando Upsert de clientes en lotes de ${batchSize}...`);

    for (let i = 0; i < clientes.length; i += batchSize) {
      const batch = clientes.slice(i, i + batchSize);
      
      // Construir la consulta de inserción masiva
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

    pgClient.release();
    console.log("✓ Sincronización finalizada correctamente.");

  } catch (error) {
    console.error("❌ ERROR DURANTE LA SINCRONIZACIÓN:", error);
    process.exit(1);
  } finally {
    if (crmPool) {
      await sql.close();
    }
    await pgPool.end();
  }
}

sync();
