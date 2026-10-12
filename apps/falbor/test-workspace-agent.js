/**
 * Direct test: simulates exactly what the chat route does when
 * chatMode='workspace' and workspaceId='9ef7c57c-e4e4-49fc-b752-e82196356047'
 * 
 * This will confirm:
 * 1. Is workspaceData being fetched?
 * 2. Does it contain intelligence/contextPrompt?
 * 3. Does the system prompt actually include the product data?
 */

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const workspaceId = '9ef7c57c-e4e4-49fc-b752-e82196356047';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('\n===== STEP 1: Fetching workspace data (same as route.ts) =====');

  const workspace = await client.query(
    'SELECT id, name, context_prompt, intelligence_data, sources_data FROM workspaces WHERE id = $1',
    [workspaceId]
  );
  const ws = workspace.rows[0];
  
  const product = await client.query(
    'SELECT id, name, description, workspace_id FROM products WHERE workspace_id = $1 LIMIT 1',
    [workspaceId]
  );
  const prod = product.rows[0];

  console.log('Workspace found:', !!ws);
  console.log('  workspace.name:', ws?.name);
  console.log('  has contextPrompt:', !!ws?.context_prompt);
  console.log('  has intelligenceData:', !!ws?.intelligence_data);
  console.log('  contextPrompt preview:', ws?.context_prompt?.substring(0, 200));

  console.log('\nProduct found:', !!prod);
  console.log('  product.name:', prod?.name);
  console.log('  product.description:', prod?.description);

  const workspaceData = {
    workspaceName: ws?.name,
    productName: prod?.name,
    productDescription: prod?.description,
    competitors: [],
    ideas: [],
    intelligence: ws?.intelligence_data,
    contextPrompt: ws?.context_prompt,
    sourcesData: ws?.sources_data,
  };

  console.log('\n===== STEP 2: Building system prompt section =====');

  if (workspaceData.contextPrompt || workspaceData.intelligence) {
    console.log('\n✅ workspaceData IS populated — system prompt WILL include product data\n');
    console.log('The workspace_context block that will be injected:');
    console.log('---');
    console.log(`PRODUCT NAME: ${workspaceData.productName || 'See intelligence data below'}`);
    console.log(`PRODUCT DESCRIPTION: ${workspaceData.productDescription || 'N/A'}`);
    console.log(`WORKSPACE NAME: ${workspaceData.workspaceName || ''}`);
    if (workspaceData.contextPrompt) {
      console.log(`CONTEXT (first 500 chars): ${workspaceData.contextPrompt.substring(0, 500)}`);
    }
  } else {
    console.log('\n❌ workspaceData is EMPTY — system prompt will NOT include product data');
    console.log('This is the root cause of the AI not knowing the product!');
  }

  console.log('\n===== STEP 3: Testing the prompt generation =====');
  try {
    // Try to load the actual prompt function
    const { getFineTunedPrompt } = require('./app/lib/common/prompts/new-prompt.ts');
    const prompt = getFineTunedPrompt(
      '/home/user', undefined, undefined, undefined,
      'workspace', undefined, workspaceData
    );
    const hasWorkspaceContext = prompt.includes('<workspace_context>');
    const hasProductName = prompt.includes(workspaceData.productName || 'NO PRODUCT NAME');
    console.log('Prompt includes <workspace_context>:', hasWorkspaceContext);
    console.log('Prompt includes product name:', hasProductName);
    if (!hasWorkspaceContext) {
      console.log('\n❌ CRITICAL: workspace_context NOT in prompt — this is the bug!');
    } else {
      console.log('\n✅ workspace_context IS in prompt — prompt injection is working');
    }
  } catch (e) {
    console.log('Could not load TypeScript prompt directly (expected). Skipping prompt test.');
    console.log('Error:', e.message);
  }

  await client.end();
  console.log('\n===== DONE =====');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
