import { sql }  from '@Lib/postgres.js';
import cache    from '@Lib/cache.js';


async function getUserInfo(uri: string, userName: string): Promise<any> {
  if (cache.has(uri)) {
    return cache.get(uri);
  }

  try {
    const result = await sql`
      WITH
        conn AS (
          SELECT
            -- inet_client_addr()::text    AS client_addr,
            -- inet_client_port()          AS client_port,
            -- inet_server_addr()::text    AS server_addr,
            -- inet_server_port()          AS server_port,
            current_database()          AS database_name,
            session_user,
            current_user
        ),
        role_attrs AS (
          SELECT
            rolname                     AS role_name,
            rolsuper                    AS is_superuser,
            rolcreaterole               AS can_create_roles,
            rolcreatedb                 AS can_create_db,
            rolcanlogin                 AS can_login,
            rolreplication              AS can_replicate,
            rolbypassrls                AS bypass_rls,
            rolconnlimit                AS conn_limit
          FROM pg_roles
          WHERE rolname = (SELECT current_user FROM conn)
        ),
        role_memberships AS (
          SELECT
            COALESCE(array_agg(r.rolname), '{}') AS member_of
          FROM pg_roles r
          JOIN pg_auth_members m ON r.oid = m.roleid
          JOIN pg_roles AS member_role ON m.member = member_role.oid
          WHERE
            member_role.rolname = (SELECT current_user FROM conn)
        ),
        db_privileges AS (
          SELECT
            has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
            has_database_privilege(current_user, current_database(), 'CREATE')  AS can_create
        )
      SELECT
        conn.*
        -- role_attrs.*,
        -- role_memberships.member_of,
        -- db_privileges.can_connect,
        -- db_privileges.can_create
      FROM conn
      -- CROSS JOIN role_attrs
      -- CROSS JOIN role_memberships
      -- CROSS JOIN db_privileges;
    `;

    if (result && result.length > 0) {
      const userInfoResult = result[0];
      cache.set(uri, userInfoResult);
      return userInfoResult;
    }

    throw new Error(`User '${userName}' not found`);
  } catch (error) {
    console.error(`Error fetching user info for ${userName}:`, error);
    throw new Error('Failed to query user info');
  }
}


export default getUserInfo;
