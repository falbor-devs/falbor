'use client';

import React, { useState } from 'react';
import classNames from 'classnames';
import { Dialog, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import type { EngineItem } from './types';

interface AiAeoInspectionModalProps {
  engine: EngineItem | null;
  onClose: () => void;
}

export function AiAeoInspectionModal({ engine, onClose }: AiAeoInspectionModalProps) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  if (!engine) return null;
  const activeQuestion = engine.questions[activeQuestionIndex] || null;

  return (
    <DialogRoot open={!!engine} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog
        onClose={onClose}
        onBackdrop={onClose}
        className="!w-[1000px] !h-[680px] !max-w-[95vw] !max-h-[90vh] p-0 flex flex-col overflow-hidden"
      >
        <div className="p-4 px-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#111114]">
          <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className={classNames(engine.icon, 'text-purple-600')} />
            {engine.displayName} – Does AI know you?
          </DialogTitle>
        </div>

        <div className="flex-1 flex overflow-hidden bg-[#F9F8F6] dark:bg-[#18181B]">
          {engine.questions.length > 1 && (
            <div className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#111114] flex flex-col overflow-y-auto">
              <div className="p-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-zinc-800">
                Questions ({engine.questions.length})
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-800/60">
                {engine.questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={classNames(
                      'w-full p-3 text-left text-xs transition-colors flex flex-col gap-1',
                      activeQuestionIndex === idx
                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 font-semibold border-l-4 border-purple-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    )}
                  >
                    <span className="line-clamp-2">{q.questionText}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
            {activeQuestion ? (
              <>
                <div className="self-start max-w-[85%] bg-[#EFECE6] dark:bg-zinc-800 text-gray-900 dark:text-white p-4 rounded-2xl rounded-tl-sm text-xs leading-relaxed font-medium shadow-sm">
                  {activeQuestion.questionText}
                </div>

                <div className="w-full bg-white dark:bg-[#111114] border border-gray-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm text-xs leading-relaxed text-gray-800 dark:text-gray-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-purple-600 dark:text-purple-400 mb-1">
                    <i className={engine.icon} />
                    <span>{engine.displayName} Answer:</span>
                  </div>

                  <div className="whitespace-pre-wrap">{activeQuestion.answerText}</div>

                  {activeQuestion.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                      {activeQuestion.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url || `https://${src.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-[11px] font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-gray-200 dark:border-zinc-700"
                        >
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`}
                            alt=""
                            className="w-3.5 h-3.5 rounded object-contain shrink-0"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span>{src.domain}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 italic">No answer data available.</div>
            )}
          </div>

          <div className="w-72 border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 flex flex-col overflow-y-auto">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 dark:border-zinc-800">
              SOURCES
            </div>

            {activeQuestion && activeQuestion.sources.length > 0 ? (
              <div className="space-y-3">
                {activeQuestion.sources.map((src, idx) => {
                  const hasFaviconFailed = failedFavicons[src.domain];

                  return (
                    <a
                      key={idx}
                      href={src.url || `https://${src.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors group"
                    >
                      {!hasFaviconFailed ? (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=64`}
                          alt=""
                          className="w-6 h-6 rounded bg-white dark:bg-zinc-900 p-0.5 border border-gray-200 dark:border-zinc-800 object-contain shrink-0 mt-0.5"
                          onError={() => setFailedFavicons((prev) => ({ ...prev, [src.domain]: true }))}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          {src.domain[0].toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 transition-colors">
                          {src.domain}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {src.url || `https://${src.domain}`}
                        </div>
                      </div>
                      <i className="i-ph:arrow-square-out text-gray-400 text-xs shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic">No specific sources cited for this question.</div>
            )}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
