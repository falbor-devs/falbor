'use client';
import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { WORK_DIR } from '~/utils/constants';

import type { Message } from 'ai';
import { diffLines } from 'diff';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { DiffView } from '~/components/workbench/DiffView';
import type { FileHistory } from '~/types/actions';
import { FileModifiedDropdown } from '~/components/workbench/FileModifiedDropdown';
import ReactMarkdown from 'react-markdown';

const AnalyzerActionItem = memo(({ action }: { action: any }) => {
  const openResearchView = () => {
    window.dispatchEvent(new CustomEvent('pan-to-research'));
  };

  return (
    <div className="flex flex-col w-full border border-falbor-elements-borderColor rounded-md overflow-hidden bg-falbor-elements-background-depth-1 my-2">
      <button
        onClick={openResearchView}
        className="flex items-center justify-between p-3 bg-falbor-elements-actions-background hover:bg-falbor-elements-background-depth-3 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:magnifying-glass-duotone text-falbor-elements-textSecondary text-lg" />
          <span className="text-sm font-medium text-falbor-elements-textPrimary">
            {action.title || 'Analysis & Research'}
          </span>
        </div>
        <div className="text-falbor-elements-textSecondary">
          <div className="i-ph:arrow-right" />
        </div>
      </button>
    </div>
  );
});

interface QuestionActionItemProps {
  action: any;
  value: { selectedOption: string; customText: string };
  onChange: (value: { selectedOption: string; customText: string }) => void;
  disabled?: boolean;
}

