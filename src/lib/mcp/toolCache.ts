import type { Tool }                    from '@modelcontextprotocol/sdk/types.js';
import type { ChatCompletionTool }      from 'openai/resources/chat/completions';

import { connectMcpClient, mcpClient }  from './client';


let cachedTools: ChatCompletionTool[] | null = null;

/**
 * Formats a tool definition from the MCP server into the format
 * expected by the OpenAI Chat Completions API.
 * @param mcpTool The tool definition from the MCP server.
 * @returns A ChatCompletionTool object.
 */
function formatToolForOpenAI(mcpTool: Tool): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description || '',
      parameters: mcpTool.inputSchema
    }
  };
}

/**
 * Fetches the list of tools from the MCP server, formats them for the
 * OpenAI API, and caches them in memory.
 * @returns A promise that resolves to an array of ChatCompletionTool objects.
 */
async function fetchAndCacheTools(): Promise<ChatCompletionTool[]> {
  const connected = await connectMcpClient();
  if (!connected) {
    console.error('Cannot fetch tools: Failed to connect to MCP server.');
    return [];
  }

  try {
    const response = await mcpClient.listTools();
    const mcpTools: Tool[] = response?.tools || [];

    if (!Array.isArray(mcpTools)) {
      console.error('The `tools` property from MCP server is not an array.');
      return [];
    }

    const formattedTools = mcpTools.map(formatToolForOpenAI);
    cachedTools = formattedTools;
    console.log(`Successfully fetched and cached ${formattedTools.length} tools.`);
    return formattedTools;
  } catch (error) {
    console.error('Failed to fetch or format tools from MCP server:', error);
    return [];
  }
}

/**
 * Gets the list of available tools, using a cached version if available
 * or fetching them from the MCP server if not.
 * @returns A promise that resolves to an array of ChatCompletionTool objects.
 */
export async function getTools(): Promise<ChatCompletionTool[]> {
  if (cachedTools) {
    console.log('Returning cached tools.');
    return cachedTools;
  }
  console.log('No tools in cache, fetching from MCP server...');
  return fetchAndCacheTools();
}
