import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getTableInfo(uri: string, dbName: string, schemaName: string, tableName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      WITH
        -- 1) Columns
        cols AS (
          SELECT
            c.table_schema,
            c.table_name,
            jsonb_agg(
              jsonb_build_object(
                'column_name',      c.column_name,
                'data_type',        c.data_type,
                'is_nullable',      c.is_nullable,
                'column_default',   c.column_default,
                'ordinal_position', c.ordinal_position
              )
              ORDER BY c.ordinal_position
            ) AS columns
          FROM information_schema.columns c
          WHERE c.table_schema = ${schemaName}
            AND c.table_name   = ${tableName}
          GROUP BY c.table_schema, c.table_name
        ),

        -- 2) All constraints (PK, UNIQUE, CHECK)
        constraint_cols AS (
          SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS cols
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name  = tc.constraint_name
           AND kcu.constraint_schema = tc.table_schema
           AND kcu.table_schema      = tc.table_schema
           AND kcu.table_name        = tc.table_name
          WHERE tc.table_schema = ${schemaName}
            AND tc.table_name   = ${tableName}
          GROUP BY tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
        ),
        cons AS (
          SELECT
            table_schema,
            table_name,
            jsonb_agg(
              jsonb_build_object(
                'constraint_name', constraint_name,
                'constraint_type', constraint_type,
                'columns',         cols
              )
            ) AS constraints
          FROM constraint_cols
          GROUP BY table_schema, table_name
        ),

        -- 3) Referencing columns of each FK
        fkey_cols AS (
          SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS fk_cols
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name  = tc.constraint_name
           AND kcu.constraint_schema = tc.table_schema
           AND kcu.table_schema      = tc.table_schema
           AND kcu.table_name        = tc.table_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema    = ${schemaName}
            AND tc.table_name      = ${tableName}
          GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
        ),

        -- 4) Referenced table/columns for each FK (no ordinal_position here)
        fkey_ref AS (
          SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name,
            min(ccu.table_schema || '.' || ccu.table_name)    AS referenced_table,
            array_agg(ccu.column_name)                         AS referenced_columns
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name  = tc.constraint_name
           AND ccu.constraint_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema    = ${schemaName}
            AND tc.table_name      = ${tableName}
          GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
        ),

        -- 5) Combine the FK pieces into JSON
        fkeys AS (
          SELECT
            fk.table_schema,
            fk.table_name,
            jsonb_agg(
              jsonb_build_object(
                'constraint_name',   fk.constraint_name,
                'columns',           fk.fk_cols,
                'referenced_table',  fr.referenced_table,
                'referenced_columns',fr.referenced_columns
              )
            ) AS foreign_keys
          FROM fkey_cols fk
          LEFT JOIN fkey_ref fr
            ON fk.table_schema    = fr.table_schema
           AND fk.table_name      = fr.table_name
           AND fk.constraint_name = fr.constraint_name
          GROUP BY fk.table_schema, fk.table_name
        ),

        -- 6) Index definitions
        idxs AS (
          SELECT
            schemaname   AS table_schema,
            tablename    AS table_name,
            jsonb_agg(
              jsonb_build_object(
                'index_name', indexname
              )
            ) AS indexes
          FROM pg_indexes
          WHERE schemaname = ${schemaName}
            AND tablename  = ${tableName}
          GROUP BY schemaname, tablename
        )

      SELECT
        jsonb_build_object(
          'table',        cols.table_schema || '.' || cols.table_name,
          'columns',      cols.columns,
          'constraints',  coalesce(cons.constraints,  '[]'::jsonb),
          'foreign_keys', coalesce(fkeys.foreign_keys,'[]'::jsonb),
          'indexes',      coalesce(idxs.indexes,      '[]'::jsonb)
        ) AS table_info
      FROM cols
      LEFT JOIN cons   USING (table_schema, table_name)
      LEFT JOIN fkeys  USING (table_schema, table_name)
      LEFT JOIN idxs   USING (table_schema, table_name)
    `;

    if (result && result.length > 0 && result[0].table_info) {
      const tableInfoResult = result[0].table_info;
      cache.set(uri, tableInfoResult);
      return tableInfoResult;
    }

    throw new Error(`Table '${tableName}' not found in schema '${schemaName}' in database '${dbName}'`);
  } catch (error) {
    console.error(`Error fetching table info for ${tableName} in ${schemaName}, ${dbName}:`, error);
    throw new Error('Failed to query table info');
  }
}


export default getTableInfo;
