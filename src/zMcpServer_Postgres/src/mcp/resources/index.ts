import cache          from '@Lib/cache.js';

import getDbInfo      from './getDbInfo.js';
import getTableInfo   from './getTableInfo.js';
import getTableList   from './getTableList.js';
import getSchemaInfo  from './getSchemaInfo.js';
import getSchemaList  from './getSchemaList.js';
import getUserInfo    from './getUserInfo.js';


async function readResource(uri: string): Promise<unknown> {
  if (cache.has(uri)) {
    console.log(`[CACHE] Resource retrieved from cache for URI: ${uri}`);
    return cache.get(uri);
  }

  console.log(`[CACHE] Resource not in cache, fetching from database for URI: ${uri}`);
  const resource = await getResource(uri);

  return resource;
}

async function getResource(uri: string): Promise<unknown> {
  try {
    const resourceUrl = new URL(uri);
    const dbName      = resourceUrl.hostname;
    const userName    = resourceUrl.username;
    const pathParts   = resourceUrl.pathname.slice(1).split('/').filter(p => p);

    // Handle root resources (no path)
    if (pathParts.length === 0) {
      // URI: postgresql://<user>@<dbName>
      if (userName) {
        return await getDbInfo(uri, dbName);
      }
      // URI: postgresql://<user>
      // The URL parser places the user in `hostname` when no '@' is present.
      else {
        const user = dbName;
        return await getUserInfo(uri, user);
      }
    }

    // From here, all URIs should have a path and are related to a database.
    const schemaName = pathParts[1]; // e.g., /schemas/<schemaName>

    // URI: postgresql://<user>@<dbName>/schemas
    if (pathParts.length === 1 && pathParts[0] === 'schemas') {
      return await getSchemaList(uri, dbName);
    }

    // URI: postgresql://<user>@<dbName>/schemas/<schemaName>
    if (pathParts.length === 2 && pathParts[0] === 'schemas') {
      return await getSchemaInfo(uri, dbName, schemaName);
    }

    const tableName = pathParts[3]; // e.g., /schemas/<schemaName>/tables/<tableName>

    // URI: postgresql://<user>@<dbName>/schemas/<schemaName>/tables
    if (pathParts.length === 3 && pathParts[0] === 'schemas' && pathParts[2] === 'tables') {
      return await getTableList(uri, dbName, schemaName);
    }

    // URI: postgresql://<user>@<dbName>/schemas/<schemaName>/tables/<tableName>
    if (pathParts.length === 4 && pathParts[0] === 'schemas' && pathParts[2] === 'tables') {
      return await getTableInfo(uri, dbName, schemaName, tableName);
    }

    console.warn(`[CACHE] No resource handler found for URI: ${uri}`);
    return null;
  } catch (error) {
    console.error(`Error in getResource for URI ${uri}:`, error);
    throw new Error('Failed to fetch resource');
  }
}


export default readResource;
