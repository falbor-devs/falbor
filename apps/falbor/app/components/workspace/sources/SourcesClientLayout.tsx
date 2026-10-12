'use client';
import { Header } from '~/components/header/Header';
import { WorkspaceSourcesView } from './WorkspaceSourcesView';

interface SourcesClientLayoutProps {
  workspaceId: string;
}

export function SourcesClientLayout({ workspaceId }: SourcesClientLayoutProps) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <Header />
      <div className="flex-1 h-full w-full overflow-hidden">
        <WorkspaceSourcesView workspaceId={workspaceId} />
      </div>
    </div>
  );
}
