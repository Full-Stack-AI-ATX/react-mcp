import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getSchemaList(uri: string, dbName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      SELECT
        n.nspname AS schema_name
      FROM
        pg_namespace n
      WHERE
        n.nspname NOT LIKE 'pg_%'
          AND
        n.nspname <> 'information_schema'
      ORDER BY
        n.nspname
    `;

    if (result && result.length > 0) {
      const schemaList = result.map(row => row.schema_name);
      const finalResult = { schemas: schemaList };
      cache.set(uri, finalResult);
      return finalResult;
    }

    throw new Error(`No schemas found in database '${dbName}'`);
  } catch (error) {
    console.error(`Error fetching schema list for ${dbName}:`, error);
    throw new Error('Failed to query schema list');
  }
}


export default getSchemaList;
