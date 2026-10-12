// Quick script to check what's in the DB for workspace 9ef7c57c-e4e4-49fc-b752-e82196356047
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load env
const { config } = await import('dotenv');
config({ path: '.env' });

const { drizzle } = await import('drizzle-orm/postgres-js');
const postgres = (await import('postgres')).default;

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

const workspaceId = '9ef7c57c-e4e4-49fc-b752-e82196356047';

const result = await client`
  SELECT 
    id, name,
    CASE WHEN context_prompt IS NOT NULL THEN 'YES' ELSE 'NO' END as has_context_prompt,
    CASE WHEN intelligence_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_intelligence_data,
    CASE WHEN sources_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_sources_data,
    LEFT(context_prompt, 300) as context_prompt_preview,
    intelligence_data
  FROM workspaces 
  WHERE id = ${workspaceId}
`;

console.log('=== WORKSPACE ===');
console.log(JSON.stringify(result[0], null, 2));

const products = await client`
  SELECT id, name, description, workspace_id FROM products WHERE workspace_id = ${workspaceId}
`;
console.log('\n=== PRODUCTS ===');
console.log(JSON.stringify(products, null, 2));

await client.end();
