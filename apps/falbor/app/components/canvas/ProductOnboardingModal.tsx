'use client';
import React, { useState } from 'react';

interface ProductOnboardingModalProps {
  onSuccess: () => void;
}

export function ProductOnboardingModal({ onSuccess }: ProductOnboardingModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/canvas/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        console.error('Failed to onboard product');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-2xl p-8 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-falbor-elements-textPrimary mb-2">
          Connect Your Product
        </h2>
        <p className="text-sm text-falbor-elements-textSecondary mb-6">
          Tell us about your product so the AI can analyze competitors and brainstorm features.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-falbor-elements-textPrimary mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-falbor-elements-background dark:bg-black dark:border-gray-700 border border-falbor-elements-border rounded-lg px-4 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-falbor-elements-ring focus:ring-offset-2"
              placeholder="e.g. Falbor Analytics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-falbor-elements-textPrimary mb-1">
              Product Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-falbor-elements-background dark:bg-black dark:border-gray-700 border border-falbor-elements-border rounded-lg px-4 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-falbor-elements-ring focus:ring-offset-2"
              placeholder="Briefly describe what your product does..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="i-ph:spinner animate-spin w-5 h-5" />
                Connecting...
              </>
            ) : (
              'Connect Product & Analyze'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
