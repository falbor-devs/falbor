'use client';

import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { useStore } from '@nanostores/react';
import { aiSidebarStore, AIEvent } from '~/lib/stores/aiSidebar';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { CodeMirrorEditor } from '~/components/editor/codemirror/CodeMirrorEditor';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { Textarea } from '../visual-editor/ui/textarea';
import { ToolInvocations } from '~/components/chat/messages/ToolInvocations';
import { MCP_CONNECTORS } from '~/components/@settings/tabs/mcp/connectors';
import { canvasActions } from '~/lib/stores/canvasStore';

type EventLink = { url: string; title: string; favicon?: string };

const statusIcon = (status: AIEvent['status']) => {
  switch (status) {
    case 'active':
      return 'i-ph:circle-notch animate-spin text-blue-500';
    case 'error':
      return 'i-ph:warning-circle-duotone text-red-500';
    case 'pending':
      return 'i-ph:circle-dashed text-gray-400';
    default:
      return 'i-ph:check-circle-duotone text-green-500';
  }
};

const LinkCard = ({ link }: { link: EventLink }) => {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 p-2 rounded-md bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/40 transition-colors border border-gray-200 dark:border-gray-800"
    >
      {link.favicon ? (
        <img src={link.favicon} alt="" className="w-4 h-4 rounded-sm" />
      ) : (
        <i className="i-ph:link-simple text-gray-400" />
      )}
      <span className="text-xs text-blue-600 dark:text-blue-400 truncate flex-1">{link.title}</span>
    </a>
  );
};

