'use client';

import React, { useState } from 'react';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { Button, Input } from '../ui';
import { Textarea } from '../visual-editor/ui/textarea';

interface BusinessSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    businessName: string;
    description: string;
    phone: string;
    displayEmail: boolean;
    displayPhone: boolean;
  }) => void;
  initialEmail?: string;
  initialDisplayName?: string;
  initialBio?: string;
  initialDisplayEmail?: boolean;
}

export function BusinessSetupModal({
  isOpen,
  onClose,
  onSave,
  initialEmail = '',
  initialDisplayName = '',
  initialBio = '',
  initialDisplayEmail = true,
}: BusinessSetupModalProps) {
  const [businessName, setBusinessName] = useState(initialDisplayName);
  const [description, setDescription] = useState(initialBio);
  const [phone, setPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState(initialDisplayEmail);
  const [displayPhone, setDisplayPhone] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialDisplayName) setBusinessName(initialDisplayName);
      if (initialBio) setDescription(initialBio);
      if (initialDisplayEmail !== undefined) setDisplayEmail(initialDisplayEmail);
    }
  }, [isOpen, initialDisplayName, initialBio, initialDisplayEmail]);

  const handleCompleteWithAi = () => {
    setIsAiLoading(true);
    setTimeout(() => {
      setBusinessName('TechPulse Innovations');
      setDescription('Leading B2B SaaS platform focusing on automated digital growth & modern developer workflows.');
      setIsAiLoading(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      businessName: businessName.trim() || 'My Business',
      description: description.trim(),
      phone: phone.trim(),
      displayEmail,
      displayPhone,
    });
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog className="max-w-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="i-ph:buildings-duotone text-blue-500" />
            Complete Business Profile
          </DialogTitle>
          <button
            onClick={handleCompleteWithAi}
            disabled={isAiLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className={isAiLoading ? 'i-ph:spinner-gap animate-spin' : 'i-ph:sparkle'} />
            {isAiLoading ? 'Filling...' : 'Complete with AI'}
          </button>
        </div>

        <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
          Please fill in your business details to send messages to marketers. Sharing your contact info helps build trust.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Business Name *
            </label>
            <Input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Brief Description
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your company do?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Phone Number <span className="text-amber-500 font-normal">(Recommended)</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Note: Sharing a contact phone number increases response rate from marketers.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">Display Email ({initialEmail || 'On File'})</span>
                <p className="text-[11px] text-zinc-400">Allow marketers to view your email address</p>
              </div>
              <Input
                type="checkbox"
                checked={displayEmail}
                onChange={(e) => setDisplayEmail(e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium">Display Phone Number</span>
                <p className="text-[11px] text-zinc-400">Allow marketers to view your phone number</p>
              </div>
              <Input
                type="checkbox"
                checked={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className='bg-[#0099ff]/20 text-[#0099ff]'>
              Save Profile
            </Button>
          </div>
        </form>
      </Dialog>
    </DialogRoot>
  );
}
