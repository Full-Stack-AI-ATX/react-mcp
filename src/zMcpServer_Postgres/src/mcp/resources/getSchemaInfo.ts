import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getSchemaInfo(uri: string, dbName: string, schemaName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      WITH
        -- 1) Schema metadata
        sch AS (
          SELECT
            n.nspname                    AS schema_name,
            pg_get_userbyid(n.nspowner)  AS schema_owner
          FROM pg_namespace n
          WHERE n.nspname = ${schemaName}
        ),

        -- 2) Total size of relations in the schema
        schema_size AS (
          SELECT
            n.nspname                    AS schema_name,
            pg_size_pretty(
              SUM(pg_total_relation_size(c.oid))
            )                             AS size
          FROM pg_namespace n
          LEFT JOIN pg_class c
            ON c.relnamespace = n.oid
          WHERE n.nspname = ${schemaName}
          GROUP BY n.nspname
        ),

        -- 3) Break out the raw ACL items for the schema
        schema_acl AS (
          SELECT
            n.nspname                                   AS schema_name,
            split_part(acl_item::text, '=', 1)          AS grantee,
            split_part(split_part(acl_item::text, '/',1), '=',2) AS priv_bits
          FROM pg_namespace n
          CROSS JOIN unnest(coalesce(n.nspacl, array[]::aclitem[])) AS acl_item
          WHERE n.nspname = ${schemaName}
        ),

        -- 4) Decode USAGE (U) and CREATE (C) bits into JSON
        privileges AS (
          SELECT
            schema_name,
            jsonb_agg(
              jsonb_build_object(
                'grantee',      grantee,
                'grant_usage',  (priv_bits LIKE '%U%'),
                'grant_create', (priv_bits LIKE '%C%')
              )
            ) AS privileges
          FROM schema_acl
          GROUP BY schema_name
        ),

        -- 5) Tables in the schema
        tbls AS (
          SELECT
            t.table_schema,
            jsonb_agg(t.table_name)       AS tables
          FROM information_schema.tables t
          WHERE t.table_schema = ${schemaName}
            AND t.table_type   = 'BASE TABLE'
          GROUP BY t.table_schema
        ),

        -- 6) Views in the schema
        vws AS (
          SELECT
            v.table_schema,
            jsonb_agg(v.table_name)       AS views
          FROM information_schema.views v
          WHERE v.table_schema = ${schemaName}
          GROUP BY v.table_schema
        ),

        -- 7) Sequences in the schema
        seqs AS (
          SELECT
            s.sequence_schema,
            jsonb_agg(s.sequence_name)    AS sequences
          FROM information_schema.sequences s
          WHERE s.sequence_schema = ${schemaName}
          GROUP BY s.sequence_schema
        ),

        -- 8) Routines (functions & procedures) in the schema
        rts AS (
          SELECT
            r.routine_schema,
            jsonb_agg(
              jsonb_build_object(
                'name',      r.routine_name,
                'type',      r.routine_type,
                'return',    r.data_type
              )
            )                             AS routines
          FROM information_schema.routines r
          WHERE r.routine_schema = ${schemaName}
          GROUP BY r.routine_schema
        )

      SELECT
        jsonb_build_object(
          'schema',     sch.schema_name,
          'owner',      sch.schema_owner,
          'size',       coalesce(ss.size,        '0 bytes'),
          'privileges', coalesce(p.privileges,   '[]'::jsonb),
          'tables',     coalesce(tbls.tables,    '[]'::jsonb),
          'views',      coalesce(vws.views,      '[]'::jsonb),
          'sequences',  coalesce(seqs.sequences, '[]'::jsonb),
          'routines',   coalesce(rts.routines,   '[]'::jsonb)
        ) AS schema_info
      FROM sch
      LEFT JOIN schema_size ss  ON ss.schema_name  = sch.schema_name
      LEFT JOIN privileges p    ON p.schema_name   = sch.schema_name
      LEFT JOIN tbls           ON tbls.table_schema = sch.schema_name
      LEFT JOIN vws            ON vws.table_schema  = sch.schema_name
      LEFT JOIN seqs           ON seqs.sequence_schema = sch.schema_name
      LEFT JOIN rts            ON rts.routine_schema   = sch.schema_name;
    `;

    if (result && result.length > 0 && result[0].schema_info) {
      const schemaInfoResult = result[0].schema_info;
      cache.set(uri, schemaInfoResult);
      return schemaInfoResult;
    }

    throw new Error(`Schema '${schemaName}' not found in database '${dbName}'`);
  } catch (error) {
    console.error(`Error fetching schema info for ${schemaName} in ${dbName}:`, error);
    throw new Error('Failed to query schema info');
  }
}


export default getSchemaInfo;
