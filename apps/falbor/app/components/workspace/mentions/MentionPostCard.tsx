'use client';
import React from 'react';
import { classNames } from '~/utils/classNames';
import type { BrandMentionPost } from './types';

function highlightKeywords(text: string, keyword: string) {
    if (!keyword) return text;
    const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
            <mark key={i} className="bg-amber-300 dark:bg-amber-500/40 text-black dark:text-amber-200 px-1 py-0.5 rounded font-semibold">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

interface MentionPostCardProps {
    post: BrandMentionPost;
}

export function MentionPostCard({ post }: MentionPostCardProps) {
    const sentimentBadge = post.sentiment === 'positive'
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        : post.sentiment === 'negative'
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';

    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 hover:border-falbor-elements-borderActive transition-colors duration-150">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#0099ff]/20 text-[#0099ff]">
                        {post.platform}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {post.brandKeyword}
                    </span>
                    {post.sentiment && (
                        <span className={classNames('px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize', sentimentBadge)}>
                            {post.sentiment}
                        </span>
                    )}
                </div>
                <span className="text-xs text-falbor-elements-textSecondary shrink-0">{post.postedAt}</span>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-falbor-elements-textPrimary line-clamp-2 leading-snug">
                    {highlightKeywords(post.title, post.brandKeyword)}
                </h3>
                <p className="text-xs text-falbor-elements-textSecondary mt-1.5 line-clamp-4 leading-relaxed">
                    {highlightKeywords(post.content, post.brandKeyword)}
                </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-falbor-elements-textSecondary">
                {post.author && (
                    <span className="flex items-center gap-1">
                        <span className="i-ph:user w-3.5 h-3.5" />
                        {post.author}
                    </span>
                )}
                {post.likes > 0 && (
                    <span className="flex items-center gap-1">
                        <span className="i-ph:arrow-fat-up w-3.5 h-3.5" />
                        {post.likes.toLocaleString()}
                    </span>
                )}
                {post.comments > 0 && (
                    <span className="flex items-center gap-1">
                        <span className="i-ph:chat-circle w-3.5 h-3.5" />
                        {post.comments.toLocaleString()}
                    </span>
                )}
            </div>

            {post.relevanceReason && (
                <div className="text-xs text-falbor-elements-textSecondary bg-falbor-elements-background-depth-1 p-2 rounded-lg border border-falbor-elements-borderColor">
                    <span className="font-semibold text-falbor-elements-textPrimary">Mention Context: </span>
                    <span className="italic">{post.relevanceReason}</span>
                </div>
            )}

            {post.url && post.url !== '#' && (
                <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline mt-auto pt-1 text-purple-600 dark:text-purple-400 font-medium"
                >
                    <span className="i-ph:arrow-square-out w-3.5 h-3.5" />
                    View original post
                </a>
            )}
        </div>
    );
}
