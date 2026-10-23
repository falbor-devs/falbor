"use client";

import type { ProductLabCanvasAgent } from "./ProductLabCanvas";
import type { ProductLabInteractionData } from "../types";

interface AgentDetailsPanelProps {
  agent: ProductLabCanvasAgent | null;
  onClose: () => void;
  onChat: (agentId: string) => void;
  interactions: ProductLabInteractionData[];
}

export function AgentDetailsPanel({
  agent,
  onClose,
  onChat,
  interactions,
}: AgentDetailsPanelProps) {
  if (!agent) return null;
  const evaluation = agent.initialEvaluation || {};
  const finalEvaluation = agent.finalEvaluation || {};
  const agentInteractions = interactions.filter(
    (interaction) =>
      interaction.fromAgentId === agent.id ||
      interaction.toAgentId === agent.id,
  );
  const ratingValues = [
    "productClarity",
    "valueProposition",
    "featureUsefulness",
    "userExperience",
    "pricingPerception",
    "audienceFit",
  ];
  const rating = ratingValues.reduce((sum, key) => {
    const value = evaluation[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
  const ratingCount = ratingValues.filter(
    (key) => typeof evaluation[key] === "number",
  ).length;
  const review =
    typeof evaluation.interviewReview === "string"
      ? evaluation.interviewReview
      : "No interview review was recorded.";
  const finalOpinion =
    typeof finalEvaluation.opinion === "string"
      ? finalEvaluation.opinion
      : typeof finalEvaluation.summary === "string"
        ? finalEvaluation.summary
        : "No final opinion was recorded.";
  const voice =
    typeof agent.persona.voice === "string" ? agent.persona.voice : null;
  const opinion =
    typeof evaluation.opinion === "string"
      ? evaluation.opinion
      : "No direct opinion was recorded.";
  const purchaseIntent =
    evaluation.purchaseIntent && typeof evaluation.purchaseIntent === "object"
      ? (evaluation.purchaseIntent as {
          wouldConsiderPaying?: boolean;
          reason?: string;
          blockers?: string[];
          reasonablePrice?: string;
        })
      : null;
  const evidence = Array.isArray(evaluation.evidence)
    ? evaluation.evidence.filter(
        (
          item,
        ): item is {
          observation: string;
          category: string;
          sourceUrl?: string | null;
        } => Boolean(item) && typeof item === "object" && "observation" in item,
      )
    : [];
  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#212121]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#0099ff]">
            Simulated AI persona
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            {agent.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {agent.persona.role || "Product evaluator"} · {agent.status}
          </p>
          {voice && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Voice: {voice}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
        >
          <i className="i-ph:x" />
        </button>
      </div>
      <div className="mt-5 space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Direct opinion
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">{opinion}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Background
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {agent.persona.background || "Not provided"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Goals
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {agent.persona.goals?.join(" · ") || "Not provided"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Vote
          </p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {agent.vote || "Pending"}
            {agent.voteReason ? ` — ${agent.voteReason}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Initial evaluation
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {ratingCount
              ? `${rating.toFixed(1)} / 5 average rating`
              : "Evaluation not completed."}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Interview review
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">{review}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Final opinion
          </p>
          <p className="mt-1 text-gray-700 dark:text-gray-300">
            {finalOpinion}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Would pay?
          </p>
          {purchaseIntent ? (
            <div className="mt-1 text-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-white">
                {purchaseIntent.wouldConsiderPaying
                  ? "Would consider paying"
                  : "Would not pay yet"}
              </p>
              <p>{purchaseIntent.reason || "No reason recorded."}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Price view:{" "}
                {purchaseIntent.reasonablePrice || "Not enough information"}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              No purchase-intent evaluation was recorded.
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Evidence explorer
          </p>
          {evidence.length ? (
            <div className="mt-2 space-y-2">
              {evidence.map((item, index) => (
                <div
                  key={`${item.observation}-${index}`}
                  className="rounded-lg bg-gray-50 p-3 dark:bg-[#18181b]"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {item.category}
                  </p>
                  <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
                    {item.observation}
                  </p>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-[#0099ff]"
                    >
                      {item.sourceUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No supporting evidence was recorded.
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Relevant interactions
          </p>
          {agentInteractions.length ? (
            <div className="mt-2 space-y-2">
              {agentInteractions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="rounded-lg bg-gray-50 p-3 dark:bg-[#18181b]"
                >
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {interaction.topic}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {interaction.output || `Interaction ${interaction.status}.`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No recorded interactions for this agent.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChat(agent.id)}
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Chat with agent
        </button>
      </div>
    </aside>
  );
}
