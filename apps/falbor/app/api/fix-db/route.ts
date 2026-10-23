import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const tablesToSave = ['global_settings', 'repositories', 'adr_rules', 'pr_reports'];
    
    let newSchemaCode = '\n// Extracted from live DB to prevent Drizzle dropping them\n';
    
    for (const tableName of tablesToSave) {
      const res = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${tableName} AND table_schema = 'public'
      `;
      
      if (res.length === 0) continue;
      
      const camelCaseName = tableName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      
      newSchemaCode += `export const ${camelCaseName} = pgTable("${tableName}", {\n`;
      
      for (const row of res) {
        const col = row.column_name as string;
        const camelCol = col.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const type = row.data_type as string;
        
        if (col === 'id') {
           if (type === 'uuid') {
             newSchemaCode += `  id: uuid("id").primaryKey(),\n`;
           } else if (type === 'integer') {
             newSchemaCode += `  id: serial("id").primaryKey(),\n`;
           } else {
             newSchemaCode += `  id: text("id").primaryKey(),\n`;
           }
           continue;
        }
        
        if (type === 'text' || type === 'character varying') {
           newSchemaCode += `  ${camelCol}: text("${col}"),\n`;
        } else if (type === 'uuid') {
           newSchemaCode += `  ${camelCol}: uuid("${col}"),\n`;
        } else if (type === 'boolean') {
           newSchemaCode += `  ${camelCol}: boolean("${col}"),\n`;
        } else if (type === 'integer') {
           newSchemaCode += `  ${camelCol}: integer("${col}"),\n`;
        } else if (type === 'jsonb' || type === 'json') {
           newSchemaCode += `  ${camelCol}: jsonb("${col}"),\n`;
        } else if (type === 'timestamp without time zone' || type === 'timestamp with time zone') {
           newSchemaCode += `  ${camelCol}: timestamp("${col}"),\n`;
        } else {
           newSchemaCode += `  ${camelCol}: text("${col}"),\n`;
        }
      }
      newSchemaCode += `});\n\n`;
    }
    
    const schemaPath = path.join(process.cwd(), 'app/lib/db/schema.ts');
    const existing = fs.readFileSync(schemaPath, 'utf8');
    // Idempotent: never append a table that is already declared in the schema.
    const missingBlocks = newSchemaCode
      .split(/(?=^export const )/m)
      .filter((block) => {
        const match = block.match(/^export const (\w+)/m);
        if (!match) return false;
        return !new RegExp(`export const ${match[1]}\\b`).test(existing);
      });
    const toAppend = missingBlocks.length
      ? '\n// Extracted from live DB to prevent Drizzle dropping them\n' + missingBlocks.join('')
      : '';
    if (toAppend) {
      fs.appendFileSync(schemaPath, toAppend);
    }

    return NextResponse.json({
      success: true,
      message: toAppend ? 'Missing tables appended to schema.ts!' : 'No missing tables to append.',
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
