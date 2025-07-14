import postgres           from 'postgres';
import cache              from '@Lib/cache.js';


const postgresURL = process.env.POSTGRES_URL;
if (!postgresURL) {
  throw new Error(
    'POSTGRES_URL environment variable is not set. Create a .env.local file in the zMcpServer directory and set the POSTGRES_URL variable.'
  );
}

console.debug('[INIT_DB] Postgres URL');

const resourceBaseUrl     = new URL(postgresURL);
resourceBaseUrl.protocol  = 'postgresql:';
resourceBaseUrl.password  = '';

const sql = postgres(postgresURL, {
  ssl: 'prefer',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function initPostgres(): Promise<string> {
  try {
    await sql`SELECT 1 as test`;
    console.debug('[INIT_DB] Database connection successful');

    cache.set('postgresURL', postgresURL);
    return postgresURL!;
  } catch (err: any) {
    console.error('[INIT_DB] Database connection failed:', err.message);
    console.error('[INIT_DB] Full error:', err);
    throw err;
  }
}


export { sql, initPostgres, resourceBaseUrl };
