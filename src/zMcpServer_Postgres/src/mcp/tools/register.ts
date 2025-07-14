import type { Server }    from '@modelcontextprotocol/sdk/server/index.js';

import {
  CallToolRequestSchema,
  ListToolsRequestSchema
}                         from '@modelcontextprotocol/sdk/types.js';
import * as Ajv           from 'ajv';
import {
  tools,
  toolHandlers,
  toolSchemas
}                         from './index.js';


const ajv = new (Ajv as any).default({ allErrors: true });
const compiledSchemas = Object.entries(toolSchemas).reduce((acc, [name, schema]) => {
  acc[name] = ajv.compile(schema);
  return acc;
}, {} as Record<string, Ajv.ValidateFunction<any>>);

function registerToolHandlers(mcpServer: Server) {
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    console.log(`[HANDLER - tools/list] START`);

    try {
      const response = { tools };
      console.log(`[HANDLER - tools/list] Sending response:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Error in ListTools handler:', error);
      throw new Error('Failed to list tools');
    }
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    console.log(`[HANDLER - tools/call] START. Tool name: ${toolName}`);

    try {
      const handler = toolHandlers[toolName as keyof typeof toolHandlers];
      const validate = compiledSchemas[toolName];

      if (!handler || !validate) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const valid = validate(request.params.arguments);
      if (!valid) {
        throw new Error(`Invalid arguments: ${ajv.errorsText(validate.errors)}`);
      }
      const response = await handler(request.params.arguments as any);
      console.log(`[HANDLER - ${toolName}] END. Sending response:`, JSON.stringify(response, null, 2));

      return response;
    } catch (error: any) {
      console.error(`[HANDLER - tools/call] ERROR for tool '${toolName}':`, error);

      return {
        content: [{ type: 'text', text: `Error executing tool '${toolName}': ${error.message}` }],
        isError: true
      };
    }
  });
}


export default registerToolHandlers;