export const EventItem = ({ event }: { event: AIEvent }) => {
  const [expanded, setExpanded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState<'like' | 'dislike'>('like');
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const busy = useStore(aiSidebarStore.isActive);

  useEffect(() => {
    if (typeof window !== 'undefined' && event.id) {
      const saved = localStorage.getItem(`falbor_feedback_${event.id}`);
      setLiked(saved === 'like' ? true : saved === 'dislike' ? false : null);
    }
  }, [event.id]);

  if (event.type === 'user') {
    const userMCPs = (event as any).selectedMCPs || [];

    return (
      <div className="flex flex-col items-start mb-2.5 w-full">
        {userMCPs.length > 0 && (
          <div className="flex flex-wrap items-center justify-start gap-1 mb-1.5 w-full">
            {userMCPs.map((mcpId: string) => {
              const connector = MCP_CONNECTORS.find((c) => c.id === mcpId);
              return (
                <span
                  key={mcpId}
                  className="inline-flex items-center gap-1.5 bg-[#0099ff]/15 text-[#0099ff] border border-[#0099ff]/30 rounded-md px-2 py-1 text-xs font-medium shadow-sm"
                >
                  {connector?.logo && <img src={connector.logo} className="w-3.5 h-3.5 object-contain shrink-0" alt="" />}
                  <span>@{connector?.name || mcpId}</span>
                </span>
              );
            })}
          </div>
        )}
        <div className="border border-gray-300 dark:border-gray-800 text-black dark:text-white p-2.5 rounded-md text-sm w-full">
          <p className="">{event.title}</p>
          {(event.details || []).map((d, i) => (
            <p key={i} className="text-xs text-black/70 dark:text-white/70 mt-1">
              {d}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (event.type === 'button') {
    const clickable = event.status === 'pending' && !busy;
    return (
      <div className="flex my-1">
        <button
          disabled={!clickable}
          onClick={() => {
            if (event.action?.startsWith('LOCAL:CANVAS_LOCATE:')) {
              const [, , x, y] = event.action.split(':');
              canvasActions.focus(Number(x), Number(y));
            } else {
              aiSidebarStore.updateEvent(event.id, { status: 'completed' });
              sendAgentMessage(event.action || event.title);
            }
          }}
          className={classNames(
            'px-3 py-1 rounded-lg text-xs shadow-sm transition-all flex items-center gap-1.5',
            clickable
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-default',
          )}
        >
          <i className="i-ph:play-fill text-xs" />
          <span>{event.title}</span>
        </button>
      </div>
    );
  }

  if (event.type === 'progress') {
    const pct = typeof event.progressValue === 'number' ? event.progressValue : 100;
    return (
      <div className="flex flex-col gap-1 my-1 w-full max-w-[90%]">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{event.title}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (event.type === 'options') {
    if (event.status === 'pending') return null;
    return <div className="text-xs text-gray-400 px-2 mb-1">{event.title}</div>;
  }

  if (event.type === 'links') {
    return (
      <div className="flex flex-col gap-1.5 my-1 max-w-[95%]">
        {(event.links || []).map((link, idx) => (
          <LinkCard key={idx} link={link} />
        ))}
      </div>
    );
  }

  if (event.type === 'browser') {
    const session = event.browserSession;
    const isFinished = session?.isFinished || event.status === 'completed';

    return (
      <div className="flex flex-col my-3 max-w-full w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-md transition-all">
        {/* Browser Top Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
            <span className="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <i className="i-ph:globe-duotone text-blue-500" />
              {event.title || 'Browser Use MicroVM'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {session?.recordingUrl && (
              <a
                href={session.recordingUrl}
                download="browser-recording.mp4"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium shadow-sm"
              >
                <i className="i-ph:download-simple-bold text-xs" />
                <span>Download Video</span>
              </a>
            )}
            <span
              className={classNames(
                'text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1',
                isFinished
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse'
              )}
            >
              <i className={classNames('text-xs', isFinished ? 'i-ph:check-circle-fill' : 'i-ph:circle-notch animate-spin')} />
              {isFinished ? 'Completed' : 'Live Browser'}
            </span>
          </div>
        </div>

        {/* Minified Browser Info */}
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <i className="i-ph:globe-duotone text-4xl text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 mb-4 text-center">
            Browser session is active.
          </p>
          <button
            onClick={() => {
              import('~/lib/stores/aiSidebar').then(({ aiSidebarStore }) => {
                aiSidebarStore.isBrowserOpen.set(true);
              });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            Open Full Browser View
          </button>
        </div>
      </div>
    );
  }

  if (event.type === 'widget') {
    return (
      <div className="flex flex-col my-2 max-w-full w-full">
        <div
          className="p-1 text-sm overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: event.html || '' }}
        />
        <div className="flex justify-end mt-1">
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 transition-colors"
          >
            <i className="i-ph:code-bold text-xs" />
            <span>{showCode ? 'Hide Code' : 'View Code'}</span>
          </button>
        </div>
        {showCode && (
          <div className="mt-1.5 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm max-h-[350px]">
            <CodeMirrorEditor
              theme="dark"
              editable={false}
              doc={{
                value: event.html || '',
                isBinary: false,
                filePath: 'widget.html',
              }}
              settings={{ fontSize: '12px' }}
            />
          </div>
        )}
      </div>
    );
  }

  if ((event as any).type === 'summary_preview') {
    const safeHtml = (event.html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '').replace(/javascript:/gi, '');
    return (
      <div className="my-3 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-white">{event.title || 'Summary preview'}</div>
        <div className="p-4 text-sm text-gray-800 dark:text-gray-200" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    );
  }

  if ((event as any).type === 'tool' || (event as any).toolInvocations) {
    return (
      <div className="my-2 max-w-full">
        <ToolInvocations
          toolInvocations={(event as any).toolInvocations || []}
          toolCallAnnotations={(event as any).toolCallAnnotations || []}
          addToolResult={({ toolCallId, result }) => {
            console.log('[Agent Tool Result]:', toolCallId, result);
          }}
        />
      </div>
    );
  }

  if (event.type === 'text' || event.type === 'chat') {
    let textContent = event.title || '';
    textContent = textContent.replace(/```(?:json)?\s*\{\s*"OPTIONS":\s*\[[\s\S]*?\]\s*\}\s*```/gi, '');
    textContent = textContent.replace(/OPTIONS:\s*\[[\s\S]*?\]/gi, '');
    textContent = textContent.replace(/QUESTION:\s*"[^"]*"/gi, '');
    textContent = textContent.replace(/```[\s\S]*?```/gi, '');
    // Strip any HTML markup and its inner text content if it looks like embedded widget HTML code
    textContent = textContent.replace(/<([a-z1-6]+)[^>]*>[\s\S]*?<\/\1>/gi, '');
    textContent = textContent.replace(/<[^>]+>/g, '');
    textContent = textContent.replace(/^\s*[\r\n]+/gm, '\n');
    textContent = textContent.trim();

    // Extract video file URLs vs live session URLs separately
    const rawMatches = event.title.match(/https?:\/\/[^\s\)\>]+/gi) || [];
    const directVideos = rawMatches.filter((url) =>
      /\.(?:mp4|webm)/i.test(url) ||
      (/browser-use\.com/i.test(url) && (url.includes('recording') || url.includes('/v2/sessions/')))
    );

    if (!textContent && !directVideos.length) return null;

    const handleCopy = () => {
      if (textContent) {
        navigator.clipboard.writeText(textContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const handleOpenFeedback = (rating: 'like' | 'dislike') => {
      setPendingRating(rating);
      setFeedbackText('');
      setFeedbackModalOpen(true);
    };

    const handleSubmitFeedback = async () => {
      setSubmittingFeedback(true);
      try {
        const workspaceId = aiSidebarStore.currentWorkspaceId.get() || null;
        await fetch('/api/intelligence/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: event.id,
            workspaceId,
            rating: pendingRating,
            feedbackText: feedbackText.trim() || null,
          }),
        });
        const isLike = pendingRating === 'like';
        setLiked(isLike);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`falbor_feedback_${event.id}`, pendingRating);
        }
      } catch (err) {
        console.error('Failed to submit feedback:', err);
      } finally {
        setSubmittingFeedback(false);
        setFeedbackModalOpen(false);
      }
    };

    return (
      <div className="flex flex-col justify-start mb-2 max-w-[95%]">
        {textContent && (
          <div
            className={classNames(
              'p-2 text-sm leading-relaxed whitespace-pre-wrap',
              event.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white',
            )}
          >
            {textContent.split(/(\[Skill:\s*[a-zA-Z0-9_-]+\])/g).map((part, i) => {
              const skillMatch = part.match(/\[Skill:\s*([a-zA-Z0-9_-]+)\]/);
              if (skillMatch) {
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-md px-1.5 py-0.5 text-xs font-medium mx-1"
                  >
                    <i className="i-ph:magic-wand text-xs" />
                    <span>{skillMatch[1]}</span>
                  </span>
                );
              }
              return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
          </div>
        )}

        {/* HTML5 Video Players for recordings */}
        {directVideos.map((vidUrl, idx) => (
          <div key={idx} className="my-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md max-w-full bg-black">
            <video
              src={vidUrl}
              controls
              autoPlay
              muted
              playsInline
              className="w-full max-h-[320px] rounded-lg object-contain bg-black"
            >
              <source src={vidUrl} type="video/mp4" />
              Your browser does not support playing this video format.
            </video>
            <div className="p-2 bg-gray-900 flex justify-end">
              <a
                href={vidUrl}
                download="browser-action.mp4"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                <i className="i-ph:download-simple-bold" />
                <span>Download Clip</span>
              </a>
            </div>
          </div>
        ))}

        {/* Action Toolbar: Like, Dislike, Copy */}
        {event.status !== 'active' && textContent && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => handleOpenFeedback('like')}
              title="Like response"
              className={classNames(
                'p-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1',
                liked === true
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <i className={classNames('text-base', liked === true ? 'i-ph:thumbs-up-fill text-blue-600' : 'i-ph:thumbs-up')} />
            </button>

            <button
              onClick={() => handleOpenFeedback('dislike')}
              title="Dislike response"
              className={classNames(
                'p-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1',
                liked === false
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 font-medium'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <i className={classNames('text-base', liked === false ? 'i-ph:thumbs-down-fill text-red-600' : 'i-ph:thumbs-down')} />
            </button>

            <button
              onClick={handleCopy}
              title="Copy message"
              className="p-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <i className={classNames('text-base', copied ? 'i-ph:check text-green-500' : 'i-ph:copy')} />
              {copied && <span className="text-xs text-green-500 font-medium">Copied!</span>}
            </button>
          </div>
        )}

        {/* Centered Feedback Dialog Modal */}
        <DialogRoot open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
          <Dialog showCloseButton onClose={() => setFeedbackModalOpen(false)}>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <i
                  className={classNames(
                    'text-xl',
                    pendingRating === 'like' ? 'i-ph:thumbs-up-fill text-blue-500' : 'i-ph:thumbs-down-fill text-red-500'
                  )}
                />
                <DialogTitle>
                  {pendingRating === 'like' ? 'Provide Positive Feedback' : 'Report an Issue with Response'}
                </DialogTitle>
              </div>

              <DialogDescription>
                Help us improve Falbor AI by sharing your feedback on this message.
              </DialogDescription>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Feedback details (optional)
                </label>
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={
                    pendingRating === 'like'
                      ? 'Tell us what was helpful about this answer...'
                      : 'Tell us what went wrong or how this response could be improved...'
                  }
                  rows={4}
                  className='dark:bg-black dark:border-gray-900 dark:border'
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Once submitted, our team will review your feedback along with this message.
              </p>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setFeedbackModalOpen(false)}
                  disabled={submittingFeedback}
                  className='text-sm dark:text-white'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submittingFeedback}
                  className='bg-[#0099ff]/20 text-[#0099ff] text-sm px-2 py-1 rounded-lg'
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </Dialog>
        </DialogRoot>
      </div>
    );
  }

  const isActive = event.status === 'active';
  const visibleDetails = (event.details || []).filter((d) => d.trim() !== '');
  const links = event.links || [];
  const hasDetails = visibleDetails.length > 0 || links.length > 0;

  return (
    <div className="flex flex-col rounded-md overflow-hidden mb-0.5 transition-all duration-200">
      <div
        className={classNames(
          'flex items-center justify-between py-1 px-2 rounded-md',
          hasDetails ? 'cursor-pointer hover:bg-gray-100/60 dark:hover:bg-white/5' : '',
        )}
        onClick={() => {
          if (hasDetails) setExpanded(!expanded);
        }}
      >
        <div className="flex items-center gap-2">
          {hasDetails && (
            <i
              className={classNames(
                'i-ph:caret-down text-gray-400 text-xs transition-transform duration-300',
                expanded ? 'rotate-180' : '',
              )}
            />
          )}
          <i className={classNames('text-base', statusIcon(event.status))} />
          <span className="text-xs font-medium">
            {isActive ? (
              <TextShimmer duration={2}>{event.title}</TextShimmer>
            ) : (
              <span
                className={classNames(
                  event.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200',
                )}
              >
                {event.title}
              </span>
            )}
          </span>
        </div>
        {hasDetails && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-2 shrink-0">
            {expanded ? 'Hide info' : 'View info'}
          </span>
        )}
      </div>

      <div
        className={classNames(
          'overflow-hidden transition-all duration-300',
          expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="p-3 pt-0">
          {visibleDetails.length > 0 && (
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2 mt-2">
              {visibleDetails.map((detail, idx) => (
                <li key={idx} className="flex gap-2 items-start">
                  <i className="i-ph:check text-green-500 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{detail}</span>
                </li>
              ))}
            </ul>
          )}

          {links.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {links.map((link, idx) => (
                <LinkCard key={idx} link={link} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FALBOR_SUGGESTIONS = [
  {
    icon: 'i-ph:briefcase',
    label: 'What should I work on today?',
    prompt: 'Analyze current workspace progress and tell me what high-impact tasks I should work on today.',
  },
  {
    icon: 'i-ph:note-pencil',
    label: 'Draft my weekly status update',
    prompt: 'Draft a concise, professional weekly progress status update based on my product intelligence.',
  },
  {
    icon: 'i-ph:book-open',
    label: 'How do I work with Falbor?',
    prompt: 'Explain what you can do for me as my AI Cofounder agent and how we can work together.',
  },
];

export const AgentMessages = ({ events, isActive }: { events: AIEvent[]; isActive: boolean }) => {
  const currentAgent = useStore(aiSidebarStore.currentAgent);

  const handleSuggestionClick = (prompt: string) => {
    sendAgentMessage(prompt);
  };

  const agentName = currentAgent?.name || 'Falbor';
  const agentDesc =
    currentAgent?.instructions ||
    currentAgent?.goal ||
    "I'll help you stay on top of your work in Falbor by flagging what matters, surfacing what's next, and jumping in when you need a hand.";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
      <div className="mt-auto w-full max-w-[480px] mx-auto p-3">
        {events.length === 0 && !isActive ? (
          <div className="flex flex-col items-start text-left py-2 px-1 w-full animate-fade-in">
            {/* Logo / Agent Avatar on left */}
            <div className="mb-4">
              {currentAgent?.avatarUrl ? (
                <img className="w-10 h-10 rounded-full object-cover" src={currentAgent.avatarUrl} alt="Agent Avatar" />
              ) : (
                <img className="w-9 h-9 object-contain" src="/icons/logo.svg" alt="Falbor" />
              )}
            </div>

            {/* Heading */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Hi, I'm {agentName}
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-200/70 dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-400">
                AI Agent
              </span>
            </div>

            {/* Short description */}
            <p className="text-sm text-gray-600 dark:text-[#a0a0a5] leading-relaxed mb-6 max-w-md">
              {agentDesc}
            </p>

            {/* Suggestion buttons */}
            <div className="flex flex-col gap-2">
              {FALBOR_SUGGESTIONS.map((sugg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(sugg.prompt)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-gray-100 dark:bg-[#282828] text-gray-800 dark:text-gray-200 transition-colors text-left text-sm font-medium"
                >
                  <i className={`${sugg.icon} text-lg text-gray-500 dark:text-gray-400 shrink-0`} />
                  <span className="truncate flex-1">{sugg.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full pb-4">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}

            {isActive && (
              <div className="mt-2 flex items-center gap-2">
                <video
                  src="/icons/pets/Agent-Loading.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-md object-cover"
                />
                <TextShimmer>
                  Agent Syncing
                </TextShimmer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};