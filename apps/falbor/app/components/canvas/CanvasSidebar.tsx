'use client';
import React from 'react';
import { Slider } from '~/components/ui/Slider';

interface CanvasSidebarProps {
  products: any[];
  activeProductId: string | null;
  setActiveProductId: (id: string) => void;
  isProcessing: boolean;
}

export function CanvasSidebar({
  products,
  activeProductId,
  setActiveProductId,
  isProcessing,
}: CanvasSidebarProps) {
  return (
    <aside className="w-[320px] flex-shrink-0 bg-falbor-elements-background-depth-1 border-r border-falbor-elements-borderColor overflow-y-auto flex flex-col p-6">
      <h1 className="text-3xl font-bold mt-[-20px] ml-[-10px]">
        <img src={"/logo-light-styled.png"} alt="logo" className="w-[180px] inline-block dark:hidden" />
        <img src={"/logo-dark-styled.png"} alt="logo" className="w-[180px] inline-block hidden dark:block" />
      </h1>

      <div className="mb-6 flex flex-col gap-2">
        <label className="block text-sm text-falbor-elements-textSecondary">Active Product</label>
        <select
          value={activeProductId || ''}
          onChange={(e) => setActiveProductId(e.target.value)}
          disabled={isProcessing || products.length === 0}
          className="w-full bg-falbor-elements-background dark:bg-black dark:border-gray-700 border border-falbor-elements-border rounded-md px-3 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-falbor-elements-ring focus:ring-offset-2 disabled:opacity-50"
        >
          <option value="" disabled>Select a product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <p className="text-xs text-falbor-elements-textTertiary mt-1">
          Select the product to view competitor analysis and feature brainstorms.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-2">
        <label className="block text-sm text-falbor-elements-textSecondary">AI Auto-Updates</label>
        <div className="flex items-center justify-between text-sm">
          <span className="text-falbor-elements-textPrimary">Status:</span>
          <span className={`font-bold ${isProcessing ? 'text-amber-500 animate-pulse' : 'text-green-500'}`}>
            {isProcessing ? 'Analyzing...' : 'Active'}
          </span>
        </div>
        <p className="text-xs text-falbor-elements-textTertiary mt-1">
          The AI periodically checks for market changes and suggests new ideas. If inactive for 14 days, this process pauses.
        </p>
      </div>
    </aside>
  );
}
