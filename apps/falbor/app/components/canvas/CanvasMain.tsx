'use client';
import React from 'react';

interface CanvasMainProps {
  competitors: any[];
  ideas: any[];
  productName: string;
}

export function CanvasMain({ competitors, ideas, productName }: CanvasMainProps) {
  if (!productName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-falbor-elements-textSecondary">
        <span className="i-ph:lightbulb-bold w-12 h-12 mb-4 opacity-50" />
        <p>Select a product to view the Canvas.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col overflow-y-auto items-start p-8 gap-8 w-full">
      <div className="w-full">
        <h2 className="text-2xl font-bold text-falbor-elements-textPrimary mb-4">
          Competitors for {productName}
        </h2>
        {competitors.length === 0 ? (
          <p className="text-sm text-falbor-elements-textSecondary">No competitors analyzed yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {competitors.map((c) => (
              <div key={c.id} className="bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg text-falbor-elements-textPrimary">{c.name}</h3>
                {c.websiteUrl && (
                  <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mb-2 block">
                    {c.websiteUrl}
                  </a>
                )}
                <div className="mt-3 text-sm">
                  <p><strong className="text-green-500/80">Strengths:</strong> {c.strengths}</p>
                  <p className="mt-2"><strong className="text-red-500/80">Weaknesses:</strong> {c.weaknesses}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full mt-4">
        <h2 className="text-2xl font-bold text-falbor-elements-textPrimary mb-4">
          AI Feature Brainstorm
        </h2>
        {ideas.length === 0 ? (
          <p className="text-sm text-falbor-elements-textSecondary">No ideas generated yet.</p>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {ideas.map((idea) => (
              <div key={idea.id} className="bg-falbor-elements-background-depth-1 border border-falbor-elements-border rounded-xl p-5 shadow-sm">
                <h3 className="font-semibold text-lg text-falbor-elements-textPrimary flex items-center gap-2">
                  <span className="i-ph:sparkle text-yellow-500" />
                  {idea.title}
                  <span className="ml-auto text-xs bg-falbor-elements-background px-2 py-1 rounded-full border border-falbor-elements-border text-falbor-elements-textTertiary">
                    {idea.status}
                  </span>
                </h3>
                <p className="mt-2 text-sm text-falbor-elements-textSecondary">{idea.description}</p>
                <div className="mt-4 p-3 bg-falbor-elements-background rounded-lg border border-falbor-elements-border text-sm text-falbor-elements-textSecondary">
                  <strong>AI Reasoning:</strong> {idea.reasoning}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
