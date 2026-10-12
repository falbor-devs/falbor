'use client';

import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { generateWorkspaceIntelligence, getWorkspaceIntelligence } from '~/lib/actions/intelligence';
import { getAgentSessionEvents } from '~/lib/actions/agentSession';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { runDeepIntelligenceResearch } from '~/lib/actions/intelligenceStream';
import { DialogRoot, Dialog, DialogTitle } from '~/components/ui/Dialog';
import { useAuth } from '~/hooks/useAuth';

import { ProductHealthTab } from './tabs/ProductHealthTab';
import { StageTab } from './tabs/StageTab';
import { TargetAudienceTab } from './tabs/TargetAudienceTab';
import { MarketSignalsTab } from './tabs/MarketSignalsTab';
import { MissingInfoTab } from './tabs/MissingInfoTab';
import { NextBestActionTab } from './tabs/NextBestActionTab';
import { TargetAudienceHeatmapTab } from './tabs/TargetAudienceHeatmapTab';
import { CompetitorMatrixTab } from './tabs/CompetitorMatrixTab';
import { AcquisitionFunnelTab } from './tabs/AcquisitionFunnelTab';

export type IntelligenceData = {
  healthScore: number;
  stage: string;
  targetAudience: string;
  mainProblem: string;
  positioning: string;
  nextBestAction: {
    title: string;
    description: string;
    promptText: string;
    expectedOutcome?: string;
  };
  marketSignals: {
    competitors: string[];
    risks: string[];
    opportunities: string[];
    missingTrustElements: string[];
  };
  sourcesUsed: string[];
  missingInformation: string[];
  competitorMatrix?: Array<{ name: string; xScore: number; yScore: number; xAxisLabel: string; yAxisLabel: string; }>;
  targetAudienceHeatmap?: Array<{ segment: string; intentLevel: string; budgetLevel: string; description: string; }>;
  acquisitionFunnel?: {
    topOfFunnel: { tactic: string; description: string; };
    activation: { tactic: string; description: string; };
    retention: { tactic: string; description: string; };
  };
  audienceInterestGraph?: Array<{ dateLabel: string; interestScore: number; }>;
  healthTrendGraph?: Array<{ dateLabel: string; score: number; }>;
  validationRateGraph?: Array<{ dateLabel: string; score: number; }>;
  funnelDropoffGraph?: Array<{ dateLabel: string; score: number; }>;
};

const createSvgPath = (data?: { score: number }[]) => {
  if (!data || data.length === 0) return "0,50 100,50";
  const max = 100;
  const width = 100;
  const height = 50;
  return data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - (d.score / max) * height;
    return `${x},${y}`;
  }).join(' ');
};
function normalizeIntelligence(raw: any): IntelligenceData {
  return {
    ...raw,
    healthScore: Number(raw?.healthScore) || 0,
    stage: typeof raw?.stage === 'string' ? raw.stage : '',
    targetAudience: raw?.targetAudience ?? '',
    mainProblem: raw?.mainProblem ?? '',
    positioning: raw?.positioning ?? '',
    missingInformation: Array.isArray(raw?.missingInformation) ? raw.missingInformation : [],
    sourcesUsed: Array.isArray(raw?.sourcesUsed) ? raw.sourcesUsed : [],
  } as IntelligenceData;
}

interface ProductIntelligencePanelProps {
  workspaceId: string;
  initialData?: any;
}

function Tile({ title, icon, value, colorClass, onClick, isGenerating }: any) {
  return (
    <div
      className={classNames(
        "z-20 flex flex-col bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-white/35 rounded-[8px] overflow-hidden transition-all duration-300 cursor-pointer col-span-1 h-[220px] relative"
      )}
      onClick={onClick}
    >
      {isGenerating && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-xl">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse shadow-[0_0_12px_#3b82f6]" style={{
            animation: 'scanLine 2s linear infinite'
          }} />
          <style jsx>{`
            @keyframes scanLine {
              0% { transform: translateY(0); opacity: 0.3; }
              50% { transform: translateY(216px); opacity: 1; }
              100% { transform: translateY(0); opacity: 0.3; }
            }
          `}</style>
        </div>
      )}
      <div className="p-5 flex flex-col h-full justify-between relative">
        <div className="flex justify-between items-start">
          <div className={classNames("w-10 h-10 rounded-md flex items-center justify-center bg-opacity-10", colorClass.bg, colorClass.text)}>
            <i className={classNames(icon, "text-xl")} />
          </div>
          <i className="i-ph:arrows-out-simple text-gray-300 dark:text-gray-600 group-hover:text-gray-500" />
        </div>

        <div>
          <div className="text-md text-gray-500 dark:text-gray-400 mb-1">{title}</div>
          <div className="text-xl text-gray-900 dark:text-white line-clamp-2">
            {isGenerating ? (
              <span className="text-blue-500 dark:text-blue-400 text-sm animate-pulse flex items-center gap-2">
                <i className="i-ph:sparkle animate-spin text-base" /> Generating...
              </span>
            ) : value}
          </div>
        </div>
      </div>
    </div>
  );
}

