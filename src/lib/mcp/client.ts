import { Client }                         from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport }  from '@modelcontextprotocol/sdk/client/streamableHttp.js';


const mcpServerUrl = process.env.MCP_SERVER_URL!;
const transport = new StreamableHTTPClientTransport(
  new URL(mcpServerUrl)
);

export const mcpClient = new Client(
  {
    name: 'react-mcp',
    version: '1.0.0'
  }
);

let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

export async function connectMcpClient(): Promise<boolean> {
  console.log('Attempting to connect MCP client...');
  if (isConnected) {
    console.log('MCP client is already connected.');
    return true;
  }

  if (connectionPromise) {
    console.log('MCP client connection is in progress, awaiting its result...');
    return connectionPromise;
  }

  console.log('Starting a new MCP client connection attempt...');
  connectionPromise = (async () => {
    try {
      console.log(`Executing mcpClient.connect() to ${mcpServerUrl}...`);
      await mcpClient.connect(transport);
      console.log('mcpClient.connect() call completed.');
      isConnected = true;
      console.log('MCP client connected successfully.');
      return true;
    } catch (error) {
      console.error('Failed to connect MCP client:', error);
      isConnected = false;
      // Reset the promise on failure to allow for new connection attempts.
      connectionPromise = null;
      return false;
    } finally {
      console.log('MCP client connection process finished.');
    }
  })();

  return connectionPromise;
}
