'use client';

import React, { useEffect, useState, useRef } from 'react';
import classNames from 'classnames';
import { Slider } from '~/components/ui/Slider'; // Adjust path if needed

interface Competitor {
  name: string;
  domain: string | null;
  visibilityPct?: number;
  sovPct?: number;
}

interface ProductProfile {
  productName: string;
  domain: string | null;
  category: string;
}

interface ArenaEvidence {
  label: string;
  value: string;
  source?: string;
}

interface ArenaRound {
  id: string;
  categoryName: string;
  winner: 'A' | 'B' | 'TIE';
  winnerName: string;
  reasoning: string[];
  evidence: ArenaEvidence[];
  hasEnoughEvidence: boolean;
}

interface BattleResult {
  overallWinner: 'A' | 'B' | 'TIE';
  overallSummary: string;
  rounds: ArenaRound[];
}

interface BattleData {
  startupA: { name: string; domain: string | null };
  startupB: { name: string; domain: string | null };
  judges: string[];
  result: BattleResult;
}

const AVAILABLE_JUDGES = [
  { id: 'OpenAI', name: 'OpenAI', modelInfo: 'GPT-4o', icon: 'i-ph:robot-duotone' },
  { id: 'Anthropic', name: 'Anthropic', modelInfo: 'claude-haiku-4-5', icon: 'i-ph:brain-duotone' },
  { id: 'DeepSeek', name: 'DeepSeek', modelInfo: 'DeepSeek-V3', icon: 'i-ph:lightning-duotone' },
];

