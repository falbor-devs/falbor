import React, { useMemo } from 'react';
import type { Review } from '../types';
import { Stars } from './Stars';
import { Avatar } from './Avatar';

export function ReviewsPanel({
  reviews,
  rating,
  newReview,
  isSubmittingReview,
  onRatingChange,
  onReviewChange,
  onSubmit,
}: {
  reviews: Review[];
  rating: number;
  newReview: string;
  isSubmittingReview: boolean;
  onRatingChange: (value: number) => void;
  onReviewChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const ratingStats = useMemo(() => {
    const total = reviews.length;
    const average = total
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total
      : 0;

    const distribution = [5, 4, 3, 2, 1].map((value) => ({
      value,
      count: reviews.filter((review) => Number(review.rating) === value).length,
    }));

    return { total, average, distribution };
  }, [reviews]);

  return (
    <aside className="lg:sticky lg:top-8 lg:self-start" aria-labelledby="reviews-heading">
      <div className="border-b border-slate-200 pb-5 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
          Community signal
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="reviews-heading" className="text-2xl font-semibold tracking-tight">
              Reviews
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {ratingStats.total} {ratingStats.total === 1 ? 'review' : 'reviews'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold tracking-tight">
              {ratingStats.average ? ratingStats.average.toFixed(1) : '—'}
            </div>
            <Stars rating={Math.round(ratingStats.average)} size="sm" />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 py-5 dark:border-white/10">
        {ratingStats.distribution.map((item) => {
          const percentage = ratingStats.total ? (item.count / ratingStats.total) * 100 : 0;

          return (
            <div key={item.value} className="mb-2 flex items-center gap-3 last:mb-0">
              <span className="w-8 text-xs font-semibold text-slate-500">{item.value} ★</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-5 text-right text-xs text-slate-400">{item.count}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="dark:border-white/10">
        <h3 className="text-sm font-semibold">Share your perspective</h3>

        <div className="mt-3">
          <Stars rating={rating} size="lg" interactive onSelect={onRatingChange} />
        </div>

        <label htmlFor="review" className="sr-only">
          Your review
        </label>
        <textarea
          id="review"
          value={newReview}
          onChange={(event) => onReviewChange(event.target.value)}
          rows={4}
          maxLength={800}
          placeholder="What worked well for you?"
          className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
          required
        />

        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Be specific and constructive</span>
          <span>{newReview.length}/800</span>
        </div>

        <button
          type="submit"
          disabled={isSubmittingReview}
          className="!bg-[#0099ff]/20 text-[#0099ff] mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200"
        >
          {isSubmittingReview ? 'Publishing…' : 'Publish review'}
        </button>
      </form>

      <div className="space-y-4 pt-5">
        {reviews.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-2xl">✧</div>
            <p className="mt-2 text-sm font-medium">Be the first to review</p>
            <p className="mt-1 text-xs text-slate-500">
              Your feedback helps others choose confidently.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-md border p-3 pb-4">
              <div className="flex items-start gap-3">
                <Avatar user={review.user} small />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="truncate text-sm font-semibold">
                        {review.user?.displayName || review.user?.username || 'Anonymous'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Stars rating={Number(review.rating)} size="sm" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {review.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
