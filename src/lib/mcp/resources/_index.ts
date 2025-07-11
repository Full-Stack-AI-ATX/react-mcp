import type { Tool }      from 'ai';
import {
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  Resource
}                                       from '@modelcontextprotocol/sdk/types.js';
import { tool }                         from 'ai';
import { z }                            from 'zod';

import { connectMcpClient, mcpClient }  from '@Lib/mcp/client';
import { findBestMatch }                from '@Utils/findBestMatch';


// in-memory caches for schemas, tables, table schemas, and summary.
let mcpResourcesCache: Resource[] | null = null;
let resourceSummaryCache: string | null = null;
let dbConnectionCache: string | null = null;
let dbUserCache: string[] | null = null;
let schemasCache: string[] | null = null;
let tablesCache: Record<string, string[]> = {};
let tableSchemaCache: Record<string, unknown> = {};

// Ensure we only hook up notifications once
let subscribed = false;

// Handle resource removal/creation and content-updates for specific resources via MCP notifications.
async function ensureSubscription(): Promise<void> {
  if (subscribed) return;
  await connectMcpClient();

  mcpClient.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
    console.log('🗂️ Resource list changed, invalidating schemas & summary');
    schemasCache = null;
    summaryCache = null;
    tablesCache = {};
  });

  mcpClient.setNotificationHandler(ResourceUpdatedNotificationSchema, ({ params }) => {
    const { uri } = params;
    console.log('🔄 Resource content updated, invalidating cache for URI:', uri);

    if (uri in tableSchemaCache) {
      delete tableSchemaCache[uri];
      console.log(`[ensureSubscription] Cleared cache for key: ${uri}`);
    }
  });

  subscribed = true;
}

async function listSchemas(): Promise<string[]> {
  await ensureSubscription();

  if (schemasCache) {
    console.log('[listSchemas] Returning cached schemas.');
    return schemasCache;
  }

  let schemas: string[] = [];
  try {
    const uri = `postgresql://${process.env.POSTGRES_DB}/schemas`;
    console.log(`[listSchemas] Fetching schemas from URI: ${uri}`);

    const resp = await mcpClient.readResource({ uri });
    if (!resp.contents || !resp.contents[0] || !resp.contents[0].text) {
      throw new Error('Invalid [contents] response from MCP client.');
    }

    schemas = JSON.parse(resp.contents[0].text as string).schemas as string[];
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[listSchemas] JSON.parse error while parsing [contents]:', error);
      throw new Error('Failed to parse [contents] from server response. The data format may be invalid.');
    } else {
      console.error('[listSchemas] Error fetching schemas:', error);
      throw new Error('Failed to fetch schemas. Please try again later.');
    }
  }

    schemasCache = schemas;
    console.log(`[listSchemas] Successfully fetched ${schemas.length} schemas.`);
    return schemas;
}

async function listTables(args: { schema: string }): Promise<string[]> {
  await ensureSubscription();
  const cached = tablesCache[args.schema];
  if (Array.isArray(cached)) return cached;

  const resp = await mcpClient.listResources({
    kind: 'table',
    schema: args.schema
  });

  const names = Array.isArray(resp.resources)
    ? resp.resources.map((r) => r.name!).filter((n): n is string => typeof n === 'string')
    : [];
  tablesCache[args.schema] = names;
  return names;
}

async function readTableSchema(args: { baseUri: string; schema: string; table: string }): Promise<unknown> {
  await ensureSubscription();

  console.log('readTableSchema args:', args);

  const { baseUri, schema, table } = args;

  const allTables = await listTables({ schema });
  console.log(`[readTableSchema] Tables in schema "${schema}":`, allTables);

  // table names from listTables may be prefixed with the schema name (e.g., "public.myTable").
  // we need to compare against the unprefixed name for robust fuzzy matching.
  const unprefixedTables = allTables.map(t => {
    const parts = t.split('.');
    return parts.length > 1 ? parts[1] : t;
  }).filter(Boolean) as string[];

  const matchedTable = findBestMatch(table, unprefixedTables);
  console.log(`[readTableSchema] User input: "${table}", Matched table: "${matchedTable}"`);

  // if a close match is found, but it's not exact, ask for confirmation.
  if (matchedTable && matchedTable.toLowerCase() !== table.toLowerCase()) {
    return `Did you mean the table "${matchedTable}"? Please confirm by responding with "yes" or by providing the correct table name.`;
  }

  if (!matchedTable) {
    const availableTables = unprefixedTables.join(', ');
    return `Error: Table "${table}" not found in schema "${schema}". Did you mean one of these: [${availableTables}]?`;
  }

  const uri = `${baseUri}/${schema}/${matchedTable}`;

  if (tableSchemaCache[uri]) return tableSchemaCache[uri];

  console.log('readTableSchema uri:', uri);

  try {
    // fetch it
    const { contents } = await mcpClient.readResource({ uri, maxBytes: 8 * 1024 });
    console.log('readTableSchema contents:', contents);

    const schemaText =
      Array.isArray(contents) && contents[0] && typeof contents[0].text === 'string'
        ? contents[0].text
        : null;

    if (schemaText === null) {
      console.warn(`[readTableSchema] No valid schema text found for ${uri}`);
      tableSchemaCache[uri] = null;
    } else {
      console.log(`[readTableSchema] Successfully fetched schema for ${uri}`);
      let parsedSchema;
      try {
        const schemaJson = JSON.parse(schemaText);
        if (schemaJson && typeof schemaJson === 'object' && schemaJson.columns) {
          console.log('[readTableSchema] Parsed schema as JSON, returning full object.');
          parsedSchema = schemaJson;
        } else {
          console.log('[readTableSchema] JSON format not recognized, returning raw schema text.');
          parsedSchema = schemaText;
        }
      } catch (e) {
        console.log('[readTableSchema] Failed to parse as JSON, attempting to parse as SQL CREATE TABLE statement.');
        parsedSchema = schemaText;
      }
      tableSchemaCache[uri] = parsedSchema;
    }

    // subscribe to content updates for *this* URI
    try {
      // not implemented in mcp package
      // await mcpClient.subscribeResource({ uri });
      console.log(`[readTableSchema] Subscribed to updates for ${uri}`);
    } catch (subErr) {
      console.error(`[readTableSchema] Failed to subscribe to updates for ${uri}:`, subErr);
    }

    return tableSchemaCache[uri];
  } catch (err) {
    console.error(`[readTableSchema] Error fetching schema for ${uri}:`, err);
    // TODO: Decide if we want to throw, return null, or a custom error object here.
    return null;
  }
}

