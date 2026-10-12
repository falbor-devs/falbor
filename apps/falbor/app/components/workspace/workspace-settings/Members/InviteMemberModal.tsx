'use client';

import React, { useState } from 'react';
import { DialogRoot, Dialog, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { inviteMemberByEmail, createInviteLink } from '~/lib/actions/workspaceMembers';
import { Mail, Link, ChevronDown, Check, Copy, AlertCircle, Loader2 } from 'lucide-react';

interface InviteMemberModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'email' | 'link';
}

export function InviteMemberModal({ workspaceId, isOpen, onClose, onSuccess, initialTab = 'email' }: InviteMemberModalProps) {
  const [tab, setTab] = useState<'email' | 'link'>(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setInviteUrl('');
      setError('');
    }
  }, [isOpen, initialTab]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('editor');
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [allowedDomain, setAllowedDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSendEmail = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await inviteMemberByEmail({ workspaceId, email, role });
      setInviteUrl(res.inviteUrl);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await createInviteLink({
        workspaceId,
        role,
        maxUses,
        expiresInDays,
        nickname,
        allowedDomain,
      });
      setInviteUrl(res.inviteUrl);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate invite link.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog onClose={onClose} showCloseButton={true} className="p-6">
        <div className="flex flex-col gap-4">
          <div>
            <DialogTitle>Invite Members to Workspace</DialogTitle>
            <DialogDescription>
              Collaborate with team members, view data, and assign specific permissions.
            </DialogDescription>
          </div>

          {/* Sub tabs */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => { setTab('email'); setInviteUrl(''); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                tab === 'email'
                  ? 'bg-white dark:bg-[#18181C] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Invite by Email
            </button>
            <button
              onClick={() => { setTab('link'); setInviteUrl(''); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                tab === 'link'
                  ? 'bg-white dark:bg-[#18181C] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              Create Invite Link
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Member Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-white dark:bg-[#0D0D10] text-gray-900 dark:text-white px-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer (Can navigate & view content only - Cannot trigger AI agent)</option>
              <option value="editor">Editor (Can edit workspace & chat with AI agent - No user deletion)</option>
              <option value="admin">Admin (Full administrative control & manage members)</option>
            </select>
          </div>

          {tab === 'email' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-[#0D0D10] text-gray-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleSendEmail}
                disabled={loading || !email}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Email Invitation
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Max Uses */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">User Limit</label>
                <select
                  value={maxUses === null ? 'unlimited' : maxUses}
                  onChange={(e) => setMaxUses(e.target.value === 'unlimited' ? null : Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#0D0D10] text-gray-900 dark:text-white px-3 py-2 rounded-xl text-xs border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 Person</option>
                  <option value="5">5 People</option>
                  <option value="10">10 People</option>
                  <option value="25">25 People</option>
                  <option value="50">50 People</option>
                  <option value="100">100 People</option>
                  <option value="unlimited">Unlimited Access</option>
                </select>
              </div>

              {/* Advanced options toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-left self-start"
              >
                {showAdvanced ? 'Hide Advanced Options' : 'Advanced Options'}
              </button>

              {showAdvanced && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#111114] border border-gray-200 dark:border-gray-800 space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Expiration</label>
                    <select
                      value={expiresInDays === null ? 'never' : expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value === 'never' ? null : Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#18181C] text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-800"
                    >
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                      <option value="never">Never Expire</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Nickname (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Marketing Team Link"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181C] text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Restrict Domain (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. @falbor.xyz"
                      value={allowedDomain}
                      onChange={(e) => setAllowedDomain(e.target.value)}
                      className="w-full bg-white dark:bg-[#18181C] text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-800"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                Generate Invite Link
              </button>
            </div>
          )}

          {/* Generated URL Box */}
          {inviteUrl && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">{inviteUrl}</span>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shrink-0 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </DialogRoot>
  );
}
