import React from 'react';
import { acceptWorkspaceInvite } from '~/lib/actions/workspaceMembers';
import { redirect } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface InvitePageProps {
  params: {
    slug: string;
  };
}

export default async function InviteAcceptPage({ params }: InvitePageProps) {
  const code = params.slug;
  let success = false;
  let workspaceId = '';
  let errorMessage = '';

  try {
    const res = await acceptWorkspaceInvite(code);
    success = true;
    workspaceId = res.workspaceId;
  } catch (err: any) {
    errorMessage = err?.message || 'Failed to process invitation.';
  }

  if (success && workspaceId) {
    redirect(`/workspace/${workspaceId}`);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] p-6 text-white font-sans">
      <div className="w-full max-w-md bg-[#141417] border border-gray-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
        {success ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black">Invitation Accepted!</h1>
            <p className="text-xs text-gray-400">You have successfully joined the workspace. Redirecting...</p>
            <Link
              href={`/workspace/${workspaceId}`}
              className="inline-block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs transition-colors"
            >
              Go to Workspace
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black">Invitation Error</h1>
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{errorMessage}</p>
            <Link
              href="/workspace"
              className="inline-block w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold text-xs transition-colors"
            >
              Return to Workspaces
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
