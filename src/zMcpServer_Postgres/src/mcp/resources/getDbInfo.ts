import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getDbInfo(uri: string, dbName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      SELECT
        d.datname                                   AS "Name",
        pg_catalog.pg_get_userbyid(d.datdba)        AS "Owner",
        pg_encoding_to_char(d.encoding)             AS "Encoding",
        d.datcollate                                AS "Collate",
        d.datctype                                  AS "Ctype",
        ts.spcname                                  AS "Tablespace",
        pg_size_pretty(pg_database_size(d.datname)) AS "Size",
        d.datconnlimit                              AS "Connection Limit",
        d.datallowconn                              AS "Allow Connections",
        d.datistemplate                             AS "Is Template",
        d.datacl                                    AS "Access Privileges"
      FROM pg_database d
      LEFT JOIN pg_tablespace ts ON d.dattablespace = ts.oid
      WHERE d.datname = ${dbName};
    `;

    if (result && result.length > 0) {
      const dbInfoResult = result[0];
      cache.set(uri, dbInfoResult);
      return dbInfoResult;
    }

    throw new Error(`Database '${dbName}' not found`);
  } catch (error) {
    console.error(`Error fetching DB info for ${dbName}:`, error);
    throw new Error('Failed to query database info');
  }
}


export default getDbInfo;
