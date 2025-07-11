import { tool }           from 'ai';
import { z }              from 'zod';

import { mcpClient }      from '@Lib/mcp/client';
import ensureSubscription from '@Lib/mcp/resources/subscription';
import cache              from '@Lib/cache';


type Tables = string[];
const inFlightRequests = new Map<string, Promise<Tables>>();

async function readTables(args: { dbName: string; schema: string }): Promise<string[]> {
  const cacheKey = `${args.dbName}.${args.schema}.tables`;

  if (cache.has(cacheKey)) {
    console.log('[readTables] Returning cached tables.');
    return cache.get(cacheKey) as Tables;
  }

  // if call is already in flight, return its promise.
  if (inFlightRequests.has(cacheKey)) {
    console.log('[readTables] Waiting for in-flight request to complete.');
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<Tables> => {
    try {
      await ensureSubscription();

      const uri = `postgresql://${args.dbName}/schemas/${args.schema}/tables`;
      console.log(`[readTables] Fetching tables from URI: ${uri}`);

      const resp = await mcpClient.readResource({ uri });
      console.log('resp:', resp);
      if (!resp.contents || !resp.contents[0] || !resp.contents[0].text) {
        throw new Error('Invalid [contents] response from MCP client.');
      }

      const tables = JSON.parse(resp.contents[0].text as string).tables as string[];
      cache.set(cacheKey, tables);
      console.log(`[readTables] Successfully fetched ${tables.length} tables.`);
      return tables;
    }
    catch (error) {
      console.error('[readTables] Error fetching tables:', error);
      throw new Error('Failed to fetch tables. Please try again later.');
    }
    finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

const toolSchema = z.object({
  dbName: z.string(),
  schema: z.string()
});


export default tool({
  description: 'Get a list of tables in a given schema. Input parameters are: dbName, schema',
  parameters: toolSchema,
  execute: async (args) => await readTables(args as any)
});
