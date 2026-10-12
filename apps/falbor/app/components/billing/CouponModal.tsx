'use client';

import React, { useState } from 'react';
import { DialogRoot, Dialog } from '~/components/ui/Dialog';
import { toast } from 'react-toastify';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName?: string;
  workspaceId?: string;
  onSuccess?: () => void;
}

export function CouponModal({ isOpen, onClose, workspaceName = "user's Workspace", workspaceId, onSuccess }: CouponModalProps) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a coupon code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          workspaceId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Coupon applied successfully!');
        setCode('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to apply coupon.');
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      toast.error('Error applying coupon. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog
        showCloseButton={true}
        onClose={onClose}
        className="!w-[90vw] !max-w-[480px] p-0 overflow-hidden bg-white dark:bg-zinc-950"
      >
        <div className="flex flex-col w-full">
          {/* Top banner matching image design */}
          <div className="bg-[#f7f5f8] dark:bg-zinc-800 p-8 flex flex-col items-center justify-center relative min-h-[190px]">
            <div className="bg-white px-4 py-1 text-2xl md:text-3xl font-bold text-black tracking-tight mb-2" style={{ boxShadow: '0px 0px 5px #b3b1b1ff' }}>
              Implement a coupon
            </div>

            <div className="flex items-center">
              <div className="bg-[#0099ff]/20 text-[#0099ff] p-2.5 flex items-center justify-center shrink-0">
                <div className="i-ph:gift-bold w-6 h-6" />
              </div>
              <div className="px-4 py-2 text-2xl md:text-3xl font-bold text-black tracking-tight">
                code
              </div>
            </div>
          </div>

          {/* Bottom input area matching image design */}
          <div className="p-6 bg-white dark:bg-zinc-950 space-y-5 text-left">
            <p className="text-sm font-normal text-zinc-900 dark:text-zinc-100 leading-relaxed">
              Apply a coupon code for {workspaceName}. One activation per workspace.
            </p>

            <form onSubmit={handleApply} className="flex items-center gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter coupon code"
                className="flex-1 h-10 px-3 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder:text-zinc-400"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 text-sm font-medium rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white transition-colors"
              >
                {isSubmitting ? 'Applying...' : 'Apply'}
              </button>
            </form>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
