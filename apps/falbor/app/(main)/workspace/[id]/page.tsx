import Page from '../../page';
import { getWorkspaceById, getLastUsedWorkspace } from '~/lib/actions/workspaces';
import { WorkspaceOnboardingModal } from '~/components/workspace/workspace-onboarding/WorkspaceOnboardingModal';
import { redirect } from 'next/navigation';
import { NewBusinessConceptPanel } from '~/components/workspace/NewBusinessConceptPanel';

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const workspace = await getWorkspaceById(params.id);

  if (!workspace) {
    const lastWorkspace = await getLastUsedWorkspace();
    if (lastWorkspace && lastWorkspace.id !== params.id) {
      redirect(`/workspace/${lastWorkspace.id}`);
    }
    redirect('/');
  }

  const showOnboarding = !workspace.onboardingCompleted;

  return (
    <>
      <Page />
      {showOnboarding && <WorkspaceOnboardingModal workspaceId={params.id} />}
      {workspace.businessMode === 'new' && <NewBusinessConceptPanel workspaceId={params.id} status={workspace.businessConceptStatus} concept={workspace.businessConcept} />}
    </>
  );
}
