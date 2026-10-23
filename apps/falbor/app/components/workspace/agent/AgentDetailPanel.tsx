"use client";

import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "~/components/ui/Tooltip";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";
import { Textarea } from "~/components/visual-editor/ui/textarea";
import { Input } from "~/components/visual-editor/ui/input";

export interface AgentSettingsDraft {
  name: string;
  role: string;
  goal: string;
  instructions: string;
  memory: string;
  model: string;
  tools: string[];
  permissions: string[];
  knowledge: string;
  avatarUrl?: string | null;
}

interface AgentDetailPanelProps {
  selectedAgent: any;
  draft: AgentSettingsDraft | null;
  isOpen: boolean;
  isSaving: boolean;
  onDraftChange: (updates: Partial<AgentSettingsDraft>) => void;
  onQuickAction: (prompt: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const QUICK_ACTIONS = [
  {
    label: "Review workspace progress",
    prompt:
      "Review the current workspace progress and identify the highest-impact next actions.",
  },
  {
    label: "Find growth opportunities",
    prompt:
      "Analyze the workspace context and identify concrete, evidence-based growth opportunities.",
  },
];

const MODEL_OPTIONS = [
  {
    value: "falbor-local:smolvlm-500m",
    label: "Open Source Agent",
    icon: "i-ph:cpu",
  },
  {
    value: "gpt-4o-mini",
    label: "ChatGPT Luna 5.6",
    iconSrc: "/icons/OpenAI.svg",
  },
  {
    value: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    iconSrc: "/icons/claude-color.svg",
  },
  {
    value: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    iconSrc: "/icons/claude-color.svg",
  },
];

const PERMISSION_OPTIONS = [
  [
    "tasks.execute",
    "Execute tasks",
    "Run authorized agent tasks and tool operations.",
    "i-ph:play-circle",
  ],
  [
    "tasks.delegate",
    "Delegate tasks",
    "Create and assign work to another authorized agent.",
    "i-ph:users-three",
  ],
  [
    "tasks.replan",
    "Replan tasks",
    "Change the execution plan when results or failures require it.",
    "i-ph:shuffle",
  ],
  [
    "external.read",
    "Read external data",
    "Read information from connected external services.",
    "i-ph:eye",
  ],
  [
    "external.write",
    "Write external data",
    "Modify data in an authorized connected service.",
    "i-ph:pencil-simple",
  ],
  [
    "external.send",
    "Send external messages",
    "Send messages through an approved integration.",
    "i-ph:paper-plane-tilt",
  ],
  [
    "external.publish",
    "Publish content",
    "Publish content to an approved external destination.",
    "i-ph:megaphone",
  ],
  [
    "spend.money",
    "Spend money",
    "Perform an approved action that can create a financial charge.",
    "i-ph:currency-dollar",
  ],
];

const TOOL_OPTIONS = [
  [
    "Web Search Browser",
    "Browse public pages and collect permitted research data.",
    "i-ph:globe",
  ],
  [
    "MCP",
    "Use connected MCP services that the user has authorized.",
    "i-ph:plugs-connected",
  ],
];

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function AgentDetailPanel({
  selectedAgent,
  draft,
  isOpen,
  isSaving,
  onDraftChange,
  onQuickAction,
  onSave,
  onClose,
}: AgentDetailPanelProps) {
  const [width, setWidth] = useState(320);
  const resizing = useRef(false);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!resizing.current) return;
      const nextWidth = Math.min(
        520,
        Math.max(280, window.innerWidth - event.clientX),
      );
      setWidth(nextWidth);
    };
    const stop = () => {
      resizing.current = false;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  if (!selectedAgent || !draft || !isOpen) return null;

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 h-full bg-white dark:bg-[#212121] border-l border-gray-200 dark:border-[#26262b] flex flex-col overflow-hidden"
    >
      <button
        type="button"
        aria-label="Resize quick actions panel"
        onMouseDown={() => {
          resizing.current = true;
        }}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/60 transition-colors z-10"
      />
      <div className="h-[52px] min-h-[52px] max-h-[52px] flex items-center justify-between px-5 border-b border-gray-200 dark:border-[#26262b] shrink-0">
        <h4 className="text-lg text-gray-500 dark:text-[#8e8e93]">
          Quick actions
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-black/70 rounded-md border border-gray-200 dark:border-[#2d2d35] disabled:opacity-60 dark:text-white text-xs font-medium flex items-center gap-1.5"
          >
            {isSaving && <span className="i-ph:spinner animate-spin" />}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        {/* <div className="space-y-2">
          {QUICK_ACTIONS.map((action) => <button key={action.label} type="button" onClick={() => onQuickAction(action.prompt)} className="w-full p-3 rounded-xl bg-white dark:bg-[#202025] hover:bg-gray-100 dark:hover:bg-[#282830] border border-gray-200 dark:border-[#2d2d35] text-left transition-colors flex items-center gap-3 group shadow-sm"><span className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-[#2563eb]/20 text-[#3b82f6] flex items-center justify-center shrink-0 i-ph:sparkle" /><span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{action.label}</span></button>)}
        </div> */}
        <section className="space-y-2">
          {/* <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Agent configuration</h4> */}
          <div className="block text-xs text-gray-500 dark:text-white/90">
            Model
            <Dropdown
              align="start"
              className="w-full mt-1"
              trigger={
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-md border border-gray-200 dark:border-[#34343c] px-2.5 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <span className="flex items-center gap-2">
                    {(() => {
                      const option = MODEL_OPTIONS.find(
                        (item) => item.value === draft.model,
                      );
                      return option?.iconSrc ? (
                        <img
                          src={option.iconSrc}
                          alt=""
                          className="w-4 h-4 object-contain"
                        />
                      ) : (
                        <span className="i-ph:cpu inline-block w-4 h-4 text-black dark:text-white/10" />
                      );
                    })()}
                    <span>
                      {MODEL_OPTIONS.find(
                        (option) => option.value === draft.model,
                      )?.label || draft.model}
                    </span>
                  </span>
                  <span className="i-ph:caret-down text-gray-400" />
                </button>
              }
            >
              {MODEL_OPTIONS.map((model) => (
                <DropdownItem
                  key={model.value}
                  onSelect={() => onDraftChange({ model: model.value })}
                  active={draft.model === model.value}
                  className="px-2 py-2"
                >
                  {model.iconSrc ? (
                    <img
                      src={model.iconSrc}
                      alt=""
                      className="w-4 h-4 object-contain"
                    />
                  ) : (
                    <span className="i-ph:cpu inline-block w-4 h-4 text-black dark:text-white/10" />
                  )}
                  <span>{model.label}</span>
                </DropdownItem>
              ))}
            </Dropdown>
          </div>
          <label className="block text-xs text-gray-500 dark:text-white/90">
            Role
            <Input
              value={draft.role}
              onChange={(event) => onDraftChange({ role: event.target.value })}
            />
          </label>
          <label className="block text-xs text-gray-500 dark:text-white/90">
            Goal
            <Textarea
              value={draft.goal}
              onChange={(event) => onDraftChange({ goal: event.target.value })}
              rows={3}
            />
          </label>
          <label className="block text-xs text-gray-500 dark:text-white/90">
            Instructions
            <Textarea
              value={draft.instructions}
              onChange={(event) =>
                onDraftChange({ instructions: event.target.value })
              }
              rows={5}
            />
          </label>
          <label className="block text-xs text-gray-500 dark:text-white/90">
            Memory
            <Textarea
              value={draft.memory}
              onChange={(event) =>
                onDraftChange({ memory: event.target.value })
              }
              rows={3}
            />
          </label>
          <label className="block text-xs text-gray-500 dark:text-white/90">
            Knowledge sources
            <Textarea
              value={draft.knowledge}
              onChange={(event) =>
                onDraftChange({ knowledge: event.target.value })
              }
              placeholder="Separate entries with commas"
            />
          </label>
        </section>
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Tools
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-[#34343c] overflow-hidden">
            {TOOL_OPTIONS.map(([value, description, icon]) => {
              const enabled = draft.tools.includes(value);
              return (
                <Tooltip
                  key={value}
                  content={description}
                  side="left"
                  align="center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onDraftChange({ tools: toggleValue(draft.tools, value) })
                    }
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b last:border-b-0 border-gray-200 dark:border-[#34343c] hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <span
                      className={`${icon} text-base text-black dark:text-white/90`}
                    />
                    <span className="min-w-0 flex-1 text-xs text-gray-800 dark:text-white/90 truncate">
                      {value}
                    </span>
                    <span
                      className={`text-[10px] dark:text-white/90 uppercase tracking-wide`}
                    >
                      {enabled ? "On" : "Off"}
                    </span>
                    <span
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${enabled ? "bg-gray-900 dark:bg-white/20" : "bg-gray-300 dark:bg-[#45454d]"}`}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full bg-white transition-transform ${enabled ? "translate-x-3" : "translate-x-0"}`}
                      />
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </section>
        <section>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Permissions
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-[#34343c] overflow-hidden">
            {PERMISSION_OPTIONS.map(([value, label, description, icon]) => {
              const enabled = draft.permissions.includes(value);
              return (
                <Tooltip
                  key={value}
                  content={description}
                  side="left"
                  align="center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onDraftChange({
                        permissions: toggleValue(draft.permissions, value),
                      })
                    }
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b last:border-b-0 border-gray-200 dark:border-[#34343c] hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    <span
                      className={`${icon} text-base text-black dark:text-white/90`}
                    />
                    <span className="min-w-0 flex-1 text-xs text-gray-800 dark:text-white/90 truncate">
                      {label}
                    </span>
                    <span
                      className={`text-[10px] dark:text-white/90 uppercase tracking-wide`}
                    >
                      {enabled ? "On" : "Off"}
                    </span>
                    <span
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${enabled ? "bg-gray-900 dark:bg-white/20" : "bg-gray-300 dark:bg-[#45454d]"}`}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full bg-white transition-transform ${enabled ? "translate-x-3" : "translate-x-0"}`}
                      />
                    </span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
