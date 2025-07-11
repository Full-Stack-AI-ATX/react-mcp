import type { Tool as MCPTool }         from '@modelcontextprotocol/sdk/types.js';
import type { Tool as VercelTool }      from 'ai';
import { z }                            from 'zod';

import { mcpClient }  from '@Lib/mcp/client';
import cache          from '@Lib/cache';

const inFlightRequests = new Map<string, Promise<Record<string, VercelTool>>>();

// this is a simplified converter to handle the schema issue.
// it assumes simple object schemas with string properties, which matches our current tools.
function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (schema.type !== 'object' || !schema.properties) {
    // Return a default empty object schema if the format is not as expected.
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const key in schema.properties) {
    const prop = schema.properties[key];
    if (prop.type === 'string') {
      shape[key] = z.string();
    }
    // TODO: Add other type mappings (number, boolean, etc.) if needed in the future.
  }

  return z.object(shape);
}

function formatToolForStreamText(mcpTool: MCPTool): VercelTool {
  return {
    description: mcpTool.description,
    parameters: jsonSchemaToZod(mcpTool.inputSchema),
    execute: async (args: unknown) => {
      const toolArgs = (typeof args === 'object' && args !== null) ? args : {};
      const result = await mcpClient.callTool({
        name: mcpTool.name,
        arguments: toolArgs as Record<string, unknown>,
      });

      if (Array.isArray(result.content) && result.content.length > 0) {
        const firstPart = result.content[0];
        if (firstPart && 'text' in firstPart && typeof firstPart.text === 'string') {
          return firstPart.text;
        }
      }
      return JSON.stringify(result.content);
    },
  };
}

export default async function listTools(): Promise<Record<string, VercelTool>> {
  const cacheKey = 'vercelTools';

  if (cache.has(cacheKey)) {
    console.log('[listTools] Returning cached Vercel tools.');
    return cache.get(cacheKey) as Record<string, VercelTool>;
  }

  if (inFlightRequests.has(cacheKey)) {
    console.log('[listTools] Waiting for in-flight request to complete.');
    return inFlightRequests.get(cacheKey)!;
  }

  const promise = (async (): Promise<Record<string, VercelTool>> => {
    try {
      console.log('[listTools] No Vercel tools in cache, fetching from MCP server...');
      const response = await mcpClient.listTools();
      const mcpTools: MCPTool[] = response?.tools || [];

      if (!Array.isArray(mcpTools)) {
        console.error('[listTools] The `tools` property from MCP server is not an array.');
        return {};
      }

      console.log(`[listTools] successfuly fetched ${mcpTools.length} tools from MCP server`);

      const formattedTools = Object.fromEntries(
        mcpTools.map((tool) => [
          tool.name,
          formatToolForStreamText(tool),
        ]),
      );

      cache.set(cacheKey, formattedTools);

      // console.log('formattedTools:', cache.get(cacheKey));
      console.log(`[listTools] Successfully cached ${Object.keys(formattedTools).length} Vercel tools.`);
      return formattedTools;
    }
    catch (error) {
      console.error('[listTools] Failed to fetch or format tools from MCP server:', error);
      return {};
    }
    finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
