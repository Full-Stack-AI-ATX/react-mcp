import type { Server }            from '@modelcontextprotocol/sdk/server/index.js';
import type {
  ListResourcesRequest,
  ListResourcesResult,
  ReadResourceRequest,
  ReadResourceResult,
  SubscribeRequest,
  Resource
}                                 from '@modelcontextprotocol/sdk/types.js';
import type { DbSchemaTableMap }  from '@Lib/cache.js';

import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema
}                                 from '@modelcontextprotocol/sdk/types.js';
import { resourceBaseUrl }        from '@Lib/postgres.js';
import cache                      from '@Lib/cache.js';

import readResource               from './index.js';


function registerResourceHandlers(mcpServer: Server) {
  mcpServer.setRequestHandler(ListResourcesRequestSchema, async (request: ListResourcesRequest): Promise<ListResourcesResult> => {
    console.log(`[HANDLER - resources/list] START`);

    try {
      const user        = resourceBaseUrl.username;
      const dbName      = resourceBaseUrl.pathname.slice(1);
      const baseUri     = `postgresql://${user}@${dbName}`;
      const dbSchemaMap = cache.get('dbSchemaTableMap') as DbSchemaTableMap || {};

      const dbUserResource: Resource = {
        uri: `postgresql://${user}`,
        name: 'current user information',
        title: `Current User Connected to the database '${dbName}'`,
        description: 'This resource contains information about the user currently connected to the database. It provides information about the user, their role, membership in other roles, and their privileges.',
        mimeType: 'application/json'
      };

      const dbInfo: Resource = {
        uri: baseUri,
        name: 'basic database information',
        title: `Database '${dbName}'`,
        description: 'This resource contains information about the connected database such as the name, owner, encoding, collation, ctype, tablespace, size, connection limit, and access privileges.',
        mimeType: 'application/json'
      };

      const schemasResource: Resource = {
        uri: `${baseUri}/schemas`,
        name: 'database schema list',
        title: `List of schemas in the '${dbName}' database`,
        description: 'This resource contains information about the schemas in the connected database.',
        mimeType: 'application/json'
      };

      const dynamicResources = Object.keys(dbSchemaMap).map(schemaName => {
        const resources: Resource[] = [];
        const schemaDetails = dbSchemaMap[schemaName];

        const schemaResource: Resource = {
          uri: `${baseUri}/schemas/${schemaName}`,
          name: `'${schemaName}' schema information`,
          title: `Information about the schema '${schemaName}'`,
          description: schemaDetails.description || `This resource provides details about the '${schemaName}' schema.`,
          mimeType: 'application/json'
        };
        resources.push(schemaResource);

        // Only add table resources if the schema has tables.
        if (schemaDetails && schemaDetails.tables.length > 0) {
          const tablesListResource: Resource = {
            uri: `${baseUri}/schemas/${schemaName}/tables`,
            name: `'${schemaName}' table list`,
            title: `List of tables in the '${schemaName}' schema`,
            description: 'This resource contains information about the tables in the particular schema in the connected database.',
            mimeType: 'application/json'
          };
          resources.push(tablesListResource);

          const tableDetailResources: Resource[] = schemaDetails.tables.map((table: { name: string; description: string }) => {
            return {
              uri: `${baseUri}/schemas/${schemaName}/tables/${table.name}`,
              name: `'${schemaName}.${table.name}' table information`,
              title: `Information about the table '${schemaName}.${table.name}'`,
              description: table.description || `This resource provides details about the '${table.name}' table in the '${schemaName}' schema.`,
              mimeType: 'application/json'
            };
          });

          resources.push(...tableDetailResources);
        }

        return resources;
      }).flat();

      const response = {
        resources: [dbInfo, dbUserResource, schemasResource, ...dynamicResources]
      };

      console.log(`[HANDLER - resources/list] Sending response `, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('Error in ListResources handler:', error);
      throw new Error('Failed to list resources');
    }
  });

  mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest): Promise<ReadResourceResult> => {
    // expected URI formats are:
    // 1. postgresql://<dbName>
    // 2. postgresql://<dbName>/schemas
    // 3. postgresql://<dbName>/schemas/<schemaName>
    // 4. postgresql://<dbName>/schemas/<schemaName>/tables
    // 5. postgresql://<dbName>/schemas/<schemaName>/tables/<tableName>
    const uri = request.params.uri;
    console.log(`[HANDLER - resources/read] START. URI: ${uri}`);
    try {
      // TODO: need to validate the URI format
      const responseContent = await readResource(uri);

      const response: ReadResourceResult = {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify(responseContent, null, 2)
          }
        ]
      };
      console.log(`[HANDLER - resources/read] Sending response for URI: ${request.params.uri}`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error(`Error in ReadResource handler for URI ${uri}:`, error);
      throw new Error(`Failed to read resource: Internal error`);
    }
  });

  mcpServer.setRequestHandler(SubscribeRequestSchema, async (request: SubscribeRequest) => {
    const uri = request.params.uri;
    console.warn(`[HANDLER - resources/subscribe] Received subscription request for URI: ${uri}`);
    try {
      // mocked success response for development
      const mockSubscriptionId = `sub_${Date.now()}`;
      console.log(`[HANDLER - resources/subscribe] Mocking successful subscription for URI: ${uri} with ID: ${mockSubscriptionId}`);
      return {
        subscriptionId: mockSubscriptionId
      };
    } catch (error) {
      console.error(`Error in Subscribe handler for URI ${uri}:`, error);
      // In a real implementation, you'd return a proper error response.
      // For now, we'll rethrow to indicate a server-side failure.
      throw error;
    }
  });
}


export default registerResourceHandlers;
