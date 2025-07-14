import type { Server }                   from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import createMcpServer                   from '../mcp/index.js';

// For production environments this could be replaced with a distributed store like Redis.
const sessions = new Map<string, {
  mcpServer: Server,
  transport: StreamableHTTPServerTransport
}>();


/**
 * Creates and stores a new session.
 * @param sessionId The unique identifier for the new session.
 * @returns The newly created transport object.
 */
export function createSession(sessionId: string) {
  const mcpServer = createMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
    enableJsonResponse: false
  });

  sessions.set(sessionId, { mcpServer, transport });
  console.log(`[Session] Created session: ${sessionId}. Active sessions: ${sessions.size}`);

  // MCP Server and the Transport are connected here.
  // The transport's `onmessage` is wired to the server, and the server's `send`
  // is wired to the transport by the `connect` method.
  mcpServer.connect(transport);

  return transport;
}

/**
 * Retrieves a session's transport from the store.
 * @param sessionId The ID of the session to retrieve.
 * @returns The session's transport, or undefined if not found.
 */
export function getTransport(sessionId: string) {
  return sessions.get(sessionId)?.transport;
}

/**
 * Deletes a session from the store. This is called by the transport's onsessionclosed handler.
 * @param sessionId The ID of the session to delete.
 */
export function deleteSession(sessionId: string) {
  if (sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    session?.mcpServer.close();
    session?.transport.close();
    sessions.delete(sessionId);
    console.log(`[Session] Deleted session: ${sessionId}. Active sessions: ${sessions.size}`);
  }
}