export function AiStartupArenaView({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [productProfile, setProductProfile] = useState<ProductProfile | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  const [selectedRivalName, setSelectedRivalName] = useState<string>('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningIndex, setSpinningIndex] = useState(0);

  const [selectedJudges, setSelectedJudges] = useState<string[]>(['OpenAI', 'Anthropic', 'DeepSeek']);

  const [battleState, setBattleState] = useState<'setup' | 'battling' | 'finished'>('setup');
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);

  const spinnerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadArenaSetup() {
      try {
        setLoading(true);
        const res = await fetch(`/api/workspace/${workspaceId}/competitors`);
        if (res.ok) {
          const json = await res.json();
          if (json.userProduct) {
            setProductProfile({
              productName: json.userProduct.name,
              domain: json.userProduct.domain,
              category: 'SaaS',
            });
          }
          const list: Competitor[] = (json.competitors || []).filter((c: any) => !c.isUserProduct);
          setCompetitors(list);
          if (list.length > 0) {
            setSelectedRivalName(list[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to load arena data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadArenaSetup();
  }, [workspaceId]);

  const toggleJudge = (judgeId: string) => {
    setSelectedJudges((prev) => {
      if (prev.includes(judgeId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== judgeId);
      }
      return [...prev, judgeId];
    });
  };

  const handleRandomSpinner = () => {
    if (competitors.length === 0 || isSpinning) return;
    setIsSpinning(true);

    let counter = 0;
    const totalTicks = 25 + Math.floor(Math.random() * 10);
    const intervalTime = 70;

    spinnerIntervalRef.current = setInterval(() => {
      counter++;
      const nextIdx = Math.floor(Math.random() * competitors.length);
      setSpinningIndex(nextIdx);
      setSelectedRivalName(competitors[nextIdx].name);

      if (counter >= totalTicks) {
        if (spinnerIntervalRef.current) clearInterval(spinnerIntervalRef.current);
        const finalIdx = Math.floor(Math.random() * competitors.length);
        setSpinningIndex(finalIdx);
        setSelectedRivalName(competitors[finalIdx].name);
        setIsSpinning(false);
      }
    }, intervalTime);
  };

  const handleStartBattle = async () => {
    if (!selectedRivalName && competitors.length > 0) {
      setSelectedRivalName(competitors[0].name);
    }

    const rivalObj = competitors.find((c) => c.name === selectedRivalName) || competitors[0];
    if (!rivalObj) return;

    try {
      setBattleLoading(true);
      setBattleState('battling');
      setActiveRoundIndex(0);

      const res = await fetch(`/api/workspace/${workspaceId}/games/arena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startupA: {
            name: productProfile?.productName || 'Your Startup',
            domain: productProfile?.domain || null,
          },
          startupB: {
            name: rivalObj.name,
            domain: rivalObj.domain || null,
          },
          judges: selectedJudges,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBattleData(data);
        setBattleState('finished');
      } else {
        setBattleState('setup');
      }
    } catch (err) {
      console.error('Battle failed:', err);
      setBattleState('setup');
    } finally {
      setBattleLoading(false);
    }
  };

  const copyShareableSummary = () => {
    if (!battleData) return;
    const nameA = battleData.startupA.name;
    const nameB = battleData.startupB.name;
    const winner =
      battleData.result.overallWinner === 'A'
        ? nameA
        : battleData.result.overallWinner === 'B'
          ? nameB
          : 'TIE';
    const text = `🏆 Falbor AI Startup Arena Battle
${nameA} VS ${nameB}
Winner: ${winner}
Evaluated across ${battleData.result.rounds.length} AI categories by ${battleData.judges.join(', ')}.`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (loading) {
    return (
      <div className="w-full h-full p-6 animate-pulse flex flex-col gap-6">
        <div className="h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const nameA = productProfile?.productName || 'Your Startup';
  const selectedRival = competitors.find((c) => c.name === selectedRivalName) || competitors[0];

  // Prepare Slider options from rounds
  const roundSliderOptions =
    battleData?.result.rounds.map((round, idx) => ({
      value: idx,
      text: `R${idx + 1}: ${round.categoryName}`,
      icon: undefined as string | undefined,
    })) || [];

  // Build SliderOptions shape for the component (left / middle / right / extra / extra2)
  // Since we can have many rounds, we map the active one and use a simplified approach
  // For true multi-option we keep the horizontal scroll of buttons, but style them professionally.
  // Here we use the Slider for a clean selected state when possible.

  return (
    <div className="w-full p-6 h-full overflow-y-auto flex flex-col gap-6 font-sans bg-white dark:bg-[#121215]">
      {/* Header */}
      <div className="flex items-center justify-between border border-gray-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl text-gray-900 dark:text-white">
                AI Startup Arena
              </h1>
              <span className="text-[10px] font-bold bg-[#0099ff]/15 text-[#0099ff] dark:bg-[#0099ff]/20 dark:text-[#0099ff] px-2 py-0.5 rounded-full">
                Interactive Battle
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pit your startup head-to-head against category rivals evaluated live by AI model judges.
            </p>
          </div>
        </div>
        {battleState === 'finished' && (
          <button
            onClick={() => setBattleState('setup')}
            className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <i className="i-ph:arrow-left" />
            <span>New Battle Setup</span>
          </button>
        )}
      </div>

      {/* ========== SETUP STATE ========== */}
      {battleState === 'setup' && (
        <div className="space-y-6 mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Startup A Card */}
            <div className="p-6 border border-gray-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Startup A (Your Product)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0099ff] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {nameA[0]}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{nameA}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {productProfile?.domain || 'Ground truth workspace'}
                  </div>
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex w-10 h-10 rounded-full bg-[#0099ff] text-white font-black text-sm items-center justify-center border-4 border-white dark:border-[#121215] shadow-md">
              VS
            </div>

            {/* Startup B Card */}
            <div
              className={classNames(
                'p-6 border rounded-2xl space-y-4 transition-all duration-150 bg-white dark:bg-zinc-900/50 shadow-sm',
                isSpinning
                  ? 'border-[#0099ff] shadow-md shadow-[#0099ff]/20 scale-[1.01]'
                  : 'border-gray-200 dark:border-zinc-800'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Startup B (Rival)
                </span>
                <button
                  type="button"
                  onClick={handleRandomSpinner}
                  disabled={isSpinning || competitors.length === 0}
                  className="px-3 py-1 bg-[#0099ff]/20 text-[#0099ff] text-[13px] rounded-md flex items-center gap-1.5 hover:bg-[#0099ff]/30 transition-colors disabled:opacity-50"
                >
                  <i className={classNames('i-ph:arrows-clockwise-bold text-sm', isSpinning && 'animate-spin')} />
                  <span>Random Competitors</span>
                </button>
              </div>

              {selectedRival ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedRival.domain && !failedFavicons[selectedRival.name] ? (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${selectedRival.domain}&sz=64`}
                        alt=""
                        className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-gray-200 dark:border-zinc-800 shrink-0"
                        onError={() =>
                          setFailedFavicons((prev) => ({ ...prev, [selectedRival.name]: true }))
                        }
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0099ff] text-white font-bold text-lg flex items-center justify-center shrink-0">
                        {selectedRival.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-base font-extrabold text-gray-900 dark:text-white truncate">
                        {selectedRival.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {selectedRival.domain || 'Competitors Table Rival'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 italic border border-dashed border-gray-300 dark:border-zinc-800 rounded-xl">
                  No competitors loaded from Competitors page.
                </div>
              )}

              {competitors.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Choose From Workspace Competitors Table
                  </label>
                  <select
                    value={selectedRivalName}
                    onChange={(e) => setSelectedRivalName(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0099ff]"
                  >
                    {competitors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.domain || 'Workspace Rival'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Judges Panel */}
          <div className="p-6 bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Select AI Judges Panel
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AVAILABLE_JUDGES.map((judge) => {
                const isSelected = selectedJudges.includes(judge.id);
                return (
                  <button
                    key={judge.id}
                    onClick={() => toggleJudge(judge.id)}
                    className={classNames(
                      'p-4 rounded-xl border text-left flex items-center justify-between transition-all',
                      isSelected
                        ? 'border-[#0099ff] bg-[#0099ff]/10 dark:bg-[#0099ff]/15 text-gray-900 dark:text-white shadow-sm'
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <i className={classNames(judge.icon, 'text-2xl text-[#0099ff]')} />
                      <div>
                        <div className="text-sm font-extrabold">{judge.name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          {judge.modelInfo}
                        </div>
                      </div>
                    </div>
                    {isSelected && <i className="i-ph:check-circle-fill text-[#0099ff] text-lg" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Battle Button */}
          <button
            onClick={handleStartBattle}
            disabled={battleLoading || isSpinning}
            className="w-full py-3 bg-[#0099ff]/20 text-[#0099ff] hover:bg-[#0099ff]/30 rounded-xl text-base font-semibold flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
          >
            {battleLoading ? (
              <>
                <i className="i-ph:spinner animate-spin text-lg" />
                <span>AI Models Evaluating Arena Battle...</span>
              </>
            ) : (
              <>
                <i className="i-ph:swords-bold text-lg" />
                <span>Commence AI Startup Battle</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ========== BATTLING STATE ========== */}
      {battleState === 'battling' && (
        <div className="flex flex-col items-center justify-center p-12 space-y-6 max-w-2xl mx-auto w-full text-center my-auto">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#0099ff]/30 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-[#0099ff]/20 text-[#0099ff] border border-[#0099ff]/40 flex items-center justify-center text-2xl font-bold animate-pulse">
              <i className="i-ph:sword-bold text-3xl" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Startup Battle in Progress...
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              AI Model Panel ({selectedJudges.join(', ')}) is evaluating{' '}
              <span className="font-bold text-gray-900 dark:text-white">{nameA}</span> vs{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {selectedRival?.name || 'Rival'}
              </span>{' '}
              across 9 competitive intelligence categories.
            </p>
          </div>

          <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden max-w-md">
            <div className="h-full bg-[#0099ff] animate-pulse w-3/4 rounded-full" />
          </div>
        </div>
      )}

      {/* ========== FINISHED STATE ========== */}
      {battleState === 'finished' && battleData && (
        <div className="space-y-8 max-w-5xl mx-auto w-full">
          {/* Championship Result Card – clean professional look, no rainbow gradient */}
          <div className="relative p-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0099ff]/15 text-[#0099ff] text-xs font-bold uppercase tracking-widest">
              <i className="i-ph:trophy-bold" />
              <span>Arena Championship Result</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {battleData.startupA.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {battleData.startupA.domain || 'Startup A'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#0099ff] text-white font-black text-xl flex items-center justify-center shadow-sm">
                VS
              </div>
              <div className="text-left">
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {battleData.startupB.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {battleData.startupB.domain || 'Startup B'}
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
                Overall Winner
              </div>
              <div className="text-3xl font-black text-[#0099ff] mt-1 flex items-center justify-center gap-2">
                <i className="i-ph:crown-bold" />
                <span>
                  {battleData.result.overallWinner === 'A'
                    ? battleData.startupA.name
                    : battleData.result.overallWinner === 'B'
                      ? battleData.startupB.name
                      : 'Tie Match'}
                </span>
              </div>
            </div>

            <div className="max-w-2xl mx-auto text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
              {battleData.result.overallSummary}
            </div>
          </div>

          {/* Category Round Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
              Category Round Breakdown ({battleData.result.rounds.length} Rounds)
            </h3>

            {/* Professional horizontal selector using the existing Slider pattern + clean buttons */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {battleData.result.rounds.map((round, idx) => {
                const isActive = activeRoundIndex === idx;
                return (
                  <button
                    key={round.id || idx}
                    onClick={() => setActiveRoundIndex(idx)}
                    className={classNames(
                      'px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 border transition-all',
                      isActive
                        ? 'bg-[#0099ff]/20 text-[#0099ff] border-[#0099ff]/40 shadow-sm'
                        : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                    )}
                  >
                    <span>
                      R{idx + 1}: {round.categoryName}
                    </span>
                    <span
                      className={classNames(
                        'px-1.5 py-0.5 rounded text-[10px] font-extrabold',
                        round.winner === 'A'
                          ? 'bg-[#0099ff]/20 text-[#0099ff]'
                          : round.winner === 'B'
                            ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-200'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                      )}
                    >
                      {round.winner === 'A' ? 'A' : round.winner === 'B' ? 'B' : 'TIE'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Round Detail Card */}
            {battleData.result.rounds[activeRoundIndex] && (
              <div className="p-6 bg-white dark:bg-zinc-900/70 border border-gray-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
                  <div>
                    <span className="text-xs text-[#0099ff] font-bold uppercase tracking-wider">
                      Round {activeRoundIndex + 1}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {battleData.result.rounds[activeRoundIndex].categoryName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Round Winner:</span>
                    <span className="px-3 py-1 bg-[#0099ff]/20 text-[#0099ff] font-extrabold text-xs rounded-full">
                      {battleData.result.rounds[activeRoundIndex].winnerName}
                    </span>
                  </div>
                </div>

                {!battleData.result.rounds[activeRoundIndex].hasEnoughEvidence ? (
                  <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
                    Not enough evidence yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Key Factual Reasons
                      </h5>
                      <ul className="space-y-2">
                        {battleData.result.rounds[activeRoundIndex].reasoning.map((r, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2"
                          >
                            <i className="i-ph:check-circle-fill text-[#0099ff] text-base shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {battleData.result.rounds[activeRoundIndex].evidence?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Supporting Evidence
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {battleData.result.rounds[activeRoundIndex].evidence.map((ev, i) => (
                            <div
                              key={i}
                              className="p-3 bg-gray-50 dark:bg-zinc-950/50 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs space-y-1"
                            >
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {ev.label}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">{ev.value}</div>
                              {ev.source && (
                                <div className="text-[10px] text-[#0099ff] truncate">
                                  Source: {ev.source}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shareable Victory Card */}
          <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-gray-900 dark:text-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="i-ph:share-network-duotone text-[#0099ff] text-lg" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Shareable Arena Victory Card
                </h4>
              </div>
              <button
                onClick={copyShareableSummary}
                className="px-3 py-1.5 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <i className={copiedShare ? 'i-ph:check-bold' : 'i-ph:copy-bold'} />
                <span>{copiedShare ? 'Copied to Clipboard!' : 'Copy Victory Card'}</span>
              </button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-zinc-950/60 rounded-xl border border-gray-200 dark:border-zinc-800 font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              <div>🏆 Falbor AI Startup Arena Match Result</div>
              <div className="text-[#0099ff] font-bold mt-1">
                {battleData.startupA.name} VS {battleData.startupB.name}
              </div>
              <div>
                Winner:{' '}
                {battleData.result.overallWinner === 'A'
                  ? battleData.startupA.name
                  : battleData.result.overallWinner === 'B'
                    ? battleData.startupB.name
                    : 'Tie'}
              </div>
              <div className="text-gray-500 mt-2 text-[10px]">
                Evaluated by {battleData.judges.join(', ')} across {battleData.result.rounds.length} AI
                categories.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}