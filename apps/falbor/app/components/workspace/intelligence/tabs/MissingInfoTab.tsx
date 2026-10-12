import React, { useState } from 'react';
import classNames from 'classnames';
import { answerMissingInfoQuestion, generateAutoAnswerMap, autoAnswerMissingInfo } from '~/lib/actions/intelligence';
import { Textarea } from '~/components/visual-editor/ui/textarea';
import { Badge } from '~/components/ui';

interface MissingInfoTabProps {
  workspaceId: string;
  missingInformation: string[];
  onDataUpdated: (newData: any) => void;
}

export function MissingInfoTab({ workspaceId, missingInformation, onDataUpdated }: MissingInfoTabProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestion, setLoadingQuestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [hasAiGenerated, setHasAiGenerated] = useState(false);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  const handleAnswerSubmit = async (question: string) => {
    const text = (answers[question] || '').trim();
    if (!text) return;
    setLoadingQuestion(question);
    try {
      const updatedIntel = await answerMissingInfoQuestion(workspaceId, question, text);
      onDataUpdated(updatedIntel);
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[question];
        return next;
      });
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setLoadingQuestion(null);
    }
  };

  const handleAiAutoAnswer = async () => {
    setAiLoading(true);
    try {
      const generatedAnswers = await generateAutoAnswerMap(workspaceId);
      setAnswers((prev) => ({ ...prev, ...generatedAnswers }));
      setHasAiGenerated(true);
    } catch (err) {
      console.error('Failed to auto answer with AI:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnswerAll = async () => {
    setIsSubmittingAll(true);
    try {
      let updatedIntel = null;
      for (const question of missingInformation) {
        const text = (answers[question] || '').trim();
        if (text) {
          updatedIntel = await answerMissingInfoQuestion(workspaceId, question, text);
        }
      }
      if (!updatedIntel) {
        updatedIntel = await autoAnswerMissingInfo(workspaceId);
      }
      onDataUpdated(updatedIntel);
      setAnswers({});
      setHasAiGenerated(false);
    } catch (err) {
      console.error('Failed to answer all questions:', err);
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, question: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasAiGenerated) {
        handleAnswerAll();
      } else {
        handleAnswerSubmit(question);
      }
    }
  };

  if (!missingInformation || missingInformation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-3">
          <i className="i-ph:check-circle-bold text-2xl" />
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Action Completed</h4>
        <p className="text-xs text-gray-500 max-w-sm">
          All missing information questions have been answered. The workspace knowledge base is fully updated.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#1A1A1E] pb-4">
        <p className="text-xs text-gray-500 mt-0.5">
          Answer the questions below to enrich the AI agent&apos;s knowledge base.
          <span className="bg-red-200 dark:bg-red-800 text-red-600 dark:text-black">
            We recommend answering these questions yourself rather than using AI, because you know your project better than AI does.
          </span>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group flex items-center gap-1.5 border dark:border-gray-700 p-1 rounded-md">
            <button
              onClick={handleAiAutoAnswer}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-[#0099ff]/20 rounded-sm text-[#0099ff] flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className={classNames('i-ph:sparkle-fill', aiLoading && 'animate-spin')} />
              <span>{aiLoading ? 'Auto-Answering...' : 'AI Auto Answer'}</span>
            </button>

            {hasAiGenerated ? (
              <button
                onClick={handleAnswerAll}
                disabled={isSubmittingAll}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <i className={classNames('i-ph:check-circle-bold', isSubmittingAll && 'animate-spin')} />
                <span>{isSubmittingAll ? 'Submitting All...' : 'Answer All'}</span>
              </button>
            ) : (
              <Badge variant="secondary">
                Beta
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {missingInformation.map((q, idx) => {
          const text = answers[q] || '';
          const isSubmitting = loadingQuestion === q;

          return (
            <div
              key={idx}
              className="bg-white dark:bg-[#111114] flex flex-col gap-3 px-2"
            >
              <div className="flex items-start gap-2.5 mt-2">
                <p className="text-sm text-gray-900 dark:text-white leading-snug">{q}</p>
              </div>

              <div className="flex flex-col">
                <Textarea
                  value={text}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                  onKeyDown={(e) => handleKeyDown(e, q)}
                  placeholder="Type your answer here..."
                  className='dark:bg-black dark:border-gray-700'
                  rows={2}
                />

                <div className="flex justify-end mt-2 mb-2">
                  <button
                    onClick={() => handleAnswerSubmit(q)}
                    disabled={!text.trim() || isSubmitting}
                    className="px-3 py-1 bg-[#0099ff]/20 disabled:bg-gray-200 dark:disabled:bg-gray-800 text-[#0099ff] disabled:text-gray-400 rounded-lg text-xs font-medium shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="i-ph:spinner-gap animate-spin text-xs" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="i-ph:paper-plane-right-fill text-xs" />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
