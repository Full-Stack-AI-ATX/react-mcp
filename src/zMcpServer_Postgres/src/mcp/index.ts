import { Server }               from '@modelcontextprotocol/sdk/server/index.js';

import registerResourceHandlers from './resources/register.js';
import registerToolHandlers     from './tools/register.js';
import registerPromptHandlers   from './prompts/register.js';


function createServer(): Server {
  const serverCapabilities = {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {}
    }
  };

  const serverInfo = {
    name: 'remote-mcp/postgres',
    version: '0.1.0'
  };

  // 1. Create the MCP Server instance
  const mcpServer = new Server(serverInfo, serverCapabilities);

  // 2. Register all handlers from their respective modules
  console.log('[INIT] Registering MCP handlers for new server instance...');
  registerResourceHandlers(mcpServer);
  registerToolHandlers(mcpServer);
  registerPromptHandlers(mcpServer);

  return mcpServer;
}


export default createServer;
