import { sql, initPostgres }  from '@Lib/postgres.js';
import { primeCache }         from '@Lib/cache.js';
import { sanitizeDbURL }      from '@Utils/index.js';
import server                 from './server.js';


const PORT = parseInt(process.env.PORT || '3001', 10);

async function startServer() {
  console.log('[INIT] Starting server...');

  let postgresURL;
  try {
    postgresURL = await initPostgres();
  } catch (error) {
    console.error('[INIT] Error initializing Postgres:', error);
    throw error;
  }

  try {
    await primeCache(sql);
  } catch (error) {
    console.error('[INIT] Error priming cache:', error);
    throw error;
  }

  await server.listen({ port: PORT });

  console.log(`[SERVER] MCP Server running on port ${PORT}`);
  console.log(`[SERVER] Postgres URL: ${sanitizeDbURL(postgresURL)}`);
  console.log('[SERVER] Available endpoints:');
  console.log('  POST /mcp                        - Main MCP JSON-RPC endpoint');
  console.log('  GET /mcp                         - SSE stream for real-time communication');
  console.log('  DELETE /mcp                      - Tears down an MCP session');
}

startServer().catch(err => {
  console.error('[FATAL] Failed to start server:', err);
  process.exit(1);
});

// Shutdown handlers
process.on('SIGTERM', async () => {
  console.log('[SERVER] Shutting down...');
  await sql.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] Shutting down...');
  await sql.end();
  process.exit(0);
});
