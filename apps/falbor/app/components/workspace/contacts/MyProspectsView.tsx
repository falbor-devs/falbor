import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';
import { getMyProspects, updateMyProspectStatus, deleteMyProspect, MyProspect, ProspectStatus } from '~/lib/actions/myProspects';
import { AddProspectModal } from './AddProspectModal';
import { ImportModal } from './ImportModal';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';

const statusLabels: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  qualified: 'Qualified',
  customer: 'Customer',
};

interface MyProspectsViewProps {
  workspaceId: string;
}

export function MyProspectsView({ workspaceId }: MyProspectsViewProps) {
  const [prospects, setProspects] = useState<MyProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadProspects = async () => {
    try {
      setLoading(true);
      const data = await getMyProspects(workspaceId);
      setProspects(data);
    } catch (err) {
      console.error('Failed to fetch prospects', err);
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadProspects();
    }
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('import') === 'true') {
        setIsImportOpen(true);
      }
    }
  }, [workspaceId]);

  const handleStatusChange = async (id: string, newStatus: ProspectStatus) => {
    try {
      await updateMyProspectStatus(id, newStatus);
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return;
    try {
      await deleteMyProspect(id);
      setProspects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Prospect deleted');
    } catch (err) {
      toast.error('Failed to delete prospect');
    }
  };

  const handleSendToAI = async (prospect: MyProspect) => {
    setSendingId(prospect.id);
    try {
      const { sendMyProspectToAiProspects } = await import('~/lib/actions/myProspects');
      await sendMyProspectToAiProspects(workspaceId, prospect);
      setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
      toast.success(`Moved ${prospect.name} to AI Prospects table`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send prospect to AI');
    } finally {
      setSendingId(null);
    }
  };

  const counts = {
    all: prospects.length,
    new: prospects.filter((p) => p.status === 'new').length,
    contacted: prospects.filter((p) => p.status === 'contacted').length,
    replied: prospects.filter((p) => p.status === 'replied').length,
    customer: prospects.filter((p) => p.status === 'customer').length,
  };

  const filteredProspects = prospects.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white dark:bg-[#080808] overflow-hidden p-6">
      <div className="flex items-center justify-between py-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-falbor-elements-textPrimary flex items-center gap-2">
            <span className="i-ph:users-three w-5 h-5" />
            My Prospects
          </h2>
          <p className="text-sm text-falbor-elements-textSecondary mt-0.5">
            Manage your personal prospects, track outreach status, and send candidates directly to AI for research.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-falbor-elements-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            <span className="i-ph:download-simple w-4 h-4" />
            Import from Apps
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-[#0099ff]/20 text-[#0099ff] rounded-md flex items-center gap-2 px-3.5 py-2 text-sm transition-colors whitespace-nowrap"
          >
            + Add Prospect
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 my-4 shrink-0">
        {[
          { key: 'all', label: 'All Prospects', count: counts.all },
          { key: 'new', label: 'New', count: counts.new },
          { key: 'contacted', label: 'Contacted', count: counts.contacted },
          { key: 'replied', label: 'Replied', count: counts.replied },
          { key: 'customer', label: 'Customers', count: counts.customer },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setFilterStatus(card.key)}
            className={classNames(
              'flex flex-col bg-white dark:bg-falbor-elements-background-depth-2 border rounded-md p-4 text-left transition-all',
              filterStatus === card.key
                ? 'border-[#0099ff] ring-1 ring-[#0099ff] shadow-sm'
                : 'border-gray-300 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
            )}
          >
            <span className="text-xs text-falbor-elements-textSecondary">
              {card.label}
            </span>
            <span className={classNames('text-2xl dark:text-white font-bold mt-1')}>
              {card.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto border border-gray-300 dark:border-gray-800 rounded-md bg-white dark:bg-falbor-elements-background-depth-1 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="i-ph:spinner-gap animate-spin w-8 h-8 text-[#0099ff]" />
            <p className="text-sm text-falbor-elements-textSecondary">Loading prospects...</p>
          </div>
        ) : filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-12 h-12 rounded-full bg-[#0099ff]/20 text-[#0099ff] flex items-center justify-center mb-3">
              <span className="i-ph:users-three w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-falbor-elements-textPrimary">No prospects found</h3>
            <p className="text-sm text-falbor-elements-textSecondary max-w-md mt-1 mb-4">
              Add your first prospect manually or connect Google Apps (Contacts, Gmail, Calendar) to import candidates.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-falbor-elements-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                Import from Apps
              </button>
              <button
                onClick={() => setIsAddOpen(true)}
                className="bg-[#0099ff]/20 text-[#0099ff] rounded-md flex items-center gap-2 px-3.5 py-2 text-sm transition-colors whitespace-nowrap"
              >
                + Add Prospect
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 border-b border-gray-300 dark:border-gray-800 text-xs text-falbor-elements-textSecondary">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Company & Title</th>
                <th className="px-6 py-3.5">Contact Info</th>
                <th className="px-6 py-3.5">Source</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date Added</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              {filteredProspects.map((prospect) => (
                <tr key={prospect.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-falbor-elements-textPrimary whitespace-nowrap">
                    {prospect.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-falbor-elements-textPrimary font-medium">{prospect.company || '—'}</span>
                      <span className="text-xs text-falbor-elements-textSecondary">{prospect.jobTitle || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-falbor-elements-textPrimary">{prospect.email || '—'}</span>
                      <span className="text-xs text-falbor-elements-textSecondary">{prospect.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {prospect.source || 'Manual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Dropdown
                      align="start"
                      trigger={
                        <button
                          className={classNames(
                            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md outline-none cursor-pointer transition-colors',
                            prospect.status === 'new' ? 'bg-[#0099ff]/20 text-[#0099ff]' :
                              prospect.status === 'contacted' ? 'text-yellow-600 dark:bg-yellow-950/30 hover:bg-yellow-100' :
                                prospect.status === 'replied' ? 'text-purple-600 dark:bg-purple-950/30 hover:bg-purple-100' :
                                  prospect.status === 'qualified' ? 'text-indigo-600 dark:bg-indigo-950/30 hover:bg-indigo-100' :
                                    'text-green-600 dark:bg-green-950/30 hover:bg-green-100'
                          )}
                        >
                          <span>{statusLabels[prospect.status] || prospect.status}</span>
                          <span className="i-ph:caret-down text-xs opacity-70" />
                        </button>
                      }
                    >
                      {(['new', 'contacted', 'replied', 'qualified', 'customer'] as ProspectStatus[]).map((st) => (
                        <DropdownItem
                          key={st}
                          active={prospect.status === st}
                          onSelect={() => handleStatusChange(prospect.id, st)}
                          className="cursor-pointer font-medium text-xs justify-between"
                        >
                          <span>{statusLabels[st]}</span>
                          {prospect.status === st && <span className="i-ph:check text-xs" />}
                        </DropdownItem>
                      ))}
                    </Dropdown>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-falbor-elements-textSecondary">
                    {new Date(prospect.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSendToAI(prospect)}
                        disabled={sendingId === prospect.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-purple-200 dark:border-purple-800 transition-colors"
                        title="Send prospect to AI for research and outreach"
                      >
                        <span className="i-ph:sparkle w-3.5 h-3.5" />
                        {sendingId === prospect.id ? 'Sending...' : 'Send to AI'}
                      </button>
                      <button
                        onClick={() => handleDelete(prospect.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                        title="Delete prospect"
                      >
                        <span className="i-ph:trash w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAddOpen && (
        <AddProspectModal
          workspaceId={workspaceId}
          onClose={() => setIsAddOpen(false)}
          onAdded={() => {
            setIsAddOpen(false);
            loadProspects();
          }}
        />
      )}

      {isImportOpen && (
        <ImportModal
          workspaceId={workspaceId}
          onClose={() => setIsImportOpen(false)}
          onImported={() => {
            setIsImportOpen(false);
            loadProspects();
          }}
        />
      )}
    </div>
  );
}
