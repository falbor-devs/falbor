const { execSync } = require('child_process');
require('dotenv').config({ path: '.env' });

const { Client } = require('pg');

const workspaceId = '9ef7c57c-e4e4-49fc-b752-e82196356047';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const wsRes = await client.query(`
    SELECT 
      id, name,
      CASE WHEN context_prompt IS NOT NULL THEN 'YES' ELSE 'NO' END as has_context_prompt,
      CASE WHEN intelligence_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_intelligence_data,
      LEFT(context_prompt, 500) as context_prompt_preview
    FROM workspaces 
    WHERE id = $1
  `, [workspaceId]);

  console.log('=== WORKSPACE ===');
  console.log(JSON.stringify(wsRes.rows[0], null, 2));

  const prodRes = await client.query(`
    SELECT id, name, description, workspace_id FROM products WHERE workspace_id = $1
  `, [workspaceId]);
  
  console.log('\n=== PRODUCTS ===');
  console.log(JSON.stringify(prodRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
