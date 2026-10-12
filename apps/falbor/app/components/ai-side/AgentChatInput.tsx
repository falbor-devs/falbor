'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { IoStopCircle } from 'react-icons/io5';
import { useStore } from '@nanostores/react';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { sendAgentMessage, stopAgent } from '~/lib/actions/agentChat';
import { usePathname } from 'next/navigation';
import { ArrowUpIcon } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { Badge } from '../ui';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownSub, DropdownSubTrigger, DropdownSubContent } from '~/components/ui/Dropdown';
import { MCP_CONNECTORS } from '~/components/@settings/tabs/mcp/connectors';
import { useMCPStore } from '~/lib/stores/mcp';
import { SkillsDialog } from '~/components/skills/SkillsDialog';
import { skillsStore } from '~/lib/stores/skills';

const FALBOR_SUGGESTIONS = [
  {
    label: 'What can you help me with?',
    prompt: 'What marketing strategy, acquisition channels, and growth tactics can you analyze for Falbor?',
  },
  {
    label: 'Browse & audit competitor website',
    prompt: 'Launch a Browser Use microVM session to inspect https://google.com and audit current search positioning for my product.',
  },
  {
    label: 'Generate marketing audit',
    prompt: 'Can you generate a comprehensive marketing and target audience audit for my product?',
  },
  {
    label: 'How to get first 100 users?',
    prompt: 'What are the most effective strategies and channels to get our first 100 paid customers?',
  },
];

