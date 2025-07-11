import type { Resource }  from '@modelcontextprotocol/sdk/types.js';

import { tool }           from 'ai';
import { z }              from 'zod';

import { mcpClient }      from '@Lib/mcp/client';
import ensureSubscription from '@Lib/mcp/resources/subscription';
import cache              from '@Lib/cache';


const inFlightRequests = new Map<string, Promise<Resource>>();
async function readResource(args: { uri: string }) {
  if (cache.has(args.uri)) {
    console.log('[readResource] Returning cached resource.');
    return cache.get(args.uri) as string;
  }

  const promise = (async (): Promise<Resource> => {
    try {
      await ensureSubscription();

      const resp = await mcpClient.readResource({ uri: args.uri });
      if (!resp.contents || !resp.contents[0] || !resp.contents[0].text) {
        throw new Error('Invalid [contents] response from MCP client.');
      }

      const resource = JSON.parse(resp.contents[0].text as string);
      cache.set(args.uri, resource);
      console.log(`[readResource] Successfully fetched resource: ${args.uri}`);
      return resource;
    }
    catch (error) {
      console.error('[readResource] Error fetching resource:', error);
      throw new Error('Failed to fetch resource. Please try again later.');
    }
    finally {
      inFlightRequests.delete(args.uri);
    }
  })();

  inFlightRequests.set(args.uri, promise);
  return promise;
}


export default tool({
  description: 'Read a resource from the MCP server',
  parameters: z.object({
    uri: z.string()
  }),
  execute: async (args) => await readResource(args as any)
});
