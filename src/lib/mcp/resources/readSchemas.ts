import { tool }           from 'ai';
import { z }              from 'zod';

import { mcpClient }      from '@Lib/mcp/client';
import ensureSubscription from '@/lib/mcp/resources/subscription';
import cache              from '@Lib/cache';


type Schemas = string[];
const inFlightRequests = new Map<string, Promise<Schemas>>();

async function readSchemas(args: { dbName: string }): Promise<Schemas> {
  const cacheKey = `${args.dbName}.schemas`;

  if (cache.has(cacheKey)) {
    console.log('[listSchemas] Returning cached schemas.');
    return cache.get(cacheKey) as Schemas;
  }

  // if call is already in flight, return its promise.
  if (inFlightRequests.has(cacheKey)) {
    console.log('[listSchemas] Waiting for in-flight request to complete.');
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<Schemas> => {
    try {
      await ensureSubscription();

      const uri = `postgresql://${args.dbName}/schemas`;
      console.log(`[listSchemas] Fetching schemas from URI: ${uri}`);

      const resp = await mcpClient.readResource({ uri });
      if (!resp.contents || !resp.contents[0] || !resp.contents[0].text) {
        throw new Error('Invalid [contents] response from MCP client.');
      }

      const schemas = JSON.parse(resp.contents[0].text as string).schemas as string[];

      cache.set(cacheKey, schemas);
      console.log(`[listSchemas] Successfully fetched ${schemas.length} schemas.`);
      return schemas;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('[listSchemas] JSON.parse error while parsing [contents]:', error);
        throw new Error('Failed to parse [contents] from server response. The data format may be invalid.');
      } else {
        console.error('[listSchemas] Error fetching schemas:', error);
        throw new Error('Failed to fetch schemas. Please try again later.');
      }
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

const toolSchema = z.object({
  dbName: z.string()
});


export default tool({
  description: 'List available PostgreSQL schemas from a given database',
  parameters: toolSchema,
  execute: async (args) => await readSchemas(args as any)
});
