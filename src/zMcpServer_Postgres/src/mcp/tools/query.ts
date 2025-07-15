import type {
  Tool,
  CallToolResult
}                               from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchemaType }  from 'ajv';

import { parse }                from 'pgsql-parser';
import { deparse }              from 'pgsql-deparser';
import { walk, type NodePath }  from '@pgsql/traverse';
import type {
  ParseResult,
  SelectStmt,
  RawStmt
}                               from '@pgsql/types';
import { sql }                  from '@Lib/postgres.js';


type QueryToolArgs = {
  sql: string;
};

const queryToolSchema: JSONSchemaType<QueryToolArgs> = {
  type: 'object',
  properties: { sql: { type: 'string', minLength: 1 } },
  required: ['sql'],
  additionalProperties: false
};

const queryTool: Tool = {
  name: 'query',
  description: 'Run a read-only SQL query',
  inputSchema: {
    ...queryToolSchema,
    required: [...queryToolSchema.required]
  }
};

async function queryToolHandler(args: QueryToolArgs): Promise<CallToolResult> {
  try {
    const parseResult: ParseResult = await parse(args.sql);

    if (!parseResult.stmts) {
      throw new Error('Could not parse SQL statement.');
    }

    // Filter out empty statements that can result from trailing semicolons.
    const nonEmptyStatements: RawStmt[] = parseResult.stmts.filter(s => s.stmt && Object.keys(s.stmt).length > 0);

    // 1. Ensure there's only one statement.
    if (nonEmptyStatements.length !== 1) {
      throw new Error('Only a single SQL statement is allowed.');
    }

    // 2. Ensure the statement is a 'SelectStmt', which covers SELECT, WITH, etc.
    const statement = nonEmptyStatements[0].stmt;
    if (!statement || !('SelectStmt' in statement)) {
      throw new Error('Only SELECT statements are allowed.');
    }

    // 3. Walk the AST to ensure no nested statements can modify data or access forbidden resources.
    let isMutation = false;
    let accessesForbiddenResource = false;
    const forbiddenNodes = [
      'InsertStmt', 'UpdateStmt', 'DeleteStmt', 'CopyStmt', 'CreateStmt',
      'DropStmt', 'AlterTableStmt', 'TruncateStmt', 'GrantStmt', 'LockStmt'
    ];
    // Deny access to system catalogs to prevent info disclosure.
    // information_schema is commented out as it may be needed for legitimate
    // metadata queries, but it can also be a source of leaks.
    const forbiddenSchemas = ['pg_catalog' /*, 'information_schema'*/];

    // Deny functions that could interact with the filesystem or network.
    const forbiddenFunctions = [
      'pg_read_file', 'pg_read_binary_file', 'pg_ls_dir',
      'dblink_connect', 'dblink'
    ];

    walk(nonEmptyStatements, (path: NodePath) => {
      if (forbiddenNodes.includes(path.tag)) {
        isMutation = true;
        return false;
      }

      // Check for access to forbidden schemas in table references
      if (path.node?.RangeVar?.schemaname && forbiddenSchemas.includes(path.node.RangeVar.schemaname)) {
        console.warn(`[HANDLER - query] Denied access to forbidden schema: ${path.node.RangeVar.schemaname}`);
        accessesForbiddenResource = true;
        return false;
      }

      // Check for use of forbidden functions
      if (path.node?.FuncCall?.funcname) {
        const funcNameParts = path.node.FuncCall.funcname.map((p: any) => p.String?.str).filter(Boolean);
        const funcName = funcNameParts.pop(); // Get the base name of the function

        if (funcName && forbiddenFunctions.includes(funcName)) {
          console.warn(`[HANDLER - query] Denied use of forbidden function: ${funcName}`);
          accessesForbiddenResource = true;
          return false;
        }
      }
    });

    if (isMutation) {
      throw new Error('Data-modifying statements are not allowed.');
    }

    if (accessesForbiddenResource) {
      throw new Error('Access to security-sensitive schemas or functions is not allowed.');
    }

    // 4. Enforce a LIMIT on the query to prevent excessive results.
    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 100;

    const selectStmt: SelectStmt = statement.SelectStmt;
    const limitCountNode = selectStmt.limitCount;

    if (limitCountNode && 'A_Const' in limitCountNode) {
      // If a LIMIT exists, cap it at the maximum.
      const existingLimit = limitCountNode.A_Const.ival?.ival;
      if (existingLimit && existingLimit > MAX_LIMIT) {
        limitCountNode.A_Const.ival = { ival: MAX_LIMIT };
        console.log(`[HANDLER - query] Original LIMIT ${existingLimit} exceeded max; capping at ${MAX_LIMIT}.`);
      }
    } else if (!limitCountNode) {
      // If no LIMIT exists, add the default.
      selectStmt.limitCount = {
        A_Const: { ival: { ival: DEFAULT_LIMIT } }
      };
      console.log(`[HANDLER - query] No LIMIT found; applying default of ${DEFAULT_LIMIT}.`);
    }

    const safeSql = await deparse({ ...parseResult, stmts: nonEmptyStatements });

    console.log(`[HANDLER - query] Executing read-only query...`, safeSql);
    const result = await sql.begin(async (tx) => {
      await tx.unsafe('SET TRANSACTION READ ONLY');
      return tx.unsafe(safeSql);
    });

    console.log(`[HANDLER - query] Result:`, result);

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: false
    };
  } catch (error: any) {
    console.error(`[HANDLER - query] ERROR:`, error);
    return {
      content: [{ type: 'text', text: error.message }],
      isError: true
    };
  }
}


export {
  queryTool,
  queryToolSchema,
  queryToolHandler
};
