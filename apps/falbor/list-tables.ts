import { db } from './app/lib/visual-editor/db';
import { sql } from 'drizzle-orm';

async function listTables() {
  try {
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
    console.log("Tables in database:", result.map(r => r.table_name));
  } catch (error) {
    console.error("Error fetching tables:", error);
  }
}

listTables();
