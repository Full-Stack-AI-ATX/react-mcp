import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getTableList(uri: string, dbName: string, schemaName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      SELECT
        c.relname              AS table_name
      FROM pg_class c
      JOIN pg_namespace n
        ON c.relnamespace = n.oid
      LEFT JOIN pg_roles r
        ON c.relowner = r.oid
      WHERE n.nspname = ${schemaName}
        AND c.relkind = 'r'
      ORDER BY c.relname
    `;

    if (result && result.length > 0) {
      const tableList = result.map(row => row.table_name);
      const finalResult = { tables: tableList };

      cache.set(uri, finalResult);
      return finalResult;
    }

    throw new Error(`No tables found in schema '${schemaName}' in database '${dbName}'`);
  } catch (error) {
    console.error(`Error fetching table list for schema '${schemaName}' in ${dbName}:`, error);
    throw new Error('Failed to query table list');
  }
}


export default getTableList;