async function listConnections(): Promise<Array<{ baseUri: string; dbName: string; schemas: string[] }>> {
  try {
    await ensureSubscription();
    let resp;
    try {
      resp = await mcpClient.listResources();
    } catch (err) {
      console.error('[listConnections] Error fetching database resources:', err);
      return [];
    }

    if (!resp.resources || resp.resources.length === 0) {
      console.warn('[listConnections] No database resources found.');
      return [];
    }

    const connections: Array<{ baseUri: string; dbName: string; schemas: string[] }> = [];

    for (const resource of resp.resources) {
      try {
        const resourceWithSchemas = resource as any;
        if (resource.uri && typeof resource.name === 'string' && Array.isArray(resourceWithSchemas.schemas)) {
          connections.push({
            baseUri: resource.uri,
            dbName: resource.name,
            schemas: resourceWithSchemas.schemas
          });
        }
      } catch (err) {
        console.error('[listConnections] Error processing resource:', resource, err);
        // TODO: Decide if we want to skip or halt on resource error
        continue;
      }
    }

    return connections;
  } catch (err) {
    console.error('[listConnections] Unexpected error:', err);
    return [];
  }
}

export async function listMCPResources(): Promise<Resource[]> {
  try {
    await ensureSubscription();

    if (mcpResourcesCache) {
      console.log('[listMCPResources] Returning cached MCP resources.');
      return mcpResourcesCache;
    }

    console.log('[listMCPResources] Fetching MCP resources from server...');
    let mcpResources: Resource[] = [];
    try {
      const resp = await mcpClient.listResources();

      if (!resp.resources || !Array.isArray(resp.resources)) {
        throw new Error('Invalid [resources] response from MCP client.');
      }

      console.log('[listMCPResources] MCP resources:', resp.resources);

      mcpResources = resp.resources;
      console.log('[listMCPResources] Successfully fetched MCP resources:', mcpResources.length);
    } catch (err) {
      console.error('[listMCPResources] Failed to fetch MCP resources:', err);
      throw new Error('Failed to fetch MCP resources. Please try again later.');
    }

    mcpResourcesCache = mcpResources;
    return mcpResources;
  } catch (err) {
    console.error('[listMCPResources] Unexpected error during resource listing:', err);
    // Return an empty array as a fallback
    return [];
  }
}

// You must represent the actions on resources as tools for the LLM.
// An LLM's only way to interact with the world is through its "tool calling" or "function calling" ability.
// It cannot natively understand the concept of a "resource."
// Therefore, your job as the client is to create a "virtual" set of tools that represent the resource-access
// capabilities of your MCP server.
export const resourceTools: Record<string, Tool> = {
  listSchemas: tool({
    description: 'List available PostgreSQL schemas from a given database',
    parameters: z.object({}),
    execute: async (_args) => await listSchemas()
  }),
  listTables: tool({
    description: 'List tables in a given schema',
    parameters: z.object({ schema: z.string() }),
    execute: async (args) => await listTables(args as any)
  }),
  readTableSchema: tool({
    description: 'Fetch column definitions for a specific table, given a database, schema, and table name.',
    parameters: z.object({
      baseUri: z.string().describe('The base URI of the database connection (e.g., "postgresql://localhost:5432/my_database").'),
      schema: z.string().describe('The schema of the table (e.g., "public").'),
      table: z.string().describe('The name of the table (e.g., "users").')
    }),
    execute: async (args) => await readTableSchema(args as any)
  }),
  // readTableSchema: tool({
  //   description: 'Fetch column definitions for a specific table.',
  //   parameters: z.object({
  //     schema: z.string().describe('The schema of the table.'),
  //     table: z.string().describe('The name of the table.')
  //   }),
  //   execute: async (args) => await readTableSchema(args as any)
  // }),
  summaryResources: tool({
    description: 'One‐line summary of schemas and their table counts',
    parameters: z.object({}),
    execute: async (_args) => {
      console.log('summaryResources');
      return await summaryOfResources();
    }
  }),
  listResources: tool({
    description: 'List available resources from the MCP server',
    parameters: z.object({}),
    execute: async () => await listResources()
  }),
  // listConnections: tool({
  //   description: 'List available database connections and their base URIs.',
  //   parameters: z.object({}),
  //   execute: async () => await listConnections()
  // })
};


async function listResources() {
  const resp = await mcpClient.listResources();
  return resp.resources;
}
