import type { Sql } from 'postgres';


// A simple, in-memory generic cache.
const cache = new Map<string, any>();

// Prime the cache with the database schema info.
type DbSchemaTableMap = {
  [name: string]: {
    description: string;
    tables: {
      name: string;
      description: string;
    }[];
  };
};

let dbSchemaTableMap: DbSchemaTableMap | null = null;
async function primeCache(sql: Sql): Promise<void> {
  console.log('[CACHE] Initializing database schema info...');

  try {
    const query = sql`
      SELECT
        COALESCE(
          json_object_agg(
            T.schema_name,
            json_build_object(
              'description', T.schema_description,
              'tables', T.table_list
            )
          ),
          '{}'::json
        ) AS db_schema_table_map
      FROM (
        SELECT
          n.nspname AS schema_name,
          COALESCE(sd.description, '') AS schema_description,
          COALESCE(
            json_agg(
              json_build_object(
                'name', c.relname,
                'description', COALESCE(td.description, '')
              ) ORDER BY c.relname
            ) FILTER (WHERE c.relname IS NOT NULL),
            '[]'::json
          ) AS table_list
        FROM
          pg_namespace n
        LEFT JOIN
          pg_description sd ON sd.objoid = n.oid AND sd.objsubid = 0
        LEFT JOIN
          pg_class c ON n.oid = c.relnamespace AND c.relkind = 'r'
        LEFT JOIN
          pg_description td ON td.objoid = c.oid AND td.objsubid = 0
        WHERE
          n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND n.nspname NOT LIKE 'pg_temp_%'
          AND n.nspname NOT LIKE 'pg_toast_temp_%'
        GROUP BY
          n.nspname,
          sd.description
      ) AS T;
    `;

    const result = await query;

    if (result && result.length > 0 && result[0].db_schema_table_map) {
      dbSchemaTableMap = result[0].db_schema_table_map as DbSchemaTableMap;
      cache.set('dbSchemaTableMap', dbSchemaTableMap);
      console.log(`[CACHE] Database schema cache initialized with ${Object.keys(dbSchemaTableMap).length} schemas.`);
    } else {
      console.error('[CACHE] Failed to initialize schema cache: Query returned no results.');
      throw new Error('[CACHE] Failed to initialize schema cache: Query returned no results.');
    }
  } catch (error: any) {
    console.error('[CACHE] Failed to initialize schema cache:', error.message);
    throw error;
  }
}


export type { DbSchemaTableMap };
export { primeCache };
export default cache;