import { IntelligenceDashboard } from './IntelligenceDashboard';

export function ProductIntelligencePanel({ workspaceId, initialData }: ProductIntelligencePanelProps) {
  const { user } = useAuth();
  const [data, setData] = useState<IntelligenceData | null>(initialData ? normalizeIntelligence(initialData) : null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [expandedTile, setExpandedTile] = useState<string | null>(null);

  const runResearch = () => {
    setLoading(true);
    setError(null);
    runDeepIntelligenceResearch(
      workspaceId,
      (result) => {
        setData(normalizeIntelligence(result));
        setLoading(false);
      },
      async () => {
        try {
          const fallbackData = await generateWorkspaceIntelligence(workspaceId);
          setData(normalizeIntelligence(fallbackData));
        } catch (err: any) {
          setError(err?.message || 'Failed to load intelligence');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const fetchIntelligence = async (forceGenerate = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!forceGenerate) {
        const existing = await getWorkspaceIntelligence(workspaceId);
        if (existing) {
          setData(normalizeIntelligence(existing));
          setLoading(false);
          return;
        }
      }

      runResearch();
    } catch (err: any) {
      setError(err?.message || 'Failed to load intelligence');
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadSession() {
      if (workspaceId) {
        const currentWs = aiSidebarStore.currentWorkspaceId.get();
        const currentSid = aiSidebarStore.currentSessionId.get();
        if (currentWs !== workspaceId || !currentSid) {
          const sessionData = await getAgentSessionEvents(workspaceId);
          aiSidebarStore.setWorkspace(workspaceId, sessionData.events, sessionData.id, sessionData.title);
        }
      }
    }
    loadSession();

    if (!initialData && !data) {
      getWorkspaceIntelligence(workspaceId)
        .then((existing) => {
          if (existing) {
            setData(normalizeIntelligence(existing));
            setLoading(false);
          } else {
            // No intelligence stored yet — automatically trigger research
            fetchIntelligence(true);
          }
        })
        .catch(() => {
          fetchIntelligence(true);
        });
    }
  }, [workspaceId, initialData]);

  if (loading && !data) {
    return (
      <div className="flex-1 w-full p-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-white dark:bg-[#111114] border border-[#D6D6D6] dark:border-[#1A1A1E] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 w-full p-6 flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-xl text-center max-w-md">
          <i className="i-ph:warning-circle text-4xl mb-4" />
          <p className="mb-2">Failed to load Product Intelligence.</p>
          <p className="mb-4 text-xs opacity-80 break-words">{error}</p>
          <button onClick={() => fetchIntelligence(true)} className="px-6 py-2 bg-red-100 dark:bg-red-900/40 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 w-full p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md p-8 rounded-2xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2">
          <div className="i-ph:chart-pie-slice-duotone text-5xl text-falbor-elements-textTertiary mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-falbor-elements-textPrimary mb-2">No Product Intelligence yet</h3>
          <p className="text-sm text-falbor-elements-textSecondary mb-6">
            Run an AI research pass to analyze your product market, audience, competitors, and growth opportunities.
          </p>
          <button
            onClick={() => fetchIntelligence(true)}
            className="px-6 py-2.5 rounded-lg bg-falbor-elements-button-primary-background hover:bg-falbor-elements-button-primary-backgroundHover text-falbor-elements-button-primary-text font-medium text-sm transition-colors shadow-sm"
          >
            Generate Intelligence
          </button>
        </div>
      </div>
    );
  }

  const toggleTile = (id: string) => {
    setExpandedTile(id);
  };

  const getDialogTitle = () => {
    switch (expandedTile) {
      case 'health': return 'Product Health';
      case 'stage': return 'Current Stage';
      case 'audience': return 'Target Audience';
      case 'signals': return 'Market Signals';
      case 'missing': return 'Missing Information';
      case 'action': return 'Next Best Action';
      case 'heatmap': return 'Target Audience Heatmap';
      case 'matrix': return 'Competitor Matrix';
      case 'funnel': return 'Acquisition Funnel';
      default: return '';
    }
  };

  const missingCount = data.missingInformation?.length ?? 0;

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="w-full mt-5 max-w-[1040px] mx-auto flex flex-col gap-6 transition-[max-width] duration-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {new Date().getDate()}/{new Date().getMonth() + 1}
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              👋 Hey, {user?.displayName || (user?.email ? user.email.split('@')[0] : 'there')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => aiSidebarStore.toggle()}
              className="px-3 py-1.5 bg-[#EBEBEB] dark:bg-[#2A2A2A] text-gray-900 dark:text-white rounded-md text-sm flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
            >
              <i className="i-ph:sparkle-fill text-base text-[#0099ff]" />
              Cofounder Agent
            </button>
            <button
              onClick={() => {
                fetchIntelligence(true);
                aiSidebarStore.addEvent({
                  id: `regen-${Date.now()}`,
                  type: 'text',
                  title: 'Regenerating Product Intelligence...',
                  details: [
                    'Analyzing latest product context and target metrics',
                    'Updating competitor matrix, market signals, and audience heatmap'
                  ],
                  status: 'completed'
                });
                if (data?.nextBestAction) {
                  aiSidebarStore.addEvent({
                    id: `action-${Date.now()}`,
                    type: 'text',
                    title: `Next Best Action: ${data.nextBestAction.title}`,
                    details: [
                      data.nextBestAction.description,
                      data.nextBestAction.expectedOutcome ? `Expected Outcome: ${data.nextBestAction.expectedOutcome}` : '',
                      data.nextBestAction.promptText ? `Mission Prompt: ${data.nextBestAction.promptText}` : ''
                    ].filter(Boolean),
                    status: 'completed'
                  });
                }
                aiSidebarStore.open();
              }}
              disabled={loading}
              className="bg-[#0099ff]/10 text-[#0099ff] rounded-md px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <i className={classNames("i-ph:arrows-clockwise", loading && "animate-spin")} />
              {loading ? 'Analyzing...' : 'Regenerate'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
            <span className="break-words">Couldn't regenerate: {error}. Showing your previous results.</span>
            <button onClick={() => fetchIntelligence(true)} className="shrink-0 px-3 py-1 bg-red-100 dark:bg-red-900/40 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Product Health", value: `${data.healthScore}%`, onClick: () => toggleTile('health') },
            { title: "Current Stage", value: data.stage || 'Validation', onClick: () => toggleTile('stage') },
            { title: "Segments", value: `${data.targetAudienceHeatmap?.length || 3}`, onClick: () => toggleTile('heatmap') },
            { title: "Missing Info", value: missingCount, onClick: () => toggleTile('missing') }
          ].map((kpi, i) => (
            <div key={i} onClick={kpi.onClick} className="bg-white dark:bg-[#292929] border border-gray-300 dark:border-gray-700 p-4 rounded-md cursor-pointer hover:border-blue-300 dark:hover:border-blue-900/50 transition-colors relative overflow-hidden group">
              {loading && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-[scanLine_2s_linear_infinite]" />}
              <div className="text-[13px] text-gray-500 font-medium mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{kpi.title}</div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white truncate">
                {loading ? (
                  <span className="text-blue-500 text-sm animate-pulse flex items-center gap-1.5 mt-1">
                    <i className="i-ph:sparkle animate-spin" /> Gen...
                  </span>
                ) : kpi.value}
              </div>
            </div>
          ))}
        </div>
        <IntelligenceDashboard workspaceId={workspaceId} />
        <DialogRoot open={!!expandedTile} onOpenChange={(open) => { if (!open) setExpandedTile(null); }}>
          {!!expandedTile && (
            <Dialog
              onClose={() => setExpandedTile(null)}
              onBackdrop={() => setExpandedTile(null)}
              className="!w-[800px] !h-[700px] !max-w-[95vw] !max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 flex-1 flex flex-col overflow-hidden">
                <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-[#1A1A1E] pb-4 flex-shrink-0">
                  {getDialogTitle()}
                </DialogTitle>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {expandedTile === 'health' && <ProductHealthTab healthScore={data.healthScore} sourcesUsed={data.sourcesUsed} />}
                  {expandedTile === 'stage' && <StageTab stage={data.stage} />}
                  {expandedTile === 'heatmap' && <TargetAudienceHeatmapTab data={data} />}
                  {expandedTile === 'matrix' && <CompetitorMatrixTab data={data} />}
                  {expandedTile === 'action' && <NextBestActionTab nextBestAction={data.nextBestAction} />}
                  {expandedTile === 'missing' && (
                    <MissingInfoTab
                      workspaceId={workspaceId}
                      missingInformation={data.missingInformation}
                      onDataUpdated={(updatedData) => setData(normalizeIntelligence(updatedData))}
                    />
                  )}
                  {expandedTile === 'funnel' && <AcquisitionFunnelTab data={data} />}
                </div>
              </div>
            </Dialog>
          )}
        </DialogRoot>
      </div>
    </div>
  );
}