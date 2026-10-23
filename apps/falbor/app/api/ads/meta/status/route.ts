import { NextResponse } from 'next/server';
import { requireMetaContext } from '~/lib/services/metaAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ connected: false, accounts: [] });
  }

  try {
    const context = await requireMetaContext(workspaceId);
    return NextResponse.json({
      connected: true,
      enabledAccountId: context.adAccountId,
      accountName: context.accountName,
      accounts: [
        {
          adAccountId: context.adAccountId,
          name: context.accountName,
        },
      ],
    });
  } catch (err: any) {
    const message = err?.message || 'unknown_error';
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: message === 'Forbidden' ? 403 : 401 });
    }
    return NextResponse.json({ connected: false, accounts: [] });
  }
}
