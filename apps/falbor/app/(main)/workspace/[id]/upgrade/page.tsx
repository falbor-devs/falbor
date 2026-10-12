import React, { Suspense } from 'react';
import { UpgradeView } from '~/components/billing/UpgradeView';
import { getWorkspaceById } from '~/lib/actions/workspaces';

interface Props {
  params: { id: string };
}

export default async function WorkspaceUpgradePage({ params }: Props) {
  const workspace = await getWorkspaceById(params.id);
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-black p-6 md:p-10">
      <Suspense fallback={null}>
        <UpgradeView workspaceId={params.id} paypalClientId={paypalClientId} />
      </Suspense>
    </div>
  );
}

