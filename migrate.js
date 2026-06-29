const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno de .env.local
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL no está definida en .env.local");
  process.exit(1);
}

async function runMigration() {
  let client;
  try {
    const cleanConnectionString = connectionString.replace(/^"|"$/g, '');
    const url = new URL(cleanConnectionString);

    // Si el host es directo (db.PROJECT_ID.supabase.co), adaptarlo para el pooler IPv4
    if (url.hostname.includes('supabase.co') && !url.hostname.includes('pooler')) {
      const hostParts = url.hostname.split('.');
      const projectId = hostParts[1]; // tpjomukxclwjvkxzdpax

      console.log(`Detectado host directo de Supabase. ID de Proyecto: ${projectId}`);
      console.log("Adaptando conexión para usar el Pooler IPv4 (aws-0-eu-west-3.pooler.supabase.com)...");

      // El pooler requiere el usuario en formato "usuario.project_id"
      url.username = `${url.username}.${projectId}`;
      // Usar el host del pooler de la región del proyecto (detectada como eu-west-3)
      url.hostname = 'aws-0-eu-west-3.pooler.supabase.com';
      url.port = '6543';
    }

    console.log("Conectándose a Supabase PostgreSQL...");
    client = new Client({
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log("Conexión establecida con éxito.");

    // 1. Ejecutar schema.sql
    console.log("Aplicando esquema (schema.sql)...");
    const schemaSql = fs.readFileSync(path.join(__dirname, 'src', 'database', 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log("✓ Esquema aplicado correctamente.");

    // 2. Ejecutar rls_policies.sql
    console.log("Aplicando políticas de seguridad y triggers (rls_policies.sql)...");
    const rlsSql = fs.readFileSync(path.join(__dirname, 'src', 'database', 'rls_policies.sql'), 'utf8');
    await client.query(rlsSql);
    console.log("✓ Políticas RLS y triggers aplicados correctamente.");

    // 3. Ejecutar seed.sql
    console.log("Poblando catálogos iniciales (seed.sql)...");
    const seedSql = fs.readFileSync(path.join(__dirname, 'src', 'database', 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log("✓ Datos iniciales insertados correctamente.");

    console.log("¡Migración completada con éxito!");
  } catch (error) {
    console.error("Error durante la migración:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

runMigration();
