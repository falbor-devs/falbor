require('dotenv').config({ path: 'apps/falbor/.env' });
const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const tables = ['creator_processing_logs', 'creator_automation_settings', 'creator_streams', 'creator_clips', 'element_comments', 'creator_connected_accounts'];
  
  for (const t of tables) {
    const res = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${t};
    `;
    console.log(`Table: ${t}`);
    console.log(res);
  }
}
run().catch(console.error);
