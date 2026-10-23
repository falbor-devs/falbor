"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "~/components/ui/Dropdown";

export interface ProductLabCanvasAgent {
  id: string;
  name: string;
  persona: {
    role?: string;
    background?: string;
    goals?: string[];
    voice?: string;
  };
  status: string;
  vote: string | null;
  voteReason: string | null;
  initialEvaluation: Record<string, unknown> | null;
  finalEvaluation?: Record<string, unknown> | null;
  canvasPosition?: { x: number; y: number } | null;
  createdAt: Date | string;
}

export interface ProductLabCanvasRelationship {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  relationshipType: string;
  weight: number;
}

interface ProductLabCanvasProps {
  agents: ProductLabCanvasAgent[];
  relationships: ProductLabCanvasRelationship[];
  onSelect: (agent: ProductLabCanvasAgent) => void;
  onPositionChange?: (
    agentId: string,
    position: { x: number; y: number },
  ) => void;
  className?: string;
}

function isCanvasPosition(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { x?: unknown; y?: unknown };
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y)
  );
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;
const NODE_GAP = 8;

function position(index: number, total: number) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(total, 1) * 1.55)));
  const rows = Math.max(1, Math.ceil(Math.max(total, 1) / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const xStep = (CANVAS_WIDTH - 180) / Math.max(columns, 1);
  const yStep = (CANVAS_HEIGHT - 150) / Math.max(rows, 1);
  return { x: 90 + column * xStep + NODE_GAP * column, y: 75 + row * yStep + NODE_GAP * row };
}

export function ProductLabCanvas({
  agents,
  relationships,
  onSelect,
  onPositionChange,
  className,
}: ProductLabCanvasProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeDrag = useRef<{
    id: string;
    x: number;
    y: number;
    moved: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const visibleAgents = useMemo(
    () =>
      agents.filter((agent) =>
        `${agent.name} ${agent.persona.role || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [agents, query],
  );
  useEffect(() => {
    setNodePositions((current) => {
      const next = { ...current };
      agents.forEach((agent, index) => {
        next[agent.id] = next[agent.id]
          ? next[agent.id]
          : isCanvasPosition(agent.canvasPosition)
            ? agent.canvasPosition
            : position(index, agents.length);
      });
      return next;
    });
  }, [agents]);
  const points = visibleAgents.map((agent, index) => ({
    agent,
    ...(nodePositions[agent.id] || position(index, visibleAgents.length)),
  }));

  const keepNodeVisible = (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    const screenX =
      width / 2 + ((point.x - CANVAS_WIDTH / 2) / CANVAS_WIDTH) * width * scale + offset.x;
    const screenY =
      height / 2 + ((point.y - CANVAS_HEIGHT / 2) / CANVAS_HEIGHT) * height * scale + offset.y;
    const margin = 72;
    const correctionX =
      screenX < margin
        ? margin - screenX
        : screenX > width - margin
          ? width - margin - screenX
          : 0;
    const correctionY =
      screenY < margin
        ? margin - screenY
        : screenY > height - margin
          ? height - margin - screenY
          : 0;
    if (correctionX || correctionY)
      setOffset((current) => ({
        x: current.x + correctionX,
        y: current.y + correctionY,
      }));
  };

  const focusAgent = (agent: ProductLabCanvasAgent) => {
    const canvas = canvasRef.current;
    const point = nodePositions[agent.id];
    if (!canvas || !point) return;
    const { width, height } = canvas.getBoundingClientRect();
    setOffset({
      x: -((point.x - CANVAS_WIDTH / 2) / CANVAS_WIDTH) * width * scale,
      y: -((point.y - CANVAS_HEIGHT / 2) / CANVAS_HEIGHT) * height * scale,
    });
    setFocusedAgentId(agent.id);
  };

  return (
    <section
      className={`flex h-full min-h-[420px] flex-col overflow-hidden bg-white dark:bg-[#212121] ${className || ""}`}
    >
      <div className="flex h-13 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-1 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Agent network
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nodes represent persisted Product Lab agents. Connections appear
            only after recorded interactions.
          </p>
        </div>
        <Dropdown
          trigger={
            <button
              type="button"
              aria-label="Agent network controls"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <i className="i-ph:dots-three-vertical" />
            </button>
          }
          className="w-64"
        >
          <div className="p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Search agents"
              className="w-full rounded-lg border border-gray-200 bg-transparent px-2.5 py-2 text-xs outline-none focus:border-[#0099ff] dark:border-gray-700"
            />
          </div>
          {visibleAgents.length ? (
            <div className="max-h-40 overflow-y-auto px-1">
              {visibleAgents.map((agent) => (
                <DropdownItem key={agent.id} onSelect={() => focusAgent(agent)}>
                  <i className="i-ph:crosshair text-sm" />
                  <span className="truncate">Focus {agent.name}</span>
                </DropdownItem>
              ))}
            </div>
          ) : (
            <p className="px-2 py-1 text-xs text-gray-500">
              No matching agents
            </p>
          )}
          <DropdownSeparator />
          <DropdownItem
            onSelect={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <i className="i-ph:arrows-in text-sm" />
            Reset view
          </DropdownItem>
          <DropdownItem
            onSelect={() => {
              const next = Object.fromEntries(
                agents.map((agent, index) => [
                  agent.id,
                  position(index, agents.length),
                ]),
              );
              setNodePositions(next);
              agents.forEach((agent, index) =>
                onPositionChange?.(agent.id, position(index, agents.length)),
              );
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <i className="i-ph:frame-corners text-sm" />
            Fit to screen
          </DropdownItem>
          <DropdownItem
            onSelect={() => setScale((value) => Math.min(2.5, value + 0.15))}
          >
            <i className="i-ph:plus text-sm" />
            Zoom in
          </DropdownItem>
          <DropdownItem
            onSelect={() => setScale((value) => Math.max(0.45, value - 0.15))}
          >
            <i className="i-ph:minus text-sm" />
            Zoom out
          </DropdownItem>
          <DropdownItem onSelect={() => setQuery("")}>
            <i className="i-ph:funnel text-sm" />
            Clear agent filters
          </DropdownItem>
        </Dropdown>
      </div>
      <div
        ref={canvasRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[#fafafa] active:cursor-grabbing dark:bg-[#18181b]"
        onWheel={(event) => {
          event.preventDefault();
          setScale((value) =>
            Math.max(0.45, Math.min(2.5, value - event.deltaY * 0.001)),
          );
        }}
        onMouseDown={(event) => {
          setDragging(true);
          dragStart.current = {
            x: event.clientX - offset.x,
            y: event.clientY - offset.y,
          };
        }}
        onMouseMove={(event) => {
          if (nodeDrag.current) {
            const drag = nodeDrag.current;
            const deltaX = (event.clientX - drag.x) / scale;
            const deltaY = (event.clientY - drag.y) / scale;
            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) drag.moved = true;
            drag.position = {
              x: drag.position.x + deltaX,
              y: drag.position.y + deltaY,
            };
            setNodePositions((current) => ({
              ...current,
              [drag.id]: drag.position,
            }));
            keepNodeVisible(drag.position);
            drag.x = event.clientX;
            drag.y = event.clientY;
            return;
          }
          if (dragging)
            setOffset({
              x: event.clientX - dragStart.current.x,
              y: event.clientY - dragStart.current.y,
            });
        }}
        onMouseUp={() => {
          if (nodeDrag.current) {
            const drag = nodeDrag.current;
            nodeDrag.current = null;
            if (!drag.moved) {
              const agent = agents.find((item) => item.id === drag.id);
              if (agent) onSelect(agent);
            } else onPositionChange?.(drag.id, drag.position);
          }
          setDragging(false);
        }}
        onMouseLeave={() => {
          if (nodeDrag.current?.moved)
            onPositionChange?.(nodeDrag.current.id, nodeDrag.current.position);
          nodeDrag.current = null;
          setDragging(false);
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(156, 163, 175, 0.45) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(82, 82, 91, 0.6) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="relative z-10 h-full w-full"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {relationships.map((relationship) => {
            const source = points.find(
              ({ agent }) => agent.id === relationship.sourceAgentId,
            );
            const target = points.find(
              ({ agent }) => agent.id === relationship.targetAgentId,
            );
            if (!source || !target) return null;
            return (
              <line
                key={relationship.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="currentColor"
                strokeWidth={Math.max(1, relationship.weight)}
                opacity="0.35"
                className="text-gray-400 dark:text-gray-600"
              />
            );
          })}
          {points.map(({ agent, x, y }) => (
            <g
              key={agent.id}
              role="button"
              tabIndex={0}
              onMouseDown={(event) => {
                event.stopPropagation();
                nodeDrag.current = {
                  id: agent.id,
                  x: event.clientX,
                  y: event.clientY,
                  moved: false,
                  position:
                    nodePositions[agent.id] ||
                    position(
                      visibleAgents.findIndex((item) => item.id === agent.id),
                      visibleAgents.length,
                    ),
                };
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(agent);
              }}
              className="cursor-pointer"
            >
              {agent.vote === "LIKE" ? (
                <foreignObject x={x - 28} y={y - 28} width="56" height="56">
                  <video src="/icons/pets/green_AgentPet.mp4" autoPlay loop muted playsInline aria-label={`${agent.name} positive evaluation`} className="h-14 w-14 rounded-full object-cover" />
                </foreignObject>
              ) : agent.vote === "DISLIKE" ? (
                <foreignObject x={x - 28} y={y - 28} width="56" height="56">
                  <video
                    src="/icons/pets/red_AgentPet.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-label={`${agent.name} negative evaluation`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                </foreignObject>
              ) : (
                <foreignObject x={x - 28} y={y - 28} width="56" height="56">
                  <video
                    src="/icons/pets/blue_AgentPet.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-label={`${agent.name} neutral evaluation`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                </foreignObject>
              )}
              {focusedAgentId === agent.id && (
                <circle
                  cx={x}
                  cy={y}
                  r="36"
                  fill="none"
                  stroke="#0099ff"
                  strokeWidth="3"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r="30"
                fill="none"
                stroke="currentColor"
                className="text-gray-300 dark:text-gray-700"
              />
              <text
                x={x}
                y={y + 43}
                textAnchor="middle"
                className="fill-gray-700 text-[12px] dark:fill-gray-300"
              >
                {agent.name.slice(0, 18)}
              </text>
            </g>
          ))}
        </svg>
        {agents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0099ff]/10 text-2xl text-[#0099ff]">
                <i className="i-ph:users-three" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Your agent network will appear here
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Start a simulation to create real agents.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
