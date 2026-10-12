'use client';

import React, { useEffect, useState, useMemo } from 'react';
import classNames from 'classnames';
import { Markdown } from '~/components/chat/messages/Markdown';
import { ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '@nanostores/react';
import { canvasStore } from '~/lib/stores/canvasStore';

function CanvasInner({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/canvas/data?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error('Failed to fetch canvas data');
      const json = await res.json();
      
      const newNodes: any[] = [];
      const newEdges: any[] = [];

      // Central Brain Node
      const centerId = 'node-brain-center';
      newNodes.push({
        id: centerId,
        type: 'default',
        position: { x: 500, y: 300 },
        data: {
          label: (
            <div className="p-4 w-72 text-center select-none">
              <div className="w-12 h-12 rounded-full bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center text-2xl mb-2 shadow-inner ring-4 ring-purple-500/10">
                <i className="i-ph:brain-duotone animate-pulse" />
              </div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base">Product Brain</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Autonomous Neural Intelligence Map</p>
            </div>
          )
        },
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0
        }
      });

      let angleStep = 0;
      const radius = 380;
      const totalItems = (json.intelligence ? 1 : 0) + (json.competitors?.length || 0) + (json.ideas?.length || 0) + (json.canvasCards?.length || 0);
      const stepAngle = (2 * Math.PI) / Math.max(1, totalItems);

      // 1. Intelligence Node
      if (json.intelligence) {
        const nodeId = 'node-intelligence';
        const x = 500 + Math.cos(angleStep) * radius;
        const y = 300 + Math.sin(angleStep) * (radius * 0.75);
        angleStep += stepAngle;

        newNodes.push({
          id: nodeId,
          type: 'default',
          position: { x, y },
          data: {
            label: (
              <div className="p-4 w-80 text-left bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                  <i className="i-ph:compass-duotone text-purple-500 text-lg" />
                  <span>AI Visibility Snapshot</span>
                </div>
                <div className="text-xs text-gray-500 mb-3">Based on workspace analysis</div>
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Target: <span className="font-medium text-gray-900 dark:text-white">{json.intelligence.targetAudience || 'Market segment'}</span></div>
                  <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Position: <span className="font-medium text-gray-900 dark:text-white">{json.intelligence.positioning || 'Calculated'}</span></div>
                </div>
              </div>
            )
          },
          style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }
        });

        newEdges.push({
          id: `edge-${nodeId}`,
          source: centerId,
          target: nodeId,
          animated: true,
          style: { stroke: '#8B5CF6', strokeWidth: 2, strokeDasharray: '5 5' }
        });
      }

      // 2. Competitors
      if (json.competitors && json.competitors.length > 0) {
        json.competitors.forEach((c: any) => {
          const nodeId = `node-comp-${c.id}`;
          const x = 500 + Math.cos(angleStep) * radius;
          const y = 300 + Math.sin(angleStep) * (radius * 0.75);
          angleStep += stepAngle;

          newNodes.push({
            id: nodeId,
            type: 'default',
            position: { x, y },
            data: {
              label: (
                <div className="p-4 w-72 text-left bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                    <i className="i-ph:users-three-duotone text-blue-500 text-lg" />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mb-0.5">Strengths</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">{c.strengths}</div>
                  <div className="text-xs text-rose-600 font-semibold mb-0.5">Weaknesses</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{c.weaknesses}</div>
                </div>
              )
            },
            style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }
          });

          newEdges.push({
            id: `edge-${nodeId}`,
            source: centerId,
            target: nodeId,
            animated: true,
            style: { stroke: '#3B82F6', strokeWidth: 2 }
          });
        });
      }

      // 3. Ideas
      if (json.ideas && json.ideas.length > 0) {
        json.ideas.forEach((idea: any) => {
          const nodeId = `node-idea-${idea.id}`;
          const x = 500 + Math.cos(angleStep) * radius;
          const y = 300 + Math.sin(angleStep) * (radius * 0.75);
          angleStep += stepAngle;

          newNodes.push({
            id: nodeId,
            type: 'default',
            position: { x, y },
            data: {
              label: (
                <div className="p-4 w-80 text-left bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                    <i className="i-ph:sparkle-duotone text-amber-500 text-lg" />
                    <span className="truncate">{idea.title}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">{idea.description}</div>
                  <div className="bg-purple-50/50 dark:bg-purple-950/30 p-2.5 rounded-xl text-xs text-purple-900 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                    <span className="font-semibold block mb-0.5">AI Strategic Insight</span>
                    {idea.reasoning}
                  </div>
                </div>
              )
            },
            style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }
          });

          newEdges.push({
            id: `edge-${nodeId}`,
            source: centerId,
            target: nodeId,
            animated: true,
            style: { stroke: '#F59E0B', strokeWidth: 2 }
          });
        });
      }

      // 4. Custom Cards
      if (json.canvasCards && json.canvasCards.length > 0) {
        json.canvasCards.forEach((card: any) => {
          const nodeId = `node-card-${card.id}`;
          const x = 500 + Math.cos(angleStep) * radius;
          const y = 300 + Math.sin(angleStep) * (radius * 0.75);
          angleStep += stepAngle;

          newNodes.push({
            id: nodeId,
            type: 'default',
            position: { x, y },
            data: {
              label: (
                <div className="p-4 w-80 text-left bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xl overflow-hidden">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm mb-2 border-b border-gray-100 dark:border-zinc-800 pb-2">
                    <i className="i-ph:cards-duotone text-emerald-500 text-lg" />
                    <span className="truncate">{card.title}</span>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto custom-scrollbar prose prose-xs break-words">
                    <Markdown>{card.content}</Markdown>
                  </div>
                </div>
              )
            },
            style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }
          });

          newEdges.push({
            id: `edge-${nodeId}`,
            source: centerId,
            target: nodeId,
            animated: true,
            style: { stroke: '#10B981', strokeWidth: 2 }
          });
        });
      }

      setNodes(newNodes);
      setEdges(newEdges);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const liveCanvas = useStore(canvasStore);
  const { setCenter, fitView } = useReactFlow();

  useEffect(() => {
    if (liveCanvas.focusTrigger) {
      setCenter(liveCanvas.focusTrigger.x, liveCanvas.focusTrigger.y, { duration: 800, zoom: 1 });
    }
  }, [liveCanvas.focusTrigger, setCenter]);

  useEffect(() => {
    if (liveCanvas.nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    }
  }, [liveCanvas.nodes.length, fitView]);

  const allNodes = useMemo(() => {
    const liveNodes = liveCanvas.nodes.map(n => ({
      id: n.id,
      type: 'default',
      position: { x: n.x, y: n.y },
      data: {
        label: n.type === 'generating' ? (
          <div className="p-4 w-72 text-center bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-purple-500/50 shadow-xl">
            <span className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-pulse block rounded mb-2" />
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 animate-pulse">Neural Brain Synthesizing...</span>
          </div>
        ) : (
          <div className="p-4 w-80 text-left bg-white/90 dark:bg-[#18181C]/90 backdrop-blur-md rounded-2xl border border-purple-500/40 shadow-xl">
            {n.label && (
              <h4 className="font-bold flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 border-b border-purple-100 dark:border-purple-900/40 pb-2 text-sm">
                <i className="i-ph:sparkle-duotone" />
                <span className="truncate">{n.label}</span>
              </h4>
            )}
            <div className="text-xs text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto custom-scrollbar prose prose-xs break-words">
              <Markdown>{n.content || ''}</Markdown>
            </div>
          </div>
        )
      },
      style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, zIndex: 1000 }
    }));
    return [...nodes, ...liveNodes];
  }, [nodes, liveCanvas.nodes]);

  if (loading && nodes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[#FAFAFA] dark:bg-[#111114]">
        <span className="i-ph:brain-duotone w-12 h-12 text-purple-600 animate-pulse mb-3" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assembling Product Brain Network...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#FAFAFA] dark:bg-[#111114]">
      <div className="w-full h-full">
        <ReactFlow
          nodes={allNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-dot-pattern"
        >
          <Background color="#9CA3AF" gap={24} size={1} />
          <Controls className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-sm !rounded-xl" />
          <Panel position="top-left" className="bg-white/80 dark:bg-black/50 backdrop-blur px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-xs font-semibold">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              <span>Product Brain Network</span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

export function WorkspaceCanvasView({ workspaceId }: { workspaceId: string }) {
  return (
    <ReactFlowProvider>
      <CanvasInner workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}
