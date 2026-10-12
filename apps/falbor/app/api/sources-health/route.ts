/**
 * Sources health check API — tests LLM connection, Tor availability, and search engine reachability.
 */
import { NextRequest } from 'next/server';
import { getUserId } from '~/lib/auth';
import { checkTor, checkLLM, checkSearchEngines, getProviderStatuses } from '~/lib/sources/health';
import { getAvailableModels } from '~/lib/sources/llm-pipeline';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const userId = await getUserId(request as unknown as NextRequest);
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const check = searchParams.get('check'); // 'llm' | 'engines' | 'all'

  if (check === 'llm') {
    const result = await checkLLM();
    return Response.json(result);
  }

  if (check === 'engines') {
    const [tor, engines] = await Promise.all([checkTor(), checkSearchEngines()]);
    return Response.json({ tor, engines });
  }

  // Default: return providers + models list (fast, no network)
  return Response.json({
    providers: getProviderStatuses(),
    available_models: getAvailableModels(),
  });
}
