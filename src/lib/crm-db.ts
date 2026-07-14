import sql from 'mssql';

// ¡IMPORTANTE! Por ahora trabajamos únicamente contra el SQL Server LOCAL de la oficina.
// El servidor externo (ribera.vielhacomputer.com) se va a retirar de funcionamiento,
// así que se ha eliminado del flujo de conexión. Más adelante se evaluará cómo exponer
// el servidor local hacia el exterior (VPN / túnel / IP pública) para acceder fuera de la red.
const configLocal: sql.config = {
  server: process.env.CRM_DB_HOST || '',
  user: process.env.CRM_DB_USER || '',
  password: process.env.CRM_DB_PASSWORD || '',
  database: process.env.CRM_DB_NAME || 'INTEGRAL',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 5000,
    instanceName: process.env.CRM_DB_INSTANCE || 'INTEGRAL'
  }
};

// Variable global para persistir la conexión en modo de desarrollo caliente de Next.js
let globalPoolPromise = (global as any)._mssqlPoolPromise as Promise<sql.ConnectionPool> | undefined;

export async function getCrmDbConnection(): Promise<sql.ConnectionPool> {
  if (globalPoolPromise) {
    return globalPoolPromise;
  }

  const promise = (async () => {
    console.log("Iniciando pool de conexión a Microsoft SQL Server (CRM Integral)...");
    
    if (!configLocal.server || !configLocal.user || !configLocal.password) {
      const errorMsg = "ERROR DE CONFIGURACIÓN: Faltan variables de entorno obligatorias para la conexión al CRM SQL Server (CRM_DB_HOST, CRM_DB_USER, CRM_DB_PASSWORD). Configúralas en tu archivo .env.local";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const pool = new sql.ConnectionPool(configLocal);
      await pool.connect();
      console.log(`¡Conectado exitosamente a SQL Server (${configLocal.server})!`);
      return pool;
    } catch (err: any) {
      console.error("ERROR CRÍTICO: No se pudo conectar al SQL Server del CRM:", err.message);
      (global as any)._mssqlPoolPromise = undefined; // Permitir reintentar en la siguiente llamada
      throw new Error(`Conexión fallida al CRM: ${err.message}`);
    }
  })();

  globalPoolPromise = promise;
  if (process.env.NODE_ENV !== 'production') {
    (global as any)._mssqlPoolPromise = globalPoolPromise;
  }

  return globalPoolPromise;
}