import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { usePathname } from 'next/navigation';

interface AgentGrowthDashboardProps {
  workspaceId?: string;
}

export function AgentGrowthDashboard({ workspaceId: propWorkspaceId }: AgentGrowthDashboardProps = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);

  const sidebarEvents = useStore(aiSidebarStore.events);
  const pathname = usePathname();
  const routeWorkspaceId = pathname?.split('/')[2];
  const workspaceId = propWorkspaceId || routeWorkspaceId || aiSidebarStore.currentWorkspaceId.get();

  useEffect(() => {
    const fetchProspects = async () => {
      if (!workspaceId) return;
      try {
        const res = await fetch(`/api/agent/growth?workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.prospects) {
            setActivities((prev) => {
              const combined = [...data.prospects, ...prev];
              return combined.reduce((acc: any[], current: any) => {
                const exists = acc.some(item =>
                  (item.id && current.id && item.id === current.id) ||
                  (item.email && current.email && item.email === current.email) ||
                  (item.prospect && current.prospect && item.prospect === current.prospect)
                );
                if (!exists) acc.push(current);
                return acc;
              }, []);
            });
          }
        }
      } catch (err) {
        console.error("Failed to load historical prospects", err);
      }
    };
    fetchProspects();
  }, [workspaceId]);

  useEffect(() => {
    const recentEvents = [...sidebarEvents].reverse();
    for (const event of recentEvents) {
      const content = event.html || (event.details && event.details[0]) || '';
      if (content) {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].prospect) {
              setActivities((prev) => {
                const combined = [...parsed, ...prev];
                return combined.reduce((acc: any[], current: any) => {
                  const exists = acc.some(item =>
                    (item.id && current.id && item.id === current.id) ||
                    (item.email && current.email && item.email === current.email) ||
                    (item.prospect && current.prospect && item.prospect === current.prospect)
                  );
                  if (!exists) acc.push(current);
                  return acc;
                }, []);
              });
              setIsLoading(false);
              break;
            }
          } catch (e) {
            console.error("Failed to parse agent JSON output", e);
          }
        }
      }
    }
  }, [sidebarEvents]);
  const isAgentActive = useStore(aiSidebarStore.isActive);
  useEffect(() => {
    if (isLoading && !isAgentActive && sidebarEvents.length > 0) {
      const lastEvent = sidebarEvents[sidebarEvents.length - 1];
      if (lastEvent.status === 'completed' || lastEvent.status === 'error') {
        setIsLoading(false);
      }
    }
    setIsActive(isAgentActive);
  }, [isAgentActive, isLoading, sidebarEvents]);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white dark:bg-[#080808] overflow-hidden">
      <div className="flex items-center justify-between py-3">
        <div>
          <h2 className="text-xl text-falbor-elements-textPrimary flex items-center gap-2">
            Growth Agent
          </h2>
          <span className="text-sm text-falbor-elements-textSecondary">
            This page only works when you hit "Start", but when it's started, the AI can send messages directly using your own email.
            The email is the Gmail MCP tab in Settings that you have connected.
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 my-4 shrink-0">
        <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-300 dark:border-gray-800 rounded-md p-4 text-left transition-all">
          <span className="text-xs text-falbor-elements-textSecondary">Prospects Found</span>
          <span className="text-2xl dark:text-white font-bold mt-1 text-falbor-elements-textPrimary">{activities.length}</span>
        </div>
        <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-300 dark:border-gray-800 rounded-md p-4 text-left transition-all">
          <span className="text-xs text-falbor-elements-textSecondary">Emails Sent</span>
          <span className="text-2xl dark:text-white font-bold mt-1 text-falbor-elements-textPrimary">0</span>
        </div>
        <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-300 dark:border-gray-800 rounded-md p-4 text-left transition-all">
          <span className="text-xs text-falbor-elements-textSecondary">Replies</span>
          <span className="text-2xl dark:text-white font-bold mt-1 text-falbor-elements-textPrimary">0</span>
        </div>
        <div className="flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border border-gray-300 dark:border-gray-800 rounded-md p-4 text-left transition-all">
          <span className="text-xs text-falbor-elements-textSecondary">Conversations Active</span>
          <span className="text-2xl dark:text-white font-bold mt-1 text-falbor-elements-textPrimary">0</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto border border-gray-300 dark:border-gray-800 rounded-md bg-white dark:bg-falbor-elements-background-depth-1 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 border-b border-gray-300 dark:border-gray-800 text-xs text-falbor-elements-textSecondary">
            <tr>
              <th className="px-6 py-3.5">Prospect</th>
              <th className="px-6 py-3.5">Company</th>
              <th className="px-6 py-3.5">Match Reason</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Message Preview</th>
              <th className="px-6 py-3.5">Sent At</th>
              <th className="px-6 py-3.5">Last Activity</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-falbor-elements-background-depth-2 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-falbor-elements-textPrimary">{activity.prospect}</span>
                    <span className="text-xs text-falbor-elements-textSecondary">{activity.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-falbor-elements-textPrimary font-medium">
                  {activity.company}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-falbor-elements-textSecondary line-clamp-2 max-w-xs" title={activity.matchReason}>
                    {activity.matchReason}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={classNames(
                    "px-2.5 py-1 text-xs font-medium rounded-md",
                    activity.status === 'Ready to Contact' ? 'bg-[#0099ff]/20 text-[#0099ff]' :
                      activity.status === 'No Email Found' ? 'text-red-500 bg-red-500/10' :
                        'text-[#0099ff] bg-[#0099ff]/20'
                  )}>
                    {activity.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-falbor-elements-textSecondary italic truncate max-w-[150px]" title={activity.messagePreview}>
                    {activity.messagePreview}
                  </p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-falbor-elements-textSecondary">
                  {activity.sentAt}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-falbor-elements-textSecondary">
                  {activity.lastActivity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!workspaceId) return;
                      try {
                        const { createMyProspect } = await import('~/lib/actions/myProspects');
                        await createMyProspect(workspaceId, {
                          name: activity.prospect,
                          email: activity.email || undefined,
                          company: activity.company || undefined,
                          source: 'AI Prospect',
                          linkedAiProspectId: activity.id,
                        });
                        toast.success(`Added ${activity.prospect} to My Prospects`);
                      } catch (err: any) {
                        if (err.message === 'DUPLICATE') {
                          toast.info(`${activity.prospect} is already in My Prospects`);
                        } else {
                          toast.error('Failed to add to My Prospects');
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/30 transition-colors"
                  >
                    <span className="i-ph:user-plus w-3.5 h-3.5" />
                    Add to My Prospects
                  </button>
                </td>
              </tr>
            ))}
            {activities.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-falbor-elements-textSecondary">
                  No prospects found yet. Describe your product and start the agent to begin searching live on Apollo.io.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-falbor-elements-textSecondary">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-[#0099ff]" />
                    <p>AI is researching ICP and scanning Apollo API for real prospects...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <span className={classNames(
        "flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md w-fit mt-2",
        isActive
          ? "bg-green-200 text-green-500"
          : "bg-red-200 text-red-500"
      )}>
        {isActive ? "Agent Active" : "Agent Paused"}
      </span>
    </div>
  );
}