const QuestionActionItem = memo(({ action, value, onChange, disabled }: QuestionActionItemProps) => {
  let data: any = { title: action.title || 'Question', question: 'Error parsing question', options: [] };
  try {
    data = JSON.parse(action.content);
  } catch (e) {
    if (action.content) {
      data.question = action.content;
    }
  }

  return (
    <div className="flex flex-col w-full border border-falbor-elements-borderColor rounded-md overflow-hidden bg-falbor-elements-background-depth-1 my-2">
      <div className="flex items-center gap-2 p-3 bg-falbor-elements-actions-background border-b border-falbor-elements-borderColor">
        <div className="i-ph:question text-falbor-elements-textSecondary text-lg" />
        <span className="text-sm font-medium text-falbor-elements-textPrimary">
          {data.title || action.title || 'Question'}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-falbor-elements-textPrimary font-medium">{data.question}</p>

        <div className="flex flex-col gap-2 mt-2">
          {data.options?.map((opt: string, i: number) => (
            <label key={i} className="flex items-center gap-2 text-sm text-falbor-elements-textSecondary cursor-pointer">
              <input
                type="radio"
                name={`question-${(action as any).id || Math.random()}`}
                value={opt}
                checked={value.selectedOption === opt}
                onChange={() => onChange({ ...value, selectedOption: opt })}
                disabled={disabled}
                className="accent-falbor-elements-item-contentAccent"
              />
              <span>{opt}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-falbor-elements-textSecondary cursor-pointer">
            <input
              type="radio"
              name={`question-${(action as any).id || Math.random()}`}
              value="custom"
              checked={value.selectedOption === 'custom'}
              onChange={() => onChange({ ...value, selectedOption: 'custom' })}
              disabled={disabled}
              className="accent-falbor-elements-item-contentAccent"
            />
            <span>Other:</span>
            <input
              type="text"
              value={value.customText}
              onChange={(e) => {
                onChange({ selectedOption: 'custom', customText: e.target.value });
              }}
              disabled={disabled}
              className="ml-2 bg-transparent border-b border-falbor-elements-borderColor outline-none focus:border-falbor-elements-item-contentAccent flex-1"
              placeholder="Type your answer..."
            />
          </label>
        </div>
      </div>
    </div>
  );
});

interface ArtifactProps {
  messageId: string;
  artifactId: string;
  append?: (message: Message) => void;
  model?: string;
  provider?: string;
}

export const Artifact = memo(({ artifactId, messageId, append, model, provider }: ArtifactProps) => {
  const [allActionFinished, setAllActionFinished] = useState(false);



  const isHistoricalArtifact = useRef(workbenchStore.isReloadedMessage(messageId));

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[artifactId];
  const fileHistory = useStore(workbenchStore.fileHistory);
  const setFileHistory = (updater: React.SetStateAction<Record<string, FileHistory>>) => {
    if (typeof updater === 'function') {
      workbenchStore.fileHistory.set(updater(workbenchStore.fileHistory.get()));
    } else {
      workbenchStore.fileHistory.set(updater);
    }
  };
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  const actions = useStore(
    computed(artifact.runner.actions, (actions) => {

      return Object.values(actions).filter((action) => {

        return action.type !== 'supabase' && action.type !== 'question' && !(action.type === 'shell' && action.content?.includes('supabase'));
      });
    }),
  );

  const diffStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;

    const modifiedFiles = new Set(actions.filter(a => a.type === 'file').map(a => (a as any).filePath));

    modifiedFiles.forEach(filePath => {
      const history = fileHistory[filePath];
      if (history && history.originalContent !== undefined && history.versions.length > 0) {
        const latestContent = history.versions[history.versions.length - 1].content;
        const changes = diffLines(history.originalContent, latestContent);
        changes.forEach(change => {
          if (change.added) additions += change.count || 0;
          if (change.removed) deletions += change.count || 0;
        });
      } else {

        const action = actions.find(a => a.type === 'file' && (a as any).filePath === filePath);
        if (action && (action as any).content) {
          additions += (action as any).content.length;
        }
      }
    });

    return { additions, deletions, total: additions + deletions };
  }, [actions, fileHistory]);

  useEffect(() => {
    if (actions.length !== 0) {
      const finished = !actions.find(
        (action) => action.status !== 'complete' && !(action.type === 'start' && action.status === 'running'),
      );

      if (allActionFinished !== finished) {
        setAllActionFinished(finished);
      }
    }
  }, [actions, allActionFinished]);




  const dynamicTitle =
    artifact?.type === 'bundled'
      ? allActionFinished
        ? artifact.id === 'restored-project-setup'
          ? 'Project Restored'
          : 'Project Created'
        : artifact.id === 'restored-project-setup'
          ? 'Restoring Project...'
          : 'Creating Project...'
      : artifact?.title;

  return (
    <>
      <div className={classNames(
        "artifact border border-falbor-elements-borderColor border-r-0 border-t border-l flex flex-col overflow-hidden rounded-lg transition-all duration-150",
        showWorkbench ? "w-full" : "w-full"
      )}>
        <div className="flex">
          <button
            className="flex items-stretch bg-falbor-elements-artifacts-background w-full overflow-hidden"
            onClick={() => {
              const showWorkbench = workbenchStore.showWorkbench.get();
              workbenchStore.showWorkbench.set(!showWorkbench);
            }}
          >
            <div className="px-5 p-3.5 w-full text-left">
              <div className="w-full text-falbor-elements-textPrimary font-medium leading-5 text-sm flex items-center gap-2">
                { }
                <span>{dynamicTitle}</span>
                {diffStats.total > 0 && artifact.type !== 'bundled' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiffModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4 transition-colors cursor-pointer text-xs font-mono"
                  >
                    {diffStats.additions > 0 && <span className="text-[#28a745] font-medium">+{diffStats.additions}</span>}
                    {diffStats.deletions > 0 && <span className="text-[#cb2431] font-medium">-{diffStats.deletions}</span>}
                  </span>
                )}
              </div>
            </div>
          </button>

          {artifact.type !== 'bundled' && <div className="bg-falbor-elements-artifacts-borderColor w-[1px]" />}
        </div>
        {artifact.type === 'bundled' && (
          <div className="flex items-center gap-1.5 p-5 bg-falbor-elements-actions-background border-t border-falbor-elements-artifacts-borderColor">
            <div className={classNames('text-lg', getIconColor(allActionFinished ? 'complete' : 'running'))}>
              {allActionFinished ? (
                <div className="i-ph:check"></div>
              ) : (
                <div className="i-svg-spinners:90-ring-with-bg"></div>
              )}
            </div>
            <div className="text-falbor-elements-textPrimary font-medium leading-5 text-sm">
              { }
              {allActionFinished
                ? artifact.id === 'restored-project-setup'
                  ? 'Restore files from snapshot'
                  : 'Initial files created'
                : 'Creating initial files'}
            </div>
          </div>
        )}
        {artifact.type !== 'bundled' && actions.length > 0 && (
          <motion.div
            className="actions border-r border-falbor-elements-borderColor"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            { }
            <div className="px-4 text-left bg-falbor-elements-actions-background">
              <ActionList actions={actions} append={append} artifactId={artifactId} messageId={messageId} model={model} provider={provider} isHistorical={isHistoricalArtifact.current} />
            </div>
          </motion.div>
        )}
      </div>

      { }
      <DialogRoot open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <Dialog
          onClose={() => setDiffModalOpen(false)}
          onBackdrop={() => setDiffModalOpen(false)}
          className="w-[90vw] max-w-6xl !bg-falbor-elements-background-depth-1 border-falbor-elements-borderColor overflow-hidden"
        >
          <div className="h-[75vh] w-full max-h-[800px] flex flex-col relative">
            <DiffView fileHistory={fileHistory} setFileHistory={setFileHistory} />
          </div>
        </Dialog>
      </DialogRoot>
    </>
  );
});

