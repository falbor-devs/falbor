import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.database.admin');

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function runQuery(databaseUrl: string, query: string) {
  const sql = neon(databaseUrl);
  // Use function call syntax which works across neon versions
  const rows = await sql(query) as any[];
  return { rows, fields: null as any[] | null };
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (!text) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }
    const { chatId, databaseUrl, action, payload } = JSON.parse(text);

    logger.info(`Received admin DB request: action=${action}, chatId=${chatId}`);

    if (!chatId || !databaseUrl || !action) {
      logger.error('Missing required fields:', { chatId: !!chatId, databaseUrl: !!databaseUrl, action: !!action });
      return NextResponse.json({ error: 'chatId, databaseUrl, and action are required' }, { status: 400 });
    }

    if (action === 'get_tables') {
      logger.info(`Running get_tables for ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
      const { rows } = await runQuery(databaseUrl, `
        SELECT schemaname, tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, tablename;
      `);

      const tables = rows.map((r: any) => ({
        schema: r.schemaname,
        name: r.tablename,
        fullName: r.schemaname === 'public' ? r.tablename : `${r.schemaname}.${r.tablename}`,
      }));

      logger.info(`Found ${tables.length} tables:`, tables.map(t => t.fullName).join(', '));
      return NextResponse.json({ tables });
    }

    if (action === 'get_table_data') {
      const fullTableName = payload?.tableName;
      if (!fullTableName || !/^[a-zA-Z0-9_.]+$/.test(fullTableName)) {
        return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
      }

      let schema = 'public';
      let table = fullTableName;
      if (fullTableName.includes('.')) {
        const parts = fullTableName.split('.');
        schema = parts[0];
        table = parts[1];
      }

      const { rows, fields } = await runQuery(databaseUrl, `SELECT * FROM "${schema}"."${table}" LIMIT 100;`);
      const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);
      return NextResponse.json({ rows, columns });
    }
    
    if (action === 'run_sql') {
      const query = payload?.query;
      if (!query) {
        return NextResponse.json({ error: 'query is required' }, { status: 400 });
      }
      const { rows, fields } = await runQuery(databaseUrl, query);
      const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);
      return NextResponse.json({ rows, columns });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error: any) {
    logger.error('Admin DB Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
