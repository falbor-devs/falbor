'use client';

import React, { useEffect, useState } from 'react';
import { getWorkspaceMembers, updateMemberRole, removeMember } from '~/lib/actions/workspaceMembers';
import { InviteMemberModal } from './InviteMemberModal';
import { Users, UserCheck, UserPlus, MoreVertical, Shield, Coins, Clock, Trash2, Mail, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import { Badge } from '~/components/ui';

interface MembersTabProps {
  workspaceId: string;
}

export default function MembersTab({ workspaceId }: MembersTabProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await getWorkspaceMembers(workspaceId);
      setMembers(data);
    } catch (e) {
      console.error('Failed to fetch workspace members:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setActionUserId(targetUserId);
    try {
      await updateMemberRole(workspaceId, targetUserId, newRole);
      await fetchMembers();
    } catch (e: any) {
      alert(e?.message || 'Failed to update role');
    } finally {
      setActionUserId(null);
    }
  };

  const handleRemoveUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    setActionUserId(targetUserId);
    try {
      await removeMember(workspaceId, targetUserId);
      await fetchMembers();
    } catch (e: any) {
      alert(e?.message || 'Failed to remove member');
    } finally {
      setActionUserId(null);
    }
  };

  const onlineCount = Math.max(1, members.length);

  const [initialInviteTab, setInitialInviteTab] = useState<'email' | 'link'>('email');

  const openInviteWithTab = (tab: 'email' | 'link') => {
    setInitialInviteTab(tab);
    setIsInviteModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Members</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage access permissions, team roles, and member credits.
          </p>
        </div>
        <Dropdown
          align="end"
          side="bottom"
          sideOffset={4}
          trigger={
            <button className="px-2 py-1 rounded-md bg-[#0099ff]/20 text-[#0099ff] text-xs transition-all flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
              <div className="i-ph:caret-down w-3.5 h-3.5 ml-1" />
            </button>
          }
        >
          <DropdownItem onSelect={() => openInviteWithTab('email')}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <Mail className="w-4 h-4" />
              <span>Invite by Email</span>
            </div>
          </DropdownItem>
          <DropdownItem onSelect={() => openInviteWithTab('link')}>
            <div className="flex items-center gap-2 text-xs font-medium">
              <LinkIcon className="w-4 h-4" />
              <span>Create Invite Link</span>
            </div>
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#18181C] rounded-md shadow-xs p-5 border border-gray-300 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-md">Total Members</span>
            <div className="text-3xl text-gray-900 dark:text-white">{members.length}</div>
          </div>
          <div className="w-12 h-12 rounded-md bg-[#0099ff]/20 text-[#0099ff] flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#18181C] rounded-md shadow-xs p-5 border border-gray-300 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-md">Online Now</span>
            <div className="text-3xl text-gray-900 dark:text-white">{onlineCount}</div>
          </div>
          <div className="w-12 h-12 rounded-md bg-[#0099ff]/20 text-[#0099ff] flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-[#18181C] rounded-md shadow-xs border border-gray-300 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-medium">Loading workspace members...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="py-3.5 px-4 min-w-[240px]">Member</th>
                  <th className="py-3.5 px-4 w-28">Role</th>
                  <th className="py-3.5 px-4 w-32">Credits</th>
                  <th className="py-3.5 px-4 w-28">Last Active</th>
                  <th className="py-3.5 px-4 w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {members.map((m) => {
                  const isOwner = m.role === 'owner';
                  const currentUserMember = members.find((x) => x.isCurrentUser);
                  const currentUserRole = currentUserMember ? currentUserMember.role : 'viewer';
                  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

                  return (
                    <tr key={m.userId} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {m.avatarUrl ? (
                            <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              {m.name}
                              {isOwner && (
                                <Badge>Owner</Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isOwner || !canManage ? (
                          <span className="font-extrabold text-gray-700 dark:text-gray-300 uppercase text-[11px]">
                            {m.role}
                          </span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                            disabled={actionUserId === m.userId}
                            className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-2.5 py-1 rounded-lg text-xs border border-gray-200 dark:border-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-extrabold text-amber-500">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{m.balance} Credits</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>Just now</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isOwner && canManage && (
                          <button
                            onClick={() => handleRemoveUser(m.userId)}
                            disabled={actionUserId === m.userId}
                            title="Remove Member"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <InviteMemberModal
        workspaceId={workspaceId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => fetchMembers()}
        initialTab={initialInviteTab}
      />
    </div>
  );
}
