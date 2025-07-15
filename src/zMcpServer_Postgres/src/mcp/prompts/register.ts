import type { Server }          from '@modelcontextprotocol/sdk/server/index.js';

import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema
}                               from '@modelcontextprotocol/sdk/types.js';
import * as Ajv                 from 'ajv';

import {
  prompts,
  promptHandlers,
  promptSchemas
} from './index.js';


const ajv = new (Ajv as any).default({
  allErrors: true
});

const compiledSchemas = Object.entries(promptSchemas).reduce((acc, [name, schema]) => {
  acc[name] = ajv.compile(schema);
  return acc;
}, {} as Record<string, Ajv.ValidateFunction<any>>);

function registerPromptHandlers(mcpServer: Server) {
  mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => {
    console.log('[HANDLER - prompts/list] START');
    try {
      const response = { prompts };
      console.log(`[HANDLER - prompts/list] Sending response:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Error in ListPrompts handler:', error);
      throw new Error('Failed to list prompts');
    }
  });

  mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name as keyof typeof promptHandlers;
    console.log(`[HANDLER - prompts/get] START. Prompt name: ${promptName}`);

    try {
      const handler = promptHandlers[promptName];
      const validate = compiledSchemas[promptName];

      if (!handler || !validate) {
        throw new Error(`Unknown prompt: ${promptName}`);
      }

      const args = request.params.arguments || {};
      const valid = validate(args);
      if (!valid) {
        throw new Error(`Invalid arguments for prompt '${promptName}': ${ajv.errorsText(validate.errors)}`);
      }

      const response = await handler(args as any);
      console.log(`[HANDLER - prompts/get] END. Sending response for prompt '${promptName}':`, JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      console.error(`[HANDLER - prompts/get] ERROR for prompt '${promptName}':`, error);
      return {
        messages: [
          {
            role: 'assistant',
            content: [{ type: 'text', text: `Error executing prompt '${promptName}': ${error.message}` }],
          }
        ]
      };
    }
  });
}


export default registerPromptHandlers;
