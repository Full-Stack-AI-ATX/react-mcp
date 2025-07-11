import listResources  from './listResources';
import readSchemas    from './readSchemas';
import readTables     from './readTables';
import readTableInfo  from './readTableInfo';
import readResource   from './readResource';

// You must represent the actions on resources as tools for the LLM.
// An LLM's only way to interact with the world is through its "tool calling" or "function calling" ability.
// It cannot natively understand the concept of a "resource."
// Therefore, your job as the client is to create a "virtual" set of tools that represent the resource-access
// capabilities of your MCP server.
// const readTableSchema = tool({
//   description: 'Fetch column definitions for a specific table, given a database, schema, and table name.',
//   parameters: z.object({
//     baseUri: z.string().describe('The base URI of the database connection (e.g., "postgresql://localhost:5432/my_database").'),
//     schema: z.string().describe('The schema of the table (e.g., "public").'),
//     table: z.string().describe('The name of the table (e.g., "users").')
//   }),
//   execute: async (args) => await readTableSchema(args as any)
// }),
// readTableSchema: tool({
//   description: 'Fetch column definitions for a specific table.',
//   parameters: z.object({
//     schema: z.string().describe('The schema of the table.'),
//     table: z.string().describe('The name of the table.')
//   }),
//   execute: async (args) => await readTableSchema(args as any)
// }),
// const summaryResources = tool({
//   description: 'One‐line summary of schemas and their table counts',
//   parameters: z.object({}),
//   execute: async (_args) => {
//     console.log('summaryResources');
//     return await summaryOfResources();
//   }
// }),
// listConnections: tool({
//   description: 'List available database connections and their base URIs.',
//   parameters: z.object({}),
//   execute: async () => await listConnections()
// })


export {
  listResources,
  readSchemas,
  readTables,
  readTableInfo,
  readResource
}
