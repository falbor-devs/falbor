import { WorkspaceAgentView } from '~/components/workspace/agent/WorkspaceAgentView';
import { ClientSidebar } from '~/components/sidebar/ClientSidebar';

export default function WorkspaceAgentDetailPage({ params }: { params: { id: string; agentId: string } }) {
  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-white dark:bg-[#212121]">
      <ClientSidebar />
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <WorkspaceAgentView workspaceId={params.id} initialAgentId={params.agentId} />
      </div>
    </div>
  );
}
