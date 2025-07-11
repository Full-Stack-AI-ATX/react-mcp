import { Client }                         from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport }  from '@modelcontextprotocol/sdk/client/streamableHttp.js';


const mcpServerUrl = process.env.MCP_SERVER_URL!;
const transport = new StreamableHTTPClientTransport(
  new URL(mcpServerUrl)
);

const rawMcpClient = new Client(
  {
    name: 'react-mcp',
    version: '1.0.0'
  }
);

let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

async function connectMcpClient(): Promise<boolean> {
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
      await rawMcpClient.connect(transport);
      isConnected = true;
      console.log('MCP client connected successfully.');
      return true;
    } catch (error) {
      console.error('Failed to connect MCP client:', error);
      isConnected = false;
      connectionPromise = null; // Reset for subsequent attempts
      throw error; // Re-throw to propagate the connection failure
    }
  })();

  return connectionPromise;
}

export const mcpClient = new Proxy(rawMcpClient, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);

    if (typeof original === 'function') {
      return async function (...args: any[]) {
        await connectMcpClient();
        return original.apply(target, args);
      };
    }

    return original;
  }
});
