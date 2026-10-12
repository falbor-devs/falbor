'use client';

import React from 'react';
import classNames from 'classnames';
import type { EngineItem } from './types';

interface AiAeoEngineCardProps {
  engine: EngineItem;
  onSelect: (engine: EngineItem) => void;
}

export function AiAeoEngineCard({ engine, onSelect }: AiAeoEngineCardProps) {
  const firstQuestion = engine.questions[0];
  const answerSnippet = firstQuestion?.answerText
    ? firstQuestion.answerText.slice(0, 140) + '...'
    : 'No model run execution recorded for this engine.';

  const logoSrc =
    engine.key === 'openai' || engine.displayName.toLowerCase().includes('chatgpt')
      ? '/icons/OpenAI.svg'
      : engine.key === 'anthropic' || engine.displayName.toLowerCase().includes('claude')
        ? '/icons/claude-color.svg'
        : engine.key === 'deepseek' || engine.displayName.toLowerCase().includes('deepseek')
          ? '/icons/deepseek-color.svg'
          : null;

  return (
    <div
      onClick={() => onSelect(engine)}
      className="bg-white cursor-pointer dark:bg-[#111114] border border-gray-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 font-bold text-gray-900 dark:text-white">
            <div className="w-8 h-8">
              {logoSrc ? (
                <img src={logoSrc} alt={engine.displayName} className="w-full h-full object-contain" />
              ) : (
                <i className={classNames(engine.icon, 'text-purple-600 text-lg')} />
              )}
            </div>
            <span>{engine.displayName}</span>
          </div>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 italic mb-4">
          "{answerSnippet}"
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span>Inspect response & sources ({engine.questions.length} runs)</span>
        <i className="i-ph:arrow-right" />
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span
          className={classNames('w-2 h-2 rounded-full', {
            'bg-emerald-500': engine.statusColor === 'green',
            'bg-red-500': engine.statusColor === 'red',
            'bg-amber-500': engine.statusColor === 'amber',
            'bg-gray-400': engine.statusColor === 'gray',
          })}
        />
        <span
          className={classNames({
            'text-emerald-600 dark:text-emerald-400': engine.statusColor === 'green',
            'text-red-600 dark:text-red-400': engine.statusColor === 'red',
            'text-amber-600 dark:text-amber-400': engine.statusColor === 'amber',
            'text-gray-500': engine.statusColor === 'gray',
          })}
        >
          {engine.status}
        </span>
      </div>
    </div>
  );
}
