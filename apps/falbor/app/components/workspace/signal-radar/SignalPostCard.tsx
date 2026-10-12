'use client';
import React from 'react';
import { classNames } from '~/utils/classNames';
import type { SignalPost } from './types';

const PLATFORM_COLORS: Record<string, string> = {
    Reddit: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    LinkedIn: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    Twitter: 'bg-gray-500/10 text-gray-600 dark:text-gray-300 border-gray-500/20',
    Google: 'bg-blue-400/10 text-blue-500 dark:text-blue-300 border-blue-400/20',
    IndieHackers: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    HackerNews: 'bg-orange-400/10 text-orange-500 dark:text-orange-300 border-orange-400/20',
    Facebook: 'bg-blue-700/10 text-blue-700 dark:text-blue-400 border-blue-700/20',
    Discord: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
};

function RelevanceBar({ score }: { score: number }) {
    const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-400';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className={classNames('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-semibold text-falbor-elements-textSecondary tabular-nums">{score}%</span>
        </div>
    );
}

interface SignalPostCardProps {
    post: SignalPost;
}

export function SignalPostCard({ post }: SignalPostCardProps) {
    return (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 hover:border-falbor-elements-borderActive transition-colors duration-150">
            <div className="flex items-start justify-between gap-2">
                <span className={classNames('px-2 py-0.5 rounded-md text-xs font-semibold bg-[#0099ff]/20 text-[#0099ff]')}>
                    {post.platform}
                </span>
                <span className="text-xs text-falbor-elements-textSecondary shrink-0">{post.postedAt}</span>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-falbor-elements-textPrimary line-clamp-2 leading-snug">
                    {post.title}
                </h3>
                <p className="text-xs text-falbor-elements-textSecondary mt-1.5 line-clamp-3 leading-relaxed">
                    {post.content}
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

            <div>
                <div className="text-xs text-falbor-elements-textSecondary mb-1 font-medium">Relevance match</div>
                <RelevanceBar score={post.relevanceScore} />
                {post.relevanceReason && (
                    <p className="text-xs text-falbor-elements-textSecondary mt-1 italic line-clamp-2">
                        {post.relevanceReason}
                    </p>
                )}
            </div>

            {post.painPoints && post.painPoints.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {post.painPoints.slice(0, 3).map((pain, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
                            {pain}
                        </span>
                    ))}
                </div>
            )}

            {post.url && post.url !== '#' && (
                <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline mt-auto pt-1"
                >
                    <span className="i-ph:arrow-square-out w-3.5 h-3.5" />
                    View original post
                </a>
            )}
        </div>
    );
}
