import React from 'react';
import { ProjectsView } from '~/components/stayup/ProjectsView';

export default function ProjectsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-falbor-elements-textPrimary">Projects</h1>
        <p className="text-falbor-elements-textSecondary mt-1">Manage your StayUp projects and API keys.</p>
      </div>
      
      <ProjectsView />
    </div>
  );
}
