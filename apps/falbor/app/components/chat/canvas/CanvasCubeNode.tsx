'use client';

import React, { useState, useRef } from 'react';
import { classNames } from '~/utils/classNames';

interface CanvasCubeNodeProps {
  children: React.ReactNode;
  isUser?: boolean;
  index: number;
  totalNodes: number;
  title?: string;
  initialX?: number;
  initialY?: number;
  successProbability?: number;
  isResearchCube?: boolean;
  researchIndex?: number;
  isGenerating?: boolean;
  className?: string;
}

function calculateDefaultPosition(index: number, isResearchCube: boolean = false, researchIndex: number = 0) {
  if (isResearchCube) {
    // Relative items inside Flex/Grid wrapper, they start at 0 offset
    return { x: 0, y: 0 };
  }
  // Standard conversation flow (centered)
  return {
    x: 0,
    y: index * 300
  };
}

export function CanvasCubeNode({
  children,
  isUser,
  index,
  totalNodes,
  title,
  initialX,
  initialY,
  successProbability,
  isResearchCube,
  researchIndex = 0,
  isGenerating,
  className,
}: CanvasCubeNodeProps) {
  const defaultPos = calculateDefaultPosition(index, isResearchCube, researchIndex);
  const [position, setPosition] = useState<{ x: number; y: number }>({ 
    x: initialX ?? defaultPos.x, 
    y: initialY ?? defaultPos.y 
  });
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const user = Boolean(isUser);

  const handleMouseDownNode = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, select, code')) {
      return;
    }
    e.stopPropagation();
    setIsDraggingNode(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMoveNode = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingNode) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUpNode = () => {
    setIsDraggingNode(false);
  };

  // Prevent internal scroll areas from capturing zoom
  const handleWheelNode = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) return; // Let CanvasContainer handle zoom
    
    const target = e.target as HTMLElement;
    if (target.closest('.overflow-y-auto, .overflow-x-auto, [data-scrollable="true"]')) {
      e.stopPropagation();
    }
  };

  return (
    <div
      className={classNames(
        "flex flex-col items-center shrink-0 mb-10 group transition-shadow",
        className || "w-[500px]",
        isResearchCube ? "relative" : "absolute left-1/2 -ml-[250px]"
      )}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0px)`,
        cursor: isDraggingNode ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDownNode}
      onMouseMove={handleMouseMoveNode}
      onMouseUp={handleMouseUpNode}
      onMouseLeave={handleMouseUpNode}
      onWheel={handleWheelNode}
      data-interactive="true"
    >
      {index > 0 && !isResearchCube && (
        <div className="flex flex-col items-center -mt-8 mb-3 z-10 pointer-events-none select-none">
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" className="text-indigo-500/80 dark:text-indigo-400/80">
            <path d="M12 0V28" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" />
            <path d="M6 22L12 29L18 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      <div
        className={classNames(
          'w-full rounded-2xl border transition-all duration-500 shadow-lg hover:shadow-2xl backdrop-blur-md overflow-hidden relative',
          user
            ? 'bg-zinc-50/95 dark:bg-zinc-900/85 border-indigo-300/80 dark:border-indigo-800/60 hover:border-indigo-500'
            : 'bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60',
          isGenerating && 'ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse border-emerald-400'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 select-none">
          <div className="flex items-center gap-2.5">
            <span
              className={classNames('w-2.5 h-2.5 rounded-full ring-4', user ? 'bg-indigo-500 ring-indigo-500/20' : 'bg-emerald-500 ring-emerald-500/20')}
            />
            <span className="text-xs font-semibold font-mono text-zinc-800 dark:text-zinc-200">
              {title || (user ? 'User Input Node' : 'AI Research Flow Cube')} #{index + 1}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <span className="i-ph:arrows-out-cardinal text-xs" />
              Draggable Node
            </span>
          </div>
        </div>

        <div className="p-4 md:p-6 flex flex-col items-center">
          {successProbability !== undefined && (
            <div className="flex flex-col items-center justify-center relative w-32 h-32 mb-6" title={`AI Estimated Success Probability: ${successProbability}%`}>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-200 dark:text-zinc-700"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={successProbability >= 70 ? 'text-emerald-500' : successProbability >= 40 ? 'text-amber-500' : 'text-red-500'}
                  strokeDasharray={`${successProbability}, 100`}
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={classNames(
                  "text-3xl font-black font-mono",
                  successProbability >= 70 ? 'text-emerald-500' : successProbability >= 40 ? 'text-amber-500' : 'text-red-500'
                )}>{successProbability}%</span>
              </div>
            </div>
          )}
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