interface ShellCodeBlockProps {
  classsName?: string;
  code: string;
}

function ShellCodeBlock({ classsName, code }: ShellCodeBlockProps) {
  return (
    <div
      className={classNames('text-xs', classsName)}
    >
      <pre className="bg-falbor-elements-background-depth-4 p-2 rounded overflow-x-auto">{code}</pre>
    </div>
  );
}

interface ActionListProps {
  actions: ActionState[];
  append?: (message: Message) => void;
  artifactId: string;
  messageId: string;
  model?: string;
  provider?: string;
  isHistorical?: boolean;
}

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function openArtifactInWorkbench(filePath: any) {
  if (workbenchStore.currentView.get() !== 'code') {
    workbenchStore.currentView.set('code');
  }

  workbenchStore.setSelectedFile(`${WORK_DIR}/${filePath}`);
}

const ActionList = memo(({ actions, append, artifactId, messageId, model, provider, isHistorical }: ActionListProps) => {
  const [answers, setAnswers] = useState<Record<string, { selectedOption: string; customText: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const storageKey = `falbor-answers-${artifactId}-${messageId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
        setSubmitted(true);
      } catch (e) {
        console.error('Failed to parse saved answers');
      }
    }
  }, [artifactId]);

  const handleAnswerChange = (actionId: string, value: { selectedOption: string; customText: string }) => {
    setAnswers(prev => ({ ...prev, [actionId]: value }));
  };

  const questionActions = actions.filter(a => a.type === 'question');
  const hasQuestions = questionActions.length > 0;

  const allAnswered = questionActions.every(a => {
    const ans = answers[(a as any).id || a.content];
    if (!ans) return false;
    if (!ans.selectedOption) return false;
    if (ans.selectedOption === 'custom' && !ans.customText) return false;
    return true;
  });

  const handleSubmitAll = () => {
    if (!append || !allAnswered) return;

    let combinedMessage = "Here are my answers:\n\n";

    questionActions.forEach(action => {
      let data: any = { question: 'Question' };
      try { data = JSON.parse(action.content); } catch (e) { data.question = (action as any).title || 'Question'; }

      const ans = answers[(action as any).id || action.content];
      const answerText = ans.selectedOption === 'custom' ? ans.customText : ans.selectedOption;

      combinedMessage += `**${data.title || data.question}**: ${answerText}\n`;
    });

    const modelTag = model ? `[Model: ${model}]\n\n` : '';
    const providerTag = provider ? `[Provider: ${provider}]\n\n` : '';

    append({
      role: 'user',
      content: `${modelTag}${providerTag}${combinedMessage}`,
      id: crypto.randomUUID()
    });
    setSubmitted(true);
    localStorage.setItem(storageKey, JSON.stringify(answers));
  }; const renderAction = (action: ActionState, index: number) => {
    const isLast = index === actions.length - 1;
    const { type, content } = action;

    const rawStatus = action.status;
    const status: ActionState['status'] = isHistorical ? 'complete' : rawStatus;

    if (type === 'analyzer') {
      return (
        <motion.li
          key={index}
          variants={actionVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <AnalyzerActionItem action={action} />
        </motion.li>
      );
    }

    if (type === 'question') {
      const actionId = (action as any).id || action.content;
      return (
        <motion.li
          key={index}
          variants={actionVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          <QuestionActionItem
            action={action}
            value={answers[actionId] || { selectedOption: '', customText: '' }}
            onChange={(val) => handleAnswerChange(actionId, val)}
            disabled={submitted}
          />
        </motion.li>
      );
    }

    return (
      <motion.li
        key={index}
        variants={actionVariants}
        initial="hidden"
        className='max-w-[445px]'
        animate="visible"
        transition={{
          duration: 0.2,
          ease: cubicEasingFn,
        }}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <div className={classNames('text-lg', getIconColor(status))}>
            {status === 'running' ? (
              <>
                {type !== 'start' ? (
                  <div className="i-svg-spinners:90-ring-with-bg"></div>
                ) : (
                  <div className="i-ph:terminal-window-duotone"></div>
                )}
              </>
            ) : status === 'pending' ? (
              <div className="i-ph:circle-duotone"></div>
            ) : status === 'complete' ? (
              <div className="i-ph:check"></div>
            ) : status === 'failed' || status === 'aborted' ? (
              <div className="i-ph:x"></div>
            ) : null}
          </div>
          {type === 'file' ? (
            <div>
              Create{' '}
              <code
                className="bg-falbor-elements-artifacts-inlineCode-background text-falbor-elements-artifacts-inlineCode-text px-1.5 py-1 rounded-md text-falbor-elements-item-contentAccent hover:underline cursor-pointer"
                onClick={() => openArtifactInWorkbench((action as any).filePath)}
              >
                {(action as any).filePath}
              </code>
            </div>
          ) : type === 'shell' ? (
            <div className="flex items-center w-full min-h-[28px]">
              <span className="flex-1">Run command</span>
            </div>
          ) : type === 'scan' ? (
            <div className="flex items-center w-full min-h-[28px]">
              <span className="flex-1 font-semibold text-[#8b5cf6]">Scanning codebase for errors...</span>
            </div>
          ) : type === 'start' ? (
            <a
              onClick={(e) => {
                e.preventDefault();
                workbenchStore.currentView.set('preview');
              }}
              className="flex items-center w-full min-h-[28px]"
            >
              <span className="flex-1">Run Files</span>
            </a>
          ) : null}
        </div>
        {(type === 'shell' || type === 'start' || type === 'scan') && (
          <ShellCodeBlock
            classsName={classNames('mt-1', {
              'mb-3.5': !isLast,
            })}
            code={content}
          />
        )}
      </motion.li>
    );
  };

  const fileAndOtherActions = actions.filter(a => a.type !== 'shell' && a.type !== 'start' && a.type !== 'scan' && a.type !== 'build');
  const commandActions = actions.filter(a => a.type === 'shell' || a.type === 'start' || a.type === 'scan' || a.type === 'build');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      {fileAndOtherActions.length > 0 && (
        <ul className="list-none space-y-2.5 mb-2.5">
          {fileAndOtherActions.map((action, index) => renderAction(action, index))}
        </ul>
      )}

      {commandActions.length > 0 && (
        <div className="flex flex-col mt-2 pt-2">
          <button
            onClick={() => setShowCommands(!showCommands)}
            className="flex items-center gap-1.5 text-xs text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors py-1 w-fit"
          >
            <div className={showCommands ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
            {showCommands ? 'See less' : 'See more'}
          </button>

          <AnimatePresence>
            {showCommands && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="list-none space-y-2.5 mt-3 mb-1">
                  {commandActions.map((action, index) => renderAction(action, fileAndOtherActions.length + index))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {hasQuestions && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitAll}
            disabled={submitted || !allAnswered}
            className={classNames(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              submitted
                ? "bg-falbor-elements-icon-success text-white"
                : "bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent hover:opacity-90 disabled:opacity-50"
            )}
          >
            {submitted ? 'Answers Submitted' : 'Submit Answers'}
          </button>
        </div>
      )}
    </motion.div>
  );
});

function getIconColor(status: ActionState['status']) {
  switch (status) {
    case 'pending': {
      return 'text-falbor-elements-textTertiary';
    }
    case 'running': {
      return 'text-falbor-elements-loader-progress';
    }
    case 'complete': {
      return 'text-falbor-elements-icon-success';
    }
    case 'aborted': {
      return 'text-falbor-elements-textSecondary';
    }
    case 'failed': {
      return 'text-falbor-elements-icon-error';
    }
    default: {
      return undefined;
    }
  }
}