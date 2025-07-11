import { tool }           from 'ai';
import { z }              from 'zod';

import { mcpClient }      from '@Lib/mcp/client';
import ensureSubscription from '@/lib/mcp/resources/subscription';
import cache              from '@Lib/cache';


type TableInfo = string[];
const inFlightRequests = new Map<string, Promise<TableInfo>>();

async function readTableInfo(args: { dbName: string; schema: string; table: string }): Promise<string[]> {
  const cacheKey = `${args.dbName}.${args.schema}.tables.${args.table}`;

  if (cache.has(cacheKey)) {
    console.log(`[readTableInfo] Returning cached table info: ${cacheKey}`);
    return cache.get(cacheKey) as TableInfo;
  }

  // if call is already in flight, return its promise.
  if (inFlightRequests.has(cacheKey)) {
    console.log(`[readTableInfo] Waiting for in-flight request to complete: ${cacheKey}`);
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<TableInfo> => {
    try {
      await ensureSubscription();

      const uri = `postgresql://${args.dbName}/schemas/${args.schema}/tables/${args.table}`;
      console.log(`[readTableInfo] Fetching table info from URI: ${uri}`);

      const resp = await mcpClient.readResource({ uri });
      console.log('resp:', resp);
      if (!resp.contents || !resp.contents[0] || !resp.contents[0].text) {
        throw new Error('Invalid [contents] response from MCP client.');
      }

      const tableInfo = JSON.parse(resp.contents[0].text as string) as any;
      cache.set(cacheKey, tableInfo);
      console.log(`[readTableInfo] Successfully fetched table info: ${cacheKey}`);
      return tableInfo;
    }
    catch (error) {
      console.error(`[readTableInfo] Error fetching table info: ${cacheKey}`, error);
      throw new Error('Failed to fetch table info. Please try again later.');
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
  schema: z.string(),
  table: z.string()
});


export default tool({
  description: 'Get information about a given table. Input parameters are: dbName, schema, table',
  parameters: toolSchema,
  execute: async (args) => await readTableInfo(args as any)
});
