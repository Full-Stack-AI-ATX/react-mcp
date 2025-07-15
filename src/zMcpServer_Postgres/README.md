# PostgreSQL MCP Server

This directory contains a standalone Node.js server that implements the [Model-Context Protocol (MCP)](https://github.com/model-context-protocol/mcp-spec) to provide a standardized, schema-aware interface to a PostgreSQL database. It uses Fastify for its underlying HTTP server and provides a direct MCP endpoint for all interactions.

The server is designed to be used by LLM agents and other clients that need to interact with a database in a safe and structured way.

---
## Setup and Running

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root of the `zMcpServer` directory. It should contain:
    ```env
    # Example URL for a local PostgreSQL database
    DATABASE_URL="postgresql://user:password@localhost:5432/mydatabase"
    ```

3.  **Build the Code**:
    The server is written in TypeScript and must be compiled to JavaScript.
    ```bash
    pnpm build
    ```

4.  **Start the Server**:
    ```bash
    pnpm start
    ```
    The server will start on the port specified by the `PORT` environment variable, or `3001` by default.

---

## Core Concepts

The `@modelcontextprotocol/sdk` provides two base types for building a server, `Server` and `McpServer`. Understanding their difference is crucial to understanding our codebase.

### `Server`: The Low-Level "Engine"

- **What it is:** The foundational, low-level class for an MCP server. It provides the core protocol machinery: connecting to transports, sending/receiving JSON-RPC messages, and managing capabilities.
- **How it works:** It requires you to implement everything manually. You use the generic `setRequestHandler()` method to register a handler for every single MCP method you want to support (e.g., `tools/list`, `tools/call`).
- **Why use it:** It offers maximum control and flexibility. You are not bound to any specific validation library or implementation pattern.
- **Our Implementation:** **We use this class.** It allows us to implement our own validation logic using `ajv` and a dispatch table pattern, rather than being tied to the `zod` library that `McpServer` requires.

### `McpServer`: The High-Level "Car"

- **What it is:** A high-level, opinionated convenience wrapper built *on top of* the `Server` class.
- **How it works:** It simplifies common server patterns. For example, instead of manually writing handlers for `tools/list` and `tools/call`, you use a single `.registerTool()` method, and the `McpServer` handles the rest behind the scenes.
- **Why use it:** It's faster for getting started and reduces boilerplate if your needs align with its patterns. However, it is less flexible and is tightly coupled with the `zod` validation library.

### Server Operational Modes: Stateful vs. Stateless

The MCP SDK supports two primary operational modes for handling HTTP requests. This server implements the **Stateful** mode.

-   **Stateless Mode**:
    -   **How it works:** A new, completely isolated MCP `Server` instance is created for every single incoming HTTP request.
    -   **Pros:** Simple to implement and deploy, especially in serverless environments. Each request is independent, preventing state-related conflicts between concurrent users.
    -   **Cons:** Cannot maintain context or history across multiple requests from the same client. Inefficient if resources need to be loaded or initialized repeatedly.

-   **Stateful Mode (Our Implementation)**:
    -   **How it works:** This server maintains a persistent MCP `Server` instance for each unique client **session**. A client must initiate a session by sending a specific `initialize` request. The server then generates a unique session ID and returns it in the `mcp-session-id` HTTP header. The client must include this header in all subsequent requests to maintain the session.
    -   **Pros:** Allows the server to maintain context, such as conversation history, loaded resources, or user authentication state, across multiple interactions with a client. This is more efficient and powerful for complex, interactive applications.
    -   **Cons:** Requires session management logic to track and clean up sessions.
    -   **Our Code:** The core logic for this stateful session management can be found in `src/session/manager.ts`. It uses an in-memory `Map` to store active sessions.

---

### The Transport Layer: Bridging MCP and HTTP

A "transport" is a critical concept in the `@modelcontextprotocol/sdk`. It acts as the bridge between the protocol-agnostic `Server` instance and a specific communication layer, like an HTTP server. Our server uses the official `StreamableHTTPServerTransport` from the SDK, which is a robust, spec-compliant implementation for handling MCP communication over HTTP.

-   **Why is it Necessary?** This decoupling is a powerful architectural feature. It allows the core MCP server logic to remain independent of the underlying network protocol. By using the official transport, we ensure our server stays compliant with the MCP specification and can easily adopt future features from the SDK.

-   **Our Implementation**:
    -   We use `StreamableHTTPServerTransport` in a stateful, streaming mode (`enableJsonResponse: false`). This provides the stability and validation of the official transport while allowing for streaming responses if needed in the future.
    -   The transport is framework-agnostic and works with Node.js's native `http` objects. Our Fastify request handlers in `src/server.ts` delegate incoming requests to the transport by passing the raw request and response objects (`request.raw`, `reply.raw`).
    -   Session management in `src/session/manager.ts` is now responsible for creating and managing instances of this transport for each client session.

## Features

### MCP Endpoint

-   `POST /mcp`
    This is the primary JSON-RPC endpoint for all MCP-compliant requests. Clients use this endpoint to interact with the server's resources and tools. A new session is created if an `initialize` request is sent.

-   `GET /mcp`
    This endpoint can be used to check the status of a session by including the `mcp-session-id` header.

-   `DELETE /mcp`
    This endpoint terminates the current client session. The client must include its `mcp-session-id` header in the request. This allows for proper cleanup of server-side resources.

### Core MCP Methods

Our server implements the following standard MCP methods. Each method is associated with a specific request schema from the SDK, which is used to register its handler with the `Server` instance.

| Category  | JSON-RPC Method Name | SDK Request Schema             | Purpose                                                    |
| :-------- | :------------------- | :----------------------------- | :--------------------------------------------------------- |
| **Resources** | `resources/list`     | `ListResourcesRequestSchema`   | Discover all available data resources (e.g., table schemas). |
|           | `resources/read`     | `ReadResourceRequestSchema`    | Read the content of a specific data resource.              |
|           | `resources/subscribe`| `SubscribeRequestSchema`       | Subscribe to changes in a data resource.                   |
| **Tools**     | `tools/list`         | `ListToolsRequestSchema`       | Discover all available tools (executable functions).       |
|           | `tools/call`         | `CallToolRequestSchema`        | Execute a specific tool with a given set of arguments.     |
| **Prompts**   | `prompts/list`       | `ListPromptsRequestSchema`     | Discover all available prompt templates.                   |
|           | `prompts/get`        | `GetPromptRequestSchema`       | Get a prompt template populated with a set of arguments.   |

---

## Implemented Tools

### `query`

The `query` tool allows for the execution of safe, read-only SQL queries. It has several important security features:

1.  **SQL Parsing**: It parses the incoming SQL string to create an Abstract Syntax Tree (AST).
2.  **Statement Validation**: It ensures that only a single `SELECT` statement is provided.
3.  **Mutation Prevention**: It walks the AST to guarantee that no data-modifying operations (like `INSERT`, `UPDATE`, `DROP`, etc.) are present.
4.  **System Catalog Prevention**: It blocks queries that attempt to access sensitive database schemas like `pg_catalog` to prevent information disclosure about the database's internal state.
5.  **Dangerous Function Prevention**: It blocks the use of functions that could interact with the server's filesystem or network, such as `pg_read_file` or `dblink_connect`.
6.  **Limit Enforcement**: It automatically adds a `LIMIT` to queries that don't have one and caps the maximum number of rows that can be returned.
7.  **Read-Only Transaction**: The final, sanitized query is executed within a `READ ONLY` PostgreSQL transaction for an additional layer of safety.

## Error Handling

This server follows MCP's JSON-RPC 2.0 error handling guidelines. Here's a summary of what happens when an error occurs in a request handler (e.g., during a `resources/read` request):

1. **Error Occurrence**: If an error is thrown during processing (e.g., in `readResource(uri)`), it's caught in the handler's `try...catch` block.

2. **Internal Logging**: The error is logged server-side with full details (e.g., `console.error('Error in ReadResource handler for URI ${uri}:', error);`) for debugging. Sensitive details are not exposed to the client.

3. **Controlled Throw**: The handler throws a new `Error` with a safe, generic message (e.g., `throw new Error('Failed to read resource: Internal error');`).

4. **SDK Formatting**: The MCP SDK's `Server` class catches this and formats it as a JSON-RPC error response, typically with code `-32603` (InternalError) and the thrown message.

5. **Client Response**: The client receives a structured error, e.g.:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal Error"
  },
  "id": "request-id-123"
}
```

This ensures server stability while informing clients of failures. For more details, see the [MCP Core Architecture error handling](https://modelcontextprotocol.io/docs/concepts/architecture#error-handling).
