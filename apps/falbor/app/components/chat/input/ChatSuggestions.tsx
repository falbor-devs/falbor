'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { useMCPStore } from '~/lib/stores/mcp';
import { settingsOpenStore, settingsTabStore } from '~/lib/stores/settings';
import { sidebarOpen } from '~/lib/stores/sidebar';

interface Suggestion {
  id: string;
  imageIcon?: string;
  title: string;
  description: string;
  isGmail?: boolean;
  isAi?: boolean;
}

const STORAGE_KEY = 'falbor_ai_suggestions';

interface ChatSuggestionsProps {
  onSelectSuggestion: (description: string) => void;
}

export const ChatSuggestions = ({ onSelectSuggestion }: ChatSuggestionsProps) => {
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const files = useStore(workbenchStore.files);
  const mcpConfig = useMCPStore((state) => state.settings?.mcpConfig);
  const selectedMCPs = useMCPStore((state) => state.selectedMCPs);
  const toggleSelectedMCP = useMCPStore((state) => state.toggleSelectedMCP);

  const isGmailConnected = () => {
    return Object.keys(mcpConfig?.mcpServers || {}).some((key) => key.startsWith('gmail-'));
  };

  const handleGmailClick = () => {
    if (isGmailConnected()) {
      if (!selectedMCPs.includes('gmail')) {
        toggleSelectedMCP('gmail');
      }
      onSelectSuggestion('Tell me the last messages I received from my Gmail today @gmail');
    } else {
      settingsTabStore.set('mcp' as any);
      settingsOpenStore.set(true);
      sidebarOpen.set(true);
    }
  };

  const staticSuggestions: Suggestion[] = [
    {
      id: 'gmail-button',
      imageIcon: '/icons/gmail.svg',
      title: 'Gmail Messages',
      description: 'Tell me the last messages I received from my Gmail today @gmail',
      isGmail: true,
    },
    {
      id: 'static-1',
      title: 'Add CTA Button',
      description: 'Add a polished, high-converting call-to-action button section with hover effects and smooth transitions.',
    },
    {
      id: 'static-2',
      title: 'Dark Mode Toggle',
      description: 'Add a dark mode theme toggle switch with persistent user theme preferences and smooth background transitions.',
    },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAiSuggestions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load AI suggestions from localStorage', e);
    }
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [aiSuggestions, isExpanded]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -180 : 180;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const generateAiSuggestions = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const fileKeys = Object.keys(files || {}).slice(0, 10).join(', ');
      const prompt = `Based on project files (${fileKeys || 'web app'}), generate 3 smart improvement ideas. Return ONLY a JSON array of 3 objects with properties: "title" (short 2-4 words), "description" (15-25 words).`;

      const response = await fetch('/api/llmcall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemPrompt: 'You are an AI UI/UX expert. Return only JSON array.',
        }),
      });

      let newAiItems: Suggestion[] = [];
      if (response.ok) {
        const text = await response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          newAiItems = parsed.slice(0, 3).map((item: any, idx: number) => ({
            id: `ai-${Date.now()}-${idx}`,
            title: item.title || 'Smart Feature',
            description: item.description || 'Improve UI layout and responsiveness.',
            isAi: true,
          }));
        }
      }

      if (newAiItems.length === 0) {
        newAiItems = [
          {
            id: `ai-fb-1`,
            title: 'Fast Micro-Interactions',
            description: 'Add tactile click animations and active state visual feedback for buttons and interactive cards.',
            isAi: true,
          },
          {
            id: `ai-fb-2`,
            title: 'Refine Color Scheme',
            description: 'Apply subtle vibrant gradient accents and glassmorphism backdrop filters for a premium aesthetic.',
            isAi: true,
          },
          {
            id: `ai-fb-3`,
            title: 'Mobile Layout Fix',
            description: 'Adjust container paddings and responsive flex layouts for seamless display on smartphone screens.',
            isAi: true,
          },
        ];
      }

      setAiSuggestions(newAiItems);
      setIsExpanded(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAiItems));
      }
    } catch (e) {
      console.error('Failed to generate AI suggestions:', e);
      const fallbackItems: Suggestion[] = [
        {
          id: `ai-fb-1`,
          title: 'Fast Micro-Interactions',
          description: 'Add tactile click animations and active state visual feedback for buttons and interactive cards.',
          isAi: true,
        },
        {
          id: `ai-fb-2`,
          title: 'Refine Color Scheme',
          description: 'Apply subtle vibrant gradient accents and glassmorphism backdrop filters for a premium aesthetic.',
          isAi: true,
        },
        {
          id: `ai-fb-3`,
          title: 'Mobile Layout Fix',
          description: 'Adjust container paddings and responsive flex layouts for seamless display on smartphone screens.',
          isAi: true,
        },
      ];
      setAiSuggestions(fallbackItems);
      setIsExpanded(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackItems));
      }
    } finally {
      setIsLoading(false);
      setTimeout(checkScroll, 100);
    }
  };

  const handlePlusClick = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      setTimeout(checkScroll, 100);
    } else {
      if (aiSuggestions.length > 0) {
        setIsExpanded(true);
        setTimeout(checkScroll, 100);
      } else {
        await generateAiSuggestions();
      }
    }
  };

  const displayedSuggestions = isExpanded
    ? [...staticSuggestions, ...aiSuggestions]
    : staticSuggestions;

  return (
    <div className="relative group/suggestions px-1">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-4 pl-0.5 bg-gradient-to-r from-falbor-elements-background-depth-1 via-falbor-elements-background-depth-1/80 to-transparent pointer-events-auto">
          <button
            onClick={() => scroll('left')}
            className="w-6 h-6 rounded-md bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor text-falbor-elements-textSecondary flex items-center justify-center shadow-md transition-all active:scale-95"
            title="Scroll left"
          >
            <div className="i-ph:caret-left-bold text-xs" />
          </button>
        </div>
      )}
      {canScrollRight && (
        <div className="absolute right-9 top-0 bottom-0 z-10 flex items-center pl-4 pr-1 bg-gradient-to-l from-falbor-elements-background-depth-1 via-falbor-elements-background-depth-1/80 to-transparent pointer-events-auto">
          <button
            onClick={() => scroll('right')}
            className="w-6 h-6 rounded-md bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor text-falbor-elements-textSecondary flex items-center justify-center shadow-md transition-all active:scale-95"
            title="Scroll right"
          >
            <div className="i-ph:caret-right-bold text-xs" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 w-full">
        <div
          ref={scrollRef}
          className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {displayedSuggestions.map((suggestion) => {
            if (suggestion.isGmail) {
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleGmailClick();
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 hover:bg-falbor-elements-background-depth-2 hover:border-red-400 text-falbor-elements-textPrimary transition-all text-xs font-medium shadow-2xs group flex-shrink-0 cursor-pointer"
                  title="Gmail Integration"
                >
                  <img
                    src="/icons/gmail.svg"
                    alt="Gmail"
                    className="w-6 h-6 object-contain group-hover:scale-110 transition-transform"
                  />
                  <span className="whitespace-nowrap">{suggestion.title}</span>
                </button>
              );
            }

            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSuggestion(suggestion.description);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 hover:bg-falbor-elements-background-depth-2 hover:border-blue-400 text-falbor-elements-textPrimary transition-all text-xs font-medium shadow-2xs group flex-shrink-0 cursor-pointer"
                title={suggestion.description}
              >
                <span className="whitespace-nowrap">{suggestion.title}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={handlePlusClick}
          disabled={isLoading}
          title={isExpanded ? 'Show fewer suggestions' : 'Generate AI suggestions'}
          className="w-7 h-7 rounded-full border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 hover:bg-falbor-elements-background-depth-3 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-2xs"
        >
          {isLoading ? (
            <div className="i-svg-spinners:90-ring-with-bg text-blue-500 text-xs animate-spin" />
          ) : (
            <div className={`i-ph:${isExpanded ? 'minus' : 'plus'} text-xs text-falbor-elements-textSecondary`} />
          )}
        </button>
      </div>
    </div>
  );
};
