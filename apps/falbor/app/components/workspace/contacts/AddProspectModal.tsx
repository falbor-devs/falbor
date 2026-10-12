import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createMyProspect } from '~/lib/actions/myProspects';
import { Dialog, DialogRoot, DialogTitle, DialogButton } from '~/components/ui/Dialog';

interface AddProspectModalProps {
  workspaceId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddProspectModal({ workspaceId, onClose, onAdded }: AddProspectModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      await createMyProspect(workspaceId, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        notes: notes.trim() || undefined,
        source: 'Manual',
      });
      toast.success('Prospect added');
      onAdded();
    } catch (err: any) {
      if (err.message === 'DUPLICATE') {
        toast.error('A prospect with this email already exists');
      } else {
        toast.error('Failed to add prospect');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogRoot open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog className="w-[480px] max-w-[90vw] p-6" showCloseButton={true} onClose={onClose}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogTitle>
            <span className="i-ph:user-plus w-5 h-5 text-purple-500" />
            Add New Prospect
          </DialogTitle>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Head of Growth"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@acme.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 0199"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Met at SaaS Summit..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <DialogButton type="secondary" onClick={onClose}>
              Cancel
            </DialogButton>
            <DialogButton type="primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Prospect'}
            </DialogButton>
          </div>
        </form>
      </Dialog>
    </DialogRoot>
  );
}
