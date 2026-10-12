'use client';

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';

interface AssignWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgent: any;
  onSubmit: (title: string, description: string) => Promise<void>;
}

const EMOJI_LIST = ['✨', '🤖', '🎯', '🚀', '💡', '🔥', '📈', '⚡', '📊', '🤝', '⚙️', '📝'];

export function AssignWorkModal({
  isOpen,
  onClose,
  selectedAgent,
  onSubmit,
}: AssignWorkModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(taskTitle.trim(), taskDescription.trim());
      setTaskTitle('');
      setTaskDescription('');
      setShowEmojiPicker(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog
        onClose={onClose}
        className="!w-[560px] !p-0 !bg-white dark:!bg-[#15161d] !border-gray-200 dark:!border-[#272836] !text-gray-900 dark:!text-gray-200 overflow-hidden shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-6 pt-5 pb-3 border-b border-gray-200 dark:border-[#242533] flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="i-ph:paper-plane-tilt text-blue-600 dark:text-blue-400" />
              Send Task to {selectedAgent?.name || 'Agent'}
            </DialogTitle>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Task title *</label>
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Generate 10 new email contacts"
                className="w-full bg-gray-50 dark:bg-[#1c1d27] border border-gray-300 dark:border-[#2d2e3f] rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Details & Instructions (optional)
              </label>
              <textarea
                rows={4}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Provide specific guidelines, output format, or background details..."
                className="w-full bg-gray-50 dark:bg-[#1c1d27] border border-gray-300 dark:border-[#2d2e3f] rounded-lg px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div className="relative flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-base"
                  title="Add emoji"
                >
                  😊
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 p-2 rounded-xl bg-white dark:bg-[#20212d] border border-gray-200 dark:border-[#2e3042] shadow-2xl flex flex-wrap gap-1 w-52 z-50">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setTaskTitle((prev) => prev + ' ' + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskTitle.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="i-ph:spinner-gap animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="i-ph:paper-plane-tilt" />
                      Assign Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </DialogRoot>
  );
}
