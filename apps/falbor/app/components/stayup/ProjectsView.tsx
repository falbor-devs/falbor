'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import stayup from 'falbor-stayup-sdk';
import { Badge } from '~/components/ui/Badge';
import { Input } from '~/components/ui/Input';

export function ProjectsView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/stayup/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/stayup/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewProjectName('');
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="i-ph:spinner animate-spin w-8 h-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <Card>
        <CardHeader className="border-b border-falbor-elements-borderColor">
          <CardTitle className="text-lg">Create New Project</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreateProject} className="flex gap-4">
            <Input
              placeholder="e.g. Production Frontend"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="max-w-md flex-1"
            />
            <Button
              type="submit"
              disabled={creating || !newProjectName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 border-none"
            >
              {creating ? <div className="i-ph:spinner animate-spin w-4 h-4" /> : <div className="i-ph:plus w-4 h-4" />}
              Create Project
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-falbor-elements-textPrimary">Your Projects</h2>
          <Button 
            variant="outline" 
            onClick={() => {
              try {
                throw new Error("Test Error: This is a manual test of the StayUp error reporting integration!");
              } catch (err: any) {
                stayup.captureError(err);
                toast.success('Test error dispatched to StayUp!');
              }
            }}
            className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <div className="i-ph:bug w-4 h-4 mr-2" />
            Test Error Reporting
          </Button>
        </div>
        {projects.length === 0 ? (
          <Card className="p-12 text-center flex flex-col items-center">
            <div className="i-ph:folder-dashed w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="text-falbor-elements-textSecondary mt-1">Create a project above to get started.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:border-indigo-500/30 transition-colors">
                <CardHeader className="border-b border-falbor-elements-borderColor flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center">
                      <div className="i-ph:folder-fill text-indigo-500 w-4 h-4" />
                    </div>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                  </div>
                  <Badge variant={p.isActive ? "success" : "default"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-1">
                      Project ID
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-falbor-elements-background-depth-2 px-2 py-1 rounded text-falbor-elements-textPrimary flex-1 font-mono overflow-x-auto">
                        {p.id}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(p.id, 'Project ID')} title="Copy ID">
                        <div className="i-ph:copy w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-falbor-elements-textSecondary uppercase tracking-wider mb-1">
                      API Key
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-falbor-elements-background-depth-2 px-2 py-1 rounded text-falbor-elements-textPrimary flex-1 font-mono overflow-x-auto truncate">
                        {p.apiKey}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(p.apiKey, 'API Key')} title="Copy Key">
                        <div className="i-ph:copy w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