export const AgentChatInput = () => {
  const isActive = useStore(aiSidebarStore.isActive);
  const events = useStore(aiSidebarStore.events);
  const pathname = usePathname();
  const [chatInput, setChatInput] = useState('');
  const [userRole, setUserRole] = useState<string>('owner');
  const [blogInputError, setBlogInputError] = useState(false);

  const isAgentContactPage = pathname?.includes('/agent-contact');
  const isBlogContentPage = pathname?.includes('/blog-content');

  const [userBalance, setUserBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.balance !== undefined) setUserBalance(Number(d.balance));
      })
      .catch(() => { });
  }, [events, isActive]);

  const activeWsId = pathname?.split('/')[2] || '';

  useEffect(() => {
    if (activeWsId) {
      import('~/lib/actions/workspaceMembers').then(({ getWorkspaceMembers }) => {
        getWorkspaceMembers(activeWsId)
          .then((members) => {
            if (Array.isArray(members)) {
              const current = members.find((m) => m.isCurrentUser);
              if (current) setUserRole(current.role);
            }
          })
          .catch(() => { });
      });
    }
  }, [pathname]);

  const isViewer = userRole === 'viewer';

  const handleImproveBlog = () => {
    if (!chatInput.trim()) {
      setBlogInputError(true);
      setTimeout(() => setBlogInputError(false), 3000);
      return;
    }

    if (isActive) {
      stopAgent();
      return;
    }

    setBlogInputError(false);
    const workspaceId = pathname?.split('/')[2] || '';
    const blogPrompt = `[CONTEXT: BLOG_CONTENT_IMPROVEMENT_MCP] [WORKSPACE_ID: ${workspaceId}] 
The user is asking for improvements to their workspace blog post content.
User instructions: "${chatInput.trim()}"

Target Action & Instructions:
1. Fetch the current blog content for workspace ID "${workspaceId}".
2. Apply the user's requested changes, tone adjustments, structural improvements, or additional sections.
3. Automatically update and save the blog content back using the blogContent tools.`;

    setChatInput('');
    sendAgentMessage(blogPrompt);
  };

  const isProductDeckPage = pathname?.includes('/product-deck');

  const handleImprovePresentation = () => {
    if (!chatInput.trim()) {
      setBlogInputError(true);
      setTimeout(() => setBlogInputError(false), 3000);
      return;
    }

    if (isActive) {
      stopAgent();
      return;
    }

    setBlogInputError(false);
    const workspaceId = pathname?.split('/')[2] || '';
    const deckPrompt = `[CONTEXT: PRODUCT_DECK_IMPROVEMENT_MCP] [WORKSPACE_ID: ${workspaceId}] 
The user is asking for improvements to their workspace investor product pitch deck.
User instructions: "${chatInput.trim()}"

Target Action & Instructions:
1. Fetch the current product deck slides for workspace ID "${workspaceId}".
2. Apply the user's requested changes to specific slides or the entire presentation deck.
3. Automatically update and save the presentation slides back using the presentation tools.`;

    setChatInput('');
    sendAgentMessage(deckPrompt);
  };

  const selectedMCPs = useMCPStore((state) => state.selectedMCPs);
  const toggleSelectedMCP = useMCPStore((state) => state.toggleSelectedMCP);
  const mcpConfig = useMCPStore((state) => state.settings?.mcpConfig?.mcpServers || {});

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSkillsDialogOpen, setIsSkillsDialogOpen] = useState(false);

  const allSkills = useStore(skillsStore);
  const activeSkillsList = allSkills.filter(s => s.isActive);

  const toggleSelectedSkill = (skillId: string) => {
    setSelectedSkills(prev => prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]);
  };

  const [dbConnections, setDbConnections] = useState<any[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/mcp/connections', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.connections)) {
          setDbConnections(data.connections);
        } else if (Array.isArray(data)) {
          setDbConnections(data);
        } else {
          setDbConnections([]);
        }
      })
      .catch((err) => console.error('Error fetching MCP connections:', err));
  }, []);

  useEffect(() => {
    const handleCustomAgentMsg = (e: any) => {
      if (e.detail?.prompt) {
        sendAgentMessage(e.detail.prompt);
      }
    };
    window.addEventListener('falbor:send_agent_message', handleCustomAgentMsg as any);
    return () => window.removeEventListener('falbor:send_agent_message', handleCustomAgentMsg as any);
  }, [sendAgentMessage]);

  // Display ALL MCP connectors
  const allConnectors = useMemo(() => {
    return MCP_CONNECTORS.filter((connector) => connector.id !== 'custom');
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isActive) {
      stopAgent();
      return;
    }
    if (!chatInput.trim() && selectedMCPs.length === 0 && selectedSkills.length === 0) return;
    let finalInput = chatInput.trim();
    if (selectedSkills.length > 0) {
      finalInput = `${selectedSkills.map(s => `[Skill: ${s}]`).join(' ')} ${finalInput}`;
    }
    setChatInput('');
    setSelectedSkills([]);
    sendAgentMessage(finalInput);
  };

  const handleStartGrowthAgent = () => {
    if (isActive) {
      stopAgent();
      return;
    }
    if (!useMCPStore.getState().selectedMCPs.includes('gmail')) {
      useMCPStore.getState().toggleSelectedMCP('gmail');
    }
    const prompt = `Find me people who are relevant to this project/product. 
1. Read my product context/ICP if you have it. If not, just search broadly for our industry.
2. Based on the product ICP, autonomously identify 2 target company domains.
3. Use the Tomba API tool to search each of those specific domains for relevant contacts.
4. Write highly personalized emails for the found contacts.
5. DO NOT ASK ME FOR PERMISSION. If you have the Gmail MCP connected, you MUST use the 'gmail_send_email' tool to send the emails immediately. If not, just prepare them.
6. YOU ABSOLUTELY MUST call the 'ui_update_agent_contact_table' tool at the end to display ANY prospects you found, even if some API calls failed or rate limited. 
7. DO NOT output the prospects in plain text in the chat. DO NOT ask me what to do next. Just execute the tool!`;
    sendAgentMessage(prompt);
  };

  const insertConnector = (connectorId: string) => {
    if (!selectedMCPs.includes(connectorId)) {
      toggleSelectedMCP(connectorId);
    }

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const pendingQuestion = [...events].reverse().find((e) => e.type === 'options' && e.status === 'pending');
  const activeQuestionTitle = pendingQuestion?.title ?? '';
  const rawOptions = pendingQuestion?.details ?? [];
  const recommendedOption = pendingQuestion?.recommended;
  const sortedOptions = useMemo(() => {
    if (!rawOptions.length) return [];
    if (!recommendedOption) return rawOptions;
    const recommendedMatch = rawOptions.find((o) => o.toLowerCase().trim() === recommendedOption.toLowerCase().trim());
    if (!recommendedMatch) return rawOptions;
    return [recommendedMatch, ...rawOptions.filter((o) => o !== recommendedMatch)];
  }, [rawOptions, recommendedOption]);

  const [selectedOption, setSelectedOption] = useState<string>('');

  useEffect(() => {
    if (sortedOptions.length > 0) {
      setSelectedOption(sortedOptions[0]);
    } else {
      setSelectedOption('');
    }
  }, [sortedOptions]);

  const handleOptionSelect = (selectedOptionText: string) => {
    if (isActive) return;
    sendAgentMessage(selectedOptionText, { apiText: `Selected option: ${selectedOptionText}` });
  };

  const handleNextClick = () => {
    if (!selectedOption || isActive) return;
    handleOptionSelect(selectedOption);
  };

  return (
    <form
      onSubmit={handleSendMessage}
      className="p-3 relative max-w-[440px] w-full mx-auto"
    >

      {sortedOptions.length > 0 && !isActive && (
        <div className="p-3 border border-gray-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-t-lg animate-fade-in z-30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">AI Question</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOptionSelect('Skipped question')}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 px-2.5 py-1 rounded-md transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNextClick}
                className="text-xs bg-[#0099ff]/20 text-[#0099ff] font-medium px-3 py-1 rounded-md transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
          <p className="text-sm font-medium mb-3 text-gray-700 dark:text-white line-clamp-3 leading-snug">{activeQuestionTitle}</p>
          <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {sortedOptions.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedOption === option;
              const isRecommended = idx === 0 || (recommendedOption && option.toLowerCase().trim() === recommendedOption.toLowerCase().trim());

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedOption(option)}
                  className={classNames(
                    "flex items-center rounded-md gap-2.5 p-2 text-left group relative",
                    isSelected
                      ? "bg-[#0099ff]/15 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800/60 border-transparent text-gray-700 dark:text-gray-300"
                  )}
                >
                  <span className={classNames(
                    "rounded-md w-5 h-5 flex items-center justify-center text-xs shrink-0 font-bold",
                    isSelected
                      ? "bg-[#0099ff] text-white"
                      : "bg-[#E9E9E9] dark:bg-gray-800 text-black dark:text-gray-200 group-hover:bg-[#0099ff] group-hover:text-white"
                  )}>
                    {letter}
                  </span>

                  <span className="text-xs font-medium flex-1 truncate">
                    {option}
                  </span>

                  {isRecommended && (
                    <Badge variant='outline' size='md' >
                      Recommended
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Blog Content Improvement Widget */}
      {isBlogContentPage && !isActive && sortedOptions.length === 0 && (
        <div className="relative z-0 -mb-2">
          <div className="bg-[#EBEBEB] dark:bg-[#1C2A3A] px-4 pt-3 pb-5 flex justify-between items-center text-sm rounded-t-[8px]">
            <div className="font-medium flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-blue-100">Let your AI improve your blog</span>
            </div>
            <button
              type="button"
              onClick={handleImproveBlog}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <i className="i-ph:sparkle-fill" />
              Improve my blog
            </button>
          </div>
        </div>
      )}
      {/* Product Deck Improvement Widget */}
      {isProductDeckPage && !isActive && sortedOptions.length === 0 && (
        <div className="relative z-0 -mb-2">
          <div className="bg-[#EBEBEB] dark:bg-[#251D3A] px-4 pt-3 pb-5 flex justify-between items-center text-sm rounded-t-[8px]">
            <div className="font-medium flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-purple-100">Let your AI refine your presentation deck</span>
            </div>
            <button
              type="button"
              onClick={handleImprovePresentation}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <i className="i-ph:sparkle-fill" />
              Improve Deck
            </button>
          </div>
        </div>
      )}
      {/* Growth Agent Start Widget */}
      {isAgentContactPage && !isActive && sortedOptions.length === 0 && (
        <div className="relative z-0 -mb-2">
          <div className="bg-[#EBEBEB] dark:bg-[#282828] px-4 pt-3 pb-5 flex justify-between items-center text-sm rounded-t-xl">
            <div className="font-medium flex items-center gap-2">
              <span className="text-sm text-gray-900 dark:text-orange-100">Let's find you the best prospects</span>
            </div>
            <button
              type="button"
              onClick={handleStartGrowthAgent}
              className="bg-[#0099ff]/20 text-[#0099ff] px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
            >
              <i className="i-ph:sparkle-fill" />
              Let your AI start
            </button>
          </div>
        </div>
      )}
      <div className="relative z-0 -mb-2">
        <div className="bg-[#EBEBEB] dark:bg-[#282828] px-4 pt-3 pb-5 flex justify-between items-center text-sm rounded-t-xl">
          <span className="text-[#8e8e93] dark:text-[#909095] font-medium text-[12px]">Connect your apps</span>
          <div className="flex items-center gap-1.5">
            {allConnectors.slice(0, 6).map((c) => {
              const isSelected = selectedMCPs.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => insertConnector(c.id)}
                  title={`${c.name} (${isSelected ? 'Selected' : 'Click to select'})`}
                  className={`p-0.5 rounded transition-transform hover:scale-110 ${isSelected ? 'ring-1 ring-blue-500' : 'opacity-90 hover:opacity-100'}`}
                >
                  <img src={c.logo} alt={c.name} className="w-4 h-4 object-contain" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={`flex flex-col border bg-white dark:bg-[#212121] ${blogInputError ? 'border-red-500 border-2 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'border-black/10 dark:border-white/10'} gap-2 p-3 bg-transparent rounded-xl relative z-10 focus-within:border-gray-400 dark:focus-within:border-white/20 transition-all`}>
        {selectedMCPs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 pb-1">
            {selectedMCPs.map((mcpId) => {
              const connector = MCP_CONNECTORS.find((c) => c.id === mcpId);
              return (
                <span
                  key={mcpId}
                  className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-0.5 text-xs font-medium"
                >
                  {connector?.logo && <img src={connector.logo} className="w-6 h-6 object-contain" alt="" />}
                  <span>@{mcpId}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectedMCP(mcpId)}
                    className="hover:text-red-500 transition-colors ml-0.5 text-xs"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 pb-1">
            {selectedSkills.map((skillId) => {
              const skill = activeSkillsList.find((s) => s.id === skillId);
              return (
                <span
                  key={skillId}
                  className="inline-flex items-center gap-1 bg-[#0099ff]/20 text-[#0099ff] rounded-md px-2 py-0.5 text-xs font-medium"
                >
                  <i className="i-ph:magic-wand text-sm" />
                  <span>{skill?.name || skillId}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectedSkill(skillId)}
                    className="transition-colors ml-0.5 text-xs"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="flex-1 flex gap-2 relative overflow-hidden">
          {sortedOptions.length > 0 && (
            <i className="i-ph:pencil-simple text-gray-400 text-base ml-1 mt-1 shrink-0" />
          )}

          <textarea
            ref={textareaRef}
            value={chatInput}
            disabled={isActive || isViewer}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isViewer
                ? 'Viewers cannot send messages to AI Agent'
                : isActive
                  ? 'AI is working... Click stop to pause'
                  : sortedOptions.length > 0
                    ? 'Or type a custom answer...'
                    : 'What is your purpose for today?'
            }
            className="w-full h-full min-h-[50px] bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-white caret-gray-900 dark:caret-white focus:outline-none placeholder-gray-400 disabled:opacity-60 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-1">
          {/* Left side: Skills */}
          <div className="flex items-center gap-1">
            <Dropdown
              side="top"
              align="start"
              className="w-56"
              trigger={
                <button
                  type="button"
                  className="w-6 h-5 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Add Feature"
                >
                  <i className="i-ph:plus text-lg" />
                </button>
              }
            >
              <DropdownSub>
                <DropdownSubTrigger>
                  <i className="i-ph:plugs text-sm" /> Connectors
                </DropdownSubTrigger>
                <DropdownSubContent alignOffset={-230}>
                  <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
                    {allConnectors.map((connector) => {
                      const hasLocalConnection = Object.keys(mcpConfig).some((key) => key.startsWith(`${connector.id}-`));
                      const hasDbConnection = Array.isArray(dbConnections) && dbConnections.some((dbc) => dbc.connectorId === connector.id || dbc.connector_id === connector.id);
                      const isConnected = hasLocalConnection || hasDbConnection;
                      const isSelected = selectedMCPs.includes(connector.id);

                      return (
                        <DropdownItem
                          key={connector.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            if (isConnected) insertConnector(connector.id);
                          }}
                          className={classNames(!isConnected && 'opacity-60 cursor-not-allowed')}
                        >
                          <div className="flex items-center justify-between w-full min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <img src={connector.logo} className="w-4 h-4 object-contain shrink-0" alt="" />
                              <span className="truncate">{connector.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {isSelected && <i className="i-ph:check text-[#0099ff] text-xs font-bold" />}
                              {!isConnected && <div className="i-ph:warning-circle text-orange-400 text-xs opacity-80" title="Not connected" />}
                            </div>
                          </div>
                        </DropdownItem>
                      );
                    })}
                  </div>
                </DropdownSubContent>
              </DropdownSub>

              <DropdownSub>
                <DropdownSubTrigger>
                  <img src="/icons/skills.svg" className="w-4 h-4 object-contain" alt="" /> Skills
                </DropdownSubTrigger>
                <DropdownSubContent alignOffset={-200}>
                  {activeSkillsList.length === 0 ? (
                    <div className="text-xs text-gray-500 p-2 text-center w-full min-w-[140px]">No active skills</div>
                  ) : (
                    activeSkillsList.map(skill => (
                      <DropdownItem
                        key={skill.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleSelectedSkill(skill.id);
                        }}
                        active={selectedSkills.includes(skill.id)}
                      >
                        <div className="flex items-center justify-between w-full min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <i className="i-ph:magic-wand text-sm text-gray-500" />
                            <span className="truncate">{skill.name}</span>
                          </div>
                          {selectedSkills.includes(skill.id) && <i className="i-ph:check text-[#0099ff] text-xs font-bold" />}
                        </div>
                      </DropdownItem>
                    ))
                  )}
                  <DropdownSeparator />
                  <DropdownItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsSkillsDialogOpen(true);
                    }}
                  >
                    <i className="i-ph:plus text-sm text-gray-500" />
                    Create Skill
                  </DropdownItem>
                </DropdownSubContent>
              </DropdownSub>
            </Dropdown>
          </div>

          {/* Right side: Credit Balance & Send / Stop */}
          <div className="flex items-center gap-2">
            {userBalance !== null && (
              <a
                href={activeWsId ? `/workspace/${activeWsId}/upgrade` : '/upgrade'}
                title="View Subscription & Credits"
                className="text-[11px] py-2 px-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 bg-gray-100 hover:bg-purple-50 dark:bg-gray-800/60 dark:hover:bg-purple-950/40 rounded-md transition-colors flex items-center gap-1"
              >
                <span>{userBalance.toFixed(1)} credits</span>
              </a>
            )}

            {isActive ? (
              <button
                type="button"
                onClick={stopAgent}
                title="Stop AI Response"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shrink-0"
              >
                <IoStopCircle className="text-lg" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  (!chatInput.trim() && selectedMCPs.length === 0 && selectedSkills.length === 0) ||
                  (userBalance !== null && userBalance <= 0)
                }
                title={userBalance !== null && userBalance <= 0 ? 'Insufficient credits — upgrade plan' : 'Send Message'}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0099ff]/20 text-[#0099ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <ArrowUpIcon className="text-sm" />
              </button>
            )}
          </div>
        </div>
      </div>

      <SkillsDialog open={isSkillsDialogOpen} onOpenChange={setIsSkillsDialogOpen} />
    </form>
  );
};