'use client';

import React, { useState } from 'react';
import { Dialog, DialogRoot, DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { Input, Button } from '~/components/ui';

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSurvey: (question: string, options: string[]) => void;
}

export function SurveyModal({ isOpen, onClose, onSendSurvey }: SurveyModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const handleOptionChange = (index: number, val: string) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length === 0) return;

    onSendSurvey(question.trim(), validOptions);
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  const isValid = question.trim().length > 0 && options.some((o) => o.trim().length > 0);

  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog className="max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl">
        <DialogTitle className="text-lg font-bold mb-1 flex items-center gap-2">
          <span className="i-ph:clipboard-text-duotone text-purple-500" />
          Send Survey
        </DialogTitle>
        <DialogDescription className="text-xs text-zinc-400 mb-4">
          Enter your survey question and customize the selectable options.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Question *</label>
            <Input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which marketing service do you need?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium">Answer Options *</label>
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 font-medium"
              >
                <span className="i-ph:plus-bold text-xs" /> Add Option
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="i-ph:trash-duotone text-base" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="bg-purple-500/20 text-purple-600 dark:text-purple-300 disabled:opacity-50"
            >
              Send Survey
            </Button>
          </div>
        </form>
      </Dialog>
    </DialogRoot>
  );
}
