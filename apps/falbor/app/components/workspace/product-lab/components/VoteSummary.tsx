"use client";

import type { ProductLabCanvasAgent } from "./ProductLabCanvas";

interface VoteSummaryProps {
  agents: ProductLabCanvasAgent[];
  onSelect: (agent: ProductLabCanvasAgent) => void;
}

export function VoteSummary({ agents, onSelect }: VoteSummaryProps) {
  const likes = agents.filter((agent) => agent.vote === "LIKE");
  const dislikes = agents.filter((agent) => agent.vote === "DISLIKE");
  const voteButton = (
    label: string,
    list: ProductLabCanvasAgent[],
    icon: string,
  ) => (
    <details className="group rounded-xl border border-gray-200 dark:border-gray-800">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        <span>
          <i className={`${icon} mr-2`} />
          {label}
        </span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {list.length}
        </span>
      </summary>
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-800">
        {list.length === 0 ? (
          <p className="py-2 text-xs text-gray-500">No completed votes yet.</p>
        ) : (
          list.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelect(agent)}
              className="flex w-full items-start justify-between gap-3 border-b border-gray-100 py-2 text-left last:border-0 dark:border-gray-800"
            >
              <span>
                <span className="block text-xs font-medium text-gray-800 dark:text-gray-200">
                  {agent.name}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {agent.persona.role || "Simulated evaluator"}
                </span>
              </span>
              <span className="max-w-[50%] text-right text-xs text-gray-500 dark:text-gray-400">
                {agent.voteReason || "No reason recorded"}
              </span>
            </button>
          ))
        )}
      </div>
    </details>
  );
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Simulated agent sentiment
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          These are AI persona votes, not votes from real customers.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {voteButton("Likes", likes, "i-ph:thumbs-up")}
        {voteButton("Dislikes", dislikes, "i-ph:thumbs-down")}
      </div>
    </section>
  );
}
