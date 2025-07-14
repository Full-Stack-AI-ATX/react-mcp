import type {
  CallToolResult, Tool
}                       from '@modelcontextprotocol/sdk/types.js';
import {
  queryTool,
  queryToolSchema,
  queryToolHandler
}                       from './query.js';


export const tools: Tool[] = [
  queryTool
];

export const toolSchemas = {
  [queryTool.name]: queryToolSchema
};

export const toolHandlers: Record<string, (args: any) => Promise<CallToolResult>> = {
  [queryTool.name]: queryToolHandler
};
