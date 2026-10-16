'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import classNames from 'classnames';
import { useStore } from '@nanostores/react';
import { getWorkspaceSource, type SourceItem } from '~/lib/actions/sources';
import { getSourcePosts, updateSourcePostStatus, type SourcePost } from '~/lib/actions/sourcePosts';
import { sendAgentMessage } from '~/lib/actions/agentChat';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { SourcesMarkdown } from '~/components/sources/SourcesMarkdown';
import { PLATFORM_ICONS } from './SourcesTableRow';

interface WorkspaceSourceDetailViewProps {
  workspaceId: string;
  channelId: string;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function SourcePostView({ post, onCopy, onTogglePublish }: { post: SourcePost; onCopy: (p: SourcePost) => void; onTogglePublish: (p: SourcePost) => void }) {
  const platform = PLATFORM_ICONS[post.platform] || PLATFORM_ICONS.Other;
  const isPublished = post.status === 'published';

  return (
    <div className="rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {platform.img ? (
            <img src={platform.img} alt={post.platform} className="w-5 h-5 rounded object-contain shrink-0" />
          ) : (
            <i className={classNames(platform.icon, 'text-xl shrink-0')} />
          )}
          <span className="text-[11px] font-semibold bg-falbor-elements-background-depth-2 px-2 py-0.5 rounded-md border border-falbor-elements-borderColor text-falbor-elements-textSecondary">
            {post.platform}
          </span>
          <span
            className={classNames(
              'text-[11px] font-medium capitalize',
              isPublished ? 'text-emerald-600 dark:text-emerald-400' : 'text-falbor-elements-textSecondary',
            )}
          >
            {post.status}
          </span>
          <span className="text-[11px] text-falbor-elements-textSecondary">· {formatDate(post.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(post)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-1 transition-colors"
          >
            <i className="i-ph:copy text-sm" />
            Copy
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-falbor-elements-textPrimary mt-4">{post.title}</h3>

      {post.hook && <p className="text-sm font-medium text-falbor-elements-textPrimary mt-2 italic">{post.hook}</p>}

      <div className="mt-3 text-sm">
        <SourcesMarkdown content={post.body} />
      </div>

      {post.callToAction && (
        <p className="text-sm mt-2">{post.callToAction}</p>
      )}

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-falbor-elements-background-depth-2 px-2 py-0.5 rounded-md border border-falbor-elements-borderColor"
            >
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSourceDetailView({ workspaceId, channelId }: WorkspaceSourceDetailViewProps) {
  const [source, setSource] = useState<SourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SourcePost[]>([]);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const pendingRef = useRef(false);

  const isAgentActive = useStore(aiSidebarStore.isActive);

  const refreshPosts = async () => {
    try {
      const data = await getSourcePosts(workspaceId, channelId);
      setPosts(data);
    } catch (error) {
      console.error('Failed to load source posts:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    getWorkspaceSource(workspaceId, channelId)
      .then((data) => {
        if (!cancelled) setSource(data);
      })
      .catch((error) => console.error('Failed to load source:', error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    refreshPosts();

    return () => {
      cancelled = true;
      pendingRef.current = false;
    };
  }, [workspaceId, channelId]);

  useEffect(() => {
    if (isAgentActive) return;
    if (!pendingRef.current) return;
    pendingRef.current = false;
    setIsGeneratingPost(false);
    refreshPosts();
  }, [isAgentActive]);

  const handleGenerate = () => {
    if (!source || isGeneratingPost || isAgentActive) return;
    pendingRef.current = true;
    setIsGeneratingPost(true);
    sendAgentMessage(
      `[CONTEXT: SOURCE_POST] [WORKSPACE_ID: ${workspaceId}] [SOURCE_ID: ${channelId}] [PLATFORM: ${source.platform}]\n` +
      `Analyze this ${source.platform} source, then write one authentic, human-sounding post tailored to it.\n` +
      `Source: "${source.title}" (${source.url})\n` +
      `Audience size: ${source.audienceSize}\n` +
      `Engagement notes: ${source.strategy || 'N/A'}\n` +
      `Call ui_generate_source_post exactly once with the final post.`,
    );

    if (!aiSidebarStore.isActive.get()) {
      pendingRef.current = false;
      setIsGeneratingPost(false);
    }
  };

  const handleTogglePublish = async (post: SourcePost) => {
    const next = post.status === 'published' ? 'draft' : 'published';
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, status: next } : p)));
    try {
      await updateSourcePostStatus(post.id, next);
    } catch (error) {
      console.error('Failed to update post status:', error);
      refreshPosts();
    }
  };

  const handleCopy = (post: SourcePost) => {
    const text = [post.title, '', post.hook, post.body, post.callToAction, post.hashtags.map((h) => `#${h}`).join(' ')]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard?.writeText(text);
  };

  if (loading) {
    return (
      <div className="w-full h-full p-6 space-y-4">
        <div className="h-8 w-64 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
        <div className="h-24 w-full bg-gray-100 dark:bg-[#111114] rounded-xl animate-pulse" />
        <div className="h-40 w-full bg-gray-100 dark:bg-[#111114] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!source) {
    return (
      <div className="w-full h-full p-6">
        <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-800 rounded-xl">
          <i className="i-ph:share-network text-4xl text-gray-400 mb-2" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Source not found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            This channel may have been removed or you do not have access to it.
          </p>
          <Link
            href={`/workspace/${workspaceId}/sources`}
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-accent-500 hover:underline"
          >
            <i className="i-ph:arrow-left text-sm" />
            Back to Sources
          </Link>
        </div>
      </div>
    );
  }

  const platformConfig = PLATFORM_ICONS[source.platform] || PLATFORM_ICONS.Other;
  const latestPost = posts[0];

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <Link
        href={`/workspace/${workspaceId}/sources`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors"
      >
        <i className="i-ph:arrow-left text-sm" />
        Back to Sources
      </Link>

      <div className="mt-4 rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {platformConfig.img ? (
              <img src={platformConfig.img} alt={source.platform} className="w-8 h-8 rounded object-contain shrink-0" />
            ) : (
              <i className={classNames(platformConfig.icon, 'text-3xl shrink-0')} />
            )}
            <div>
              <h1 className="text-xl font-semibold text-falbor-elements-textPrimary">{source.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold bg-falbor-elements-background-depth-2 px-2 py-0.5 rounded-md border border-falbor-elements-borderColor text-falbor-elements-textSecondary">
                  {source.platform}
                </span>
                <span className="text-[11px] capitalize text-falbor-elements-textSecondary">{source.status}</span>
              </div>
            </div>
          </div>

          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-1 transition-colors"
          >
            {source.platform === 'Contacts' ? 'Open Contact Profile' : 'Visit Channel'}
            <i className="i-ph:arrow-square-out text-sm" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-xs text-falbor-elements-textSecondary">Estimated Audience</p>
            <p className="text-sm font-semibold text-falbor-elements-textPrimary mt-1">{source.audienceSize}</p>
          </div>
          <div>
            <p className="text-xs text-falbor-elements-textSecondary">Match Score</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-24 bg-falbor-elements-background-depth-2 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${source.relevanceScore}%` }} />
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{source.relevanceScore}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-falbor-elements-textSecondary">Channel URL</p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-accent-500 hover:underline truncate mt-1"
            >
              {source.url}
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-falbor-elements-borderColor">
          <h2 className="text-sm font-semibold text-falbor-elements-textPrimary">Engagement Strategy</h2>
          <p className="text-sm text-falbor-elements-textSecondary mt-2 leading-relaxed">{source.strategy}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pt-3 pb-8 mt-[10px] rounded-t-2xl bg-[#EBEBEB] dark:bg-[#282828]">
          <div className="flex items-center gap-2">
            <i className="i-ph:sparkle-fill text-lg" />
            <div>
              <h2 className="text-sm font-semibold text-falbor-elements-textPrimary">Generate Post</h2>
              <p className="text-xs text-falbor-elements-textSecondary mt-0.5">
                The AI agent analyzes this {source.platform} source and writes an authentic post for it.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGeneratingPost || isAgentActive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary hover:bg-falbor-elements-background-depth-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <i className={`text-sm ${isGeneratingPost ? 'i-ph:spinner-gap animate-spin' : 'i-ph:sparkle'}`} />
            {latestPost ? 'Regenerate Post' : 'Generate Post'}
          </button>
        </div>

        <div className="-mt-6 rounded-4xl">
          {latestPost ? (
            <SourcePostView post={latestPost} onCopy={handleCopy} onTogglePublish={handleTogglePublish} />
          ) : (
            <div className="rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-1">
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                {isGeneratingPost ? (
                  <>
                    <i className="i-ph:spinner-gap animate-spin text-2xl" />
                    <p className="text-xs text-falbor-elements-textSecondary">Analyzing this source and drafting a post…</p>
                  </>
                ) : (
                  <>
                    <i className="i-ph:note-pencil text-2xl text-gray-400" />
                    <p className="text-xs text-falbor-elements-textSecondary">
                      No post currently available. Click "Generate Post" to create one for this channel.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
