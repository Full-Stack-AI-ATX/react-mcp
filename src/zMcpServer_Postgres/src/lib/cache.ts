import type { Sql } from 'postgres';


// A simple, in-memory generic cache.
const cache = new Map<string, any>();

// Prime the cache with the database schema info.
type DbSchemaTableMap = {
  [name: string]: {
    tableList: string[];
  };
};

let dbSchemaTableMap: DbSchemaTableMap | null = null;
async function primeCache(sql: Sql): Promise<void> {
  console.log('[CACHE] Initializing database schema info...');

  try {
    const query = sql`
      WITH user_schemas AS (
        SELECT nspname
        FROM pg_namespace
        WHERE
          nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
          AND nspname NOT LIKE 'pg_temp_%'
          AND nspname NOT LIKE 'pg_toast_temp_%'
      ),
      tables_in_schemas AS (
        SELECT
          n.nspname AS table_schema,
          json_agg(c.relname ORDER BY c.relname) AS table_list
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE
          -- Only consider tables within the schemas we care about
          n.nspname IN (SELECT nspname FROM user_schemas)
          -- 'r' indicates an ordinary table
          AND c.relkind = 'r'
        GROUP BY
          n.nspname
      )
      SELECT
        COALESCE(
          (
            SELECT
              json_object_agg(
                us.nspname,
                json_build_object('tableList', COALESCE(tis.table_list, '[]'::json))
              )
            FROM user_schemas us
            LEFT JOIN tables_in_schemas tis ON us.nspname = tis.table_schema
          ),
          '{}'::json
        ) AS db_schema_table_map;
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
