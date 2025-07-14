import type { FastifyRequest, FastifyReply }  from 'fastify';

import { randomUUID }                         from 'node:crypto';
import { isInitializeRequest }                from '@modelcontextprotocol/sdk/types.js';
import fastify                                from 'fastify';
import cors                                   from '@fastify/cors';

import {
  createSession, getTransport, deleteSession
}                                             from './session/manager.js';


const server = fastify();
server.register(cors, {
  exposedHeaders: ['mcp-session-id'],
});

async function handleMcpPost(request: FastifyRequest, reply: FastifyReply) {
  const reqBody = request.body as any;
  let sessionId = request.headers['mcp-session-id'] as string | undefined;

  let transport = sessionId
    ? getTransport(sessionId)
    : undefined;

  // If there's no transport, it's either a new session or an invalid one.
  if (!transport) {
    // It must be an initialize request to create a new session.
    if (isInitializeRequest(reqBody)) {
      sessionId = randomUUID();
      console.log(`[Request] Creating new session: ${sessionId}`);
      transport = createSession(sessionId);
    } else {
      // Not an initialize request and no valid session.
      console.log('[Request] Invalid request: No session ID or not an initialize request.');
      reply.status(400).send({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided or not an initialize request.' },
        id: reqBody?.id ?? null,
      });

      return;
    }
  }

  transport.handleRequest(request.raw, reply.raw, request.body);
  return reply;
}

async function handleMcpGet(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? getTransport(sessionId) : undefined;

  if (!transport) {
    reply.status(404).send({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Session not found' },
      id: null
    });
    return;
  }

  transport.handleRequest(request.raw, reply.raw, request.body);
  return reply;
}

async function handleMcpDelete(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.headers['mcp-session-id'] as string | undefined;
  const transport = sessionId ? getTransport(sessionId) : undefined;

  if (!transport) {
    reply.status(404).send({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Session not found' },
      id: null,
    });
    return;
  }

  // The delete request is not expected to return a body.
  // We let the transport handle its internal state and then close the session.
  await transport.handleRequest(request.raw, reply.raw, request.body);
  deleteSession(sessionId!);
  reply.status(204).send();
}

// Logging hooks
server.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
  const reqId = (request.body as any)?.id ?? 'N/A';

  console.log(`[REQ_START - ${reqId}] ${request.method} ${request.url}`);

  if (request.method === 'POST' && request.body) {
    console.log(`[REQ_BODY - ${reqId}]:`, JSON.stringify(request.body, null, 2));
  }
  done();
});

server.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
  const reqId = (request.body as any)?.id ?? 'N/A';

  console.log(`[REQ_END - ${reqId}] ${request.method} ${request.url} - Status: ${reply.statusCode}`);

  done();
});

// Primary MCP endpoints
server.post('/mcp', handleMcpPost);
server.get('/mcp', handleMcpGet);
server.delete('/mcp', handleMcpDelete);


export default server;
