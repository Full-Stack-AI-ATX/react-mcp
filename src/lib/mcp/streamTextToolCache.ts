import type { Tool as MCPTool }         from '@modelcontextprotocol/sdk/types.js';
import type { Tool as VercelTool }      from 'ai';
import { z }                            from 'zod';

import { connectMcpClient, mcpClient }  from './client';


let cachedVercelTools: Record<string, VercelTool> | null = null;

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

async function fetchAndCacheMCPTools(): Promise<Record<string, VercelTool>> {
  const connected = await connectMcpClient();
  if (!connected) {
    console.error('Cannot fetch tools: Failed to connect to MCP server.');
    return {};
  }

  try {
    const response = await mcpClient.listTools();
    const mcpTools: MCPTool[] = response?.tools || [];

    if (!Array.isArray(mcpTools)) {
      console.error('The `tools` property from MCP server is not an array.');
      return {};
    }

    const formattedTools = Object.fromEntries(
      mcpTools.map((tool) => [
        tool.name,
        formatToolForStreamText(tool),
      ]),
    );

    cachedVercelTools = formattedTools;
    console.log(`Successfully fetched and cached ${Object.keys(formattedTools).length} Vercel tools.`);
    return formattedTools;
  } catch (error) {
    console.error('Failed to fetch or format tools from MCP server:', error);
    return {};
  }
}

export async function getMCPTools(): Promise<Record<string, VercelTool>> {
  if (cachedVercelTools) {
    console.log('Returning cached Vercel tools.');
    return cachedVercelTools;
  }
  console.log('No Vercel tools in cache, fetching from MCP server...');
  return fetchAndCacheMCPTools();
}
