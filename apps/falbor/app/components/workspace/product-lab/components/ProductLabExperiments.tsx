"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import {
  createProductLabDebate,
  createProductLabReevaluation,
} from "~/lib/actions/productLab";
import type { ProductLabCanvasAgent } from "./ProductLabCanvas";

interface DebateMessage {
  id?: string;
  debateId?: string;
  agentId: string;
  round: number;
  content: string;
}

interface Debate {
  id: string;
  topic: string;
  status: string;
}

interface Reevaluation {
  id: string;
  proposedChange: string;
  status: string;
  results: Array<{
    agentId: string;
    agentName: string;
    wouldChangeOpinion: boolean;
    revisedOpinion: string;
    reason: string;
  }>;
}

interface ProductLabExperimentsProps {
  workspaceId: string;
  simulationId: string;
  agents: ProductLabCanvasAgent[];
  debates: Debate[];
  debateMessages: DebateMessage[];
  reevaluations: Reevaluation[];
  onRefresh: () => void;
}

export function ProductLabExperiments({
  workspaceId,
  simulationId,
  agents,
  debates,
  debateMessages,
  reevaluations,
  onRefresh,
}: ProductLabExperimentsProps) {
  const [firstAgentId, setFirstAgentId] = useState(agents[0]?.id || "");
  const [secondAgentId, setSecondAgentId] = useState(agents[1]?.id || "");
  const [topic, setTopic] = useState("");
  const [proposedChange, setProposedChange] = useState("");
  const [pending, startTransition] = useTransition();
  const latestDebate = debates[0];
  const latestReevaluation = reevaluations[0];

  const submitDebate = () => {
    startTransition(async () => {
      try {
        await createProductLabDebate(
          workspaceId,
          simulationId,
          [firstAgentId, secondAgentId],
          topic,
        );
        setTopic("");
        onRefresh();
        toast.success("Debate completed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Debate failed");
      }
    });
  };

  const submitReevaluation = () => {
    startTransition(async () => {
      try {
        await createProductLabReevaluation(
          workspaceId,
          simulationId,
          proposedChange,
        );
        setProposedChange("");
        onRefresh();
        toast.success("Hypothetical reevaluation completed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Reevaluation failed",
        );
      }
    });
  };

  return (
    <section className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-[#212121]">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Explore agent opinions
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Debates and changes below are simulated scenarios. They do not alter
          the original evaluations.
        </p>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Debate two agents
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={firstAgentId}
            onChange={(event) => setFirstAgentId(event.target.value)}
            className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            value={secondAgentId}
            onChange={(event) => setSecondAgentId(event.target.value)}
            className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Debate whether this product is worth the price"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
          />
          <button
            type="button"
            onClick={submitDebate}
            disabled={pending || !topic.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {pending ? "Working..." : "Debate"}
          </button>
        </div>
        {latestDebate && (
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-[#18181b]">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
              {latestDebate.topic}
            </p>
            <div className="mt-2 space-y-2">
              {debateMessages
                .filter((message) => message.debateId === latestDebate.id)
                .map((message) => (
                  <p
                    key={message.id || `${message.agentId}-${message.round}`}
                    className="text-xs text-gray-600 dark:text-gray-400"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {agents.find((agent) => agent.id === message.agentId)
                        ?.name || "Agent"}
                      :
                    </span>{" "}
                    {message.content}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Fix & reevaluate
        </h3>
        <div className="flex gap-2">
          <input
            value={proposedChange}
            onChange={(event) => setProposedChange(event.target.value)}
            placeholder="What if I reduced the monthly price?"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700"
          />
          <button
            type="button"
            onClick={submitReevaluation}
            disabled={pending || !proposedChange.trim()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {pending ? "Working..." : "Reevaluate"}
          </button>
        </div>
        {latestReevaluation && (
          <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-[#18181b]">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">
              Hypothetical change: {latestReevaluation.proposedChange}
            </p>
            {latestReevaluation.results.map((result) => (
              <div
                key={result.agentId}
                className="text-xs text-gray-600 dark:text-gray-400"
              >
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {result.agentName} ·{" "}
                  {result.wouldChangeOpinion
                    ? "opinion may change"
                    : "opinion likely unchanged"}
                </p>
                <p>{result.revisedOpinion}</p>
                <p className="mt-1">{result.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
