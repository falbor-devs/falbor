'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import { LiveMessagesDrawer } from './LiveMessagesDrawer';
import type { Message } from 'ai';
import type { ProviderInfo } from '~/types/model';

interface CanvasContainerProps {
  children: React.ReactNode;
  chatBox: React.ReactNode;
  alerts?: React.ReactNode;
  messages?: Message[];
  isStreaming?: boolean;
  append?: (message: Message) => void;
  chatMode?: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research';
  setChatMode?: (mode: 'discuss' | 'build' | 'troubleshoot' | 'idea' | 'mvp_research') => void;
  model?: string;
  provider?: ProviderInfo;
  addToolResult?: ({ toolCallId, result }: { toolCallId: string; result: any }) => void;
  className?: string;
}

export function CanvasContainer({
  children,
  chatBox,
  alerts,
  messages = [],
  isStreaming,
  append,
  chatMode,
  setChatMode,
  model,
  provider,
  addToolResult,
  className,
}: CanvasContainerProps) {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    // If holding Ctrl/Cmd, always zoom the canvas (and prevent native browser zoom), even over cards
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.35), 2.5));
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-interactive="true"], [data-scrollable="true"], button, input, textarea, a, select')) {
      return;
    }
    
    e.preventDefault();
    setPan((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, select, [data-interactive="true"]')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.35));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePanToResearch = () => {
    setScale(1);
    const targetY = messages.length > 0 ? -((messages.length - 1) * 300) - 100 : -100;
    setPan({ x: -1400, y: targetY });
  };

  useEffect(() => {
    const handlePanEvent = () => handlePanToResearch();
    window.addEventListener('pan-to-research', handlePanEvent as EventListener);
    return () => window.removeEventListener('pan-to-research', handlePanEvent as EventListener);
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className={classNames(
        'relative w-full h-full overflow-hidden select-none bg-[#f7fafc] dark:bg-[#09090b] touch-none',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundImage: 'radial-gradient(circle, rgba(120, 120, 120, 0.15) 1px, transparent 1px)',
        backgroundSize: `${24 * scale}px ${24 * scale}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <div
        className="absolute top-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm"
        data-interactive="true"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Figma Canvas Flow
        </div>
        <button
          onClick={handleZoomOut}
          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          title="Zoom Out"
        >
          <span className="i-ph:minus-bold text-sm block" />
        </button>
        <span className="text-xs font-mono w-12 text-center text-zinc-500 dark:text-zinc-400">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          title="Zoom In"
        >
          <span className="i-ph:plus-bold text-sm block" />
        </button>
        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <button
          onClick={handleResetZoom}
          className="px-2 py-0.5 text-xs rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
          title="Reset Zoom & Pan"
        >
          Reset
        </button>
      </div>

      <div
        className="w-full h-full transition-transform duration-75 ease-out origin-center"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${scale})`,
        }}
      >
        <div className="w-full h-full min-h-full flex flex-col items-center justify-start p-8 pt-16 pb-44 overflow-y-auto">
          {children}
        </div>
      </div>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-chat px-4 flex flex-col items-center gap-2"
        data-interactive="true"
      >
        <div className="flex items-center gap-2 mb-1 w-full justify-center">
          <button
            onClick={handlePanToResearch}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors shadow-md text-emerald-600 dark:text-emerald-400"
          >
            <span className="i-ph:magnifying-glass-duotone text-base" />
            <span>View Market Research</span>
          </button>
        </div>
        <LiveMessagesDrawer
          messages={messages}
          isStreaming={isStreaming}
          append={append}
          chatMode={chatMode}
          setChatMode={setChatMode}
          model={model}
          provider={provider}
          addToolResult={addToolResult}
        />
        {alerts && <div className="w-full">{alerts}</div>}
        <div className="w-full">{chatBox}</div>
      </div>
    </div>
  );
}
