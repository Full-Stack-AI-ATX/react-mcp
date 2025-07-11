import type { Resource }  from '@modelcontextprotocol/sdk/types.js';

import { tool }           from 'ai';
import { z }              from 'zod';

import { mcpClient }      from '@Lib/mcp/client';
import ensureSubscription from '@Lib/mcp/resources/subscription';
import cache              from '@Lib/cache';


type Resources = Resource[];
const inFlightRequests = new Map<string, Promise<Resources>>();

async function listResources(): Promise<Resources> {
  const cacheKey = 'mcpResources';

  if (cache.has(cacheKey)) {
    console.log('[listMCPResources] Returning cached MCP resources.');
    return cache.get(cacheKey) as Resources;
  }

  // if call is already in flight, return its promise.
  if (inFlightRequests.has(cacheKey)) {
    console.log('[listMCPResources] Waiting for in-flight request to complete.');
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<Resources> => {
    try {
      await ensureSubscription();

      console.log('[listMCPResources] Fetching MCP resources from server...');
      const resp = await mcpClient.listResources();

      if (!resp.resources || !Array.isArray(resp.resources)) {
        throw new Error('Invalid [resources] response from MCP client.');
      }

      const resources = resp.resources;
      cache.set(cacheKey, resources);
      console.log('[listMCPResources] Successfully fetched MCP resources:', resources.length);
      return resources;
    }
    catch (err) {
      console.error('[listMCPResources] Failed to fetch MCP resources:', err);
      throw new Error('Failed to fetch MCP resources. Please try again later.');
    }
    finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

const toolSchema = z.object({});
export default tool({
  description: 'List available resources from the MCP server',
  parameters: toolSchema,
  execute: async () => await listResources()
});
