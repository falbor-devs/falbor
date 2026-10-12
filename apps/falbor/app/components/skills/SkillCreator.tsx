import React, { useRef, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { useChat } from '@ai-sdk/react';
import { addSkill } from '~/lib/stores/skills';
import { skillCreationPrompt } from '~/lib/common/prompts/skill-prompt';
import { Button } from '~/components/ui/Button';
import { Markdown } from '~/components/chat/messages/Markdown';
import styles from '~/components/chat/core/BaseChat.module.scss';
import { TextShimmer } from '../ui/text-shimmer';

interface SkillCreatorProps {
  onBack: () => void;
  onSkillCreated: () => void;
}

export const SkillCreator: React.FC<SkillCreatorProps> = ({ onBack, onSkillCreated }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/chat',
    body: {
      model: 'deepseek-v4-flash',
      provider: { name: 'Deepseek' },
    },
    initialMessages: [
      {
        id: 'system',
        role: 'system',
        content: skillCreationPrompt,
      }
    ],
    onFinish: (message) => {
      const lines = message.content.split('\n');
      const titleLine = lines.find(l => l.startsWith('# '))?.replace('# ', '') || 'New Skill';
      const descriptionLine = lines.find(l => !l.startsWith('#') && l.trim().length > 10) || 'A custom skill created by Falbor AI.';

      addSkill({
        name: titleLine.substring(0, 50),
        description: descriptionLine.substring(0, 150),
        content: message.content,
      });

      setTimeout(() => {
        onSkillCreated();
      }, 1500);
    }
  });

  const assistantMessage = messages.filter(m => m.role === 'assistant').pop();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [assistantMessage?.content]);

  return (
    <div className="flex flex-col h-full bg-falbor-elements-background-depth-1">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-falbor-elements-borderColor">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary transition-colors"
        >
          <div className="i-ph:arrow-left text-lg" />
        </button>
        <div className="font-semibold text-falbor-elements-textPrimary">Create Skill with Falbor</div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
        {}
        <div className="shrink-0 flex flex-col items-center justify-center text-center space-y-4 pt-12 pb-4">
          <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-3 flex items-center justify-center">
            <div className="i-ph:puzzle-piece text-3xl text-falbor-elements-textSecondary"></div>
          </div>
          <h2 className="text-2xl text-falbor-elements-textPrimary">Let's create a skill together</h2>
        </div>

        <form onSubmit={handleSubmit} className="relative mx-auto w-[70%] shrink-0">
          <div className="relative bg-falbor-elements-background-depth-2 dark:bg-[#1E1E21] backdrop-blur border border-[#BDBDBD] dark:border-[#353538] shadow-md rounded-lg">
            <svg className={classNames(styles.PromptEffectContainer)}>
              <defs>
                <linearGradient
                  id="line-gradient"
                  x1="20%"
                  y1="0%"
                  x2="-14%"
                  y2="10%"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="rotate(-45)"
                >
                  <stop offset="0%" stopColor="#B12B06" stopOpacity="0%"></stop>
                  <stop offset="40%" stopColor="#B12B06" stopOpacity="80%"></stop>
                  <stop offset="50%" stopColor="#B12B06" stopOpacity="80%"></stop>
                  <stop offset="100%" stopColor="#B12B06" stopOpacity="0%"></stop>
                </linearGradient>
                <linearGradient id="shine-gradient">
                  <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                  <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                  <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                </linearGradient>
              </defs>
              <rect className={classNames(styles.PromptEffectLine)} pathLength="100" strokeLinecap="round"></rect>
              <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
            </svg>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
              placeholder="Describe the feature, persona, or capability you want to add."
              className="w-full bg-transparent p-4 pr-12 text-falbor-elements-textPrimary placeholder-falbor-elements-textTertiary resize-none focus:outline-none min-h-[130px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isLoading) {
                    handleSubmit(e as any);
                  }
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 p-2 rounded-lg bg-accent-500 text-white disabled:opacity-50 disabled:bg-falbor-elements-background-depth-4 disabled:text-falbor-elements-textTertiary transition-colors"
            >
              {isLoading ? (
                <div className="i-svg-spinners:90-ring-with-bg text-lg" />
              ) : (
                <div className="i-ph:paper-plane-right-fill text-lg" />
              )}
            </button>
          </div>
        </form>

        {}
        {isLoading && (
          <div className="mt-4 w-[70%] mx-auto flex-1 flex flex-col min-h-0">
            <div
              ref={scrollRef}
              className="relative w-full flex-1 min-h-[300px] bg-white border border-falbor-elements-borderColor rounded-xl overflow-y-auto p-4"
            >
              {assistantMessage?.content ? (
                <Markdown html>{assistantMessage.content}</Markdown>
              ) : (
                <div className="text-xs font-medium text-falbor-elements-textSecondary mb-2 flex items-center gap-2">
                  <div className="i-svg-spinners:pulse-2 text-accent-500" />
                  <TextShimmer>Thinking...</TextShimmer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};