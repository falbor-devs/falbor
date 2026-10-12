'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '~/hooks/useAuth';

import type { Template, Review } from './types';
import { Avatar } from './components/Avatar';
import { LoadingState } from './components/LoadingState';
import { ReviewsPanel } from './components/ReviewsPanel';
import { BreadcrumbNav } from './components/BreadcrumbNav';
import { TemplateGallery } from './components/TemplateGallery';
import { TemplateInfo } from './components/TemplateInfo';
import { LookCloserGallery } from './components/LookCloserGallery';
import { TemplateDescription } from './components/TemplateDescription';

export default function TemplateDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsing, setIsUsing] = useState(false);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch(`/api/templates/${params.id}`).then((res) => res.json()),
      fetch(`/api/templates/${params.id}/reviews`).then((res) => res.json()),
    ])
      .then(([templateData, reviewsData]) => {
        if (!isMounted) return;
        if (templateData.success) setTemplate(templateData.data);
        if (reviewsData.success) setReviews(reviewsData.data);
      })
      .catch(() => {
        if (isMounted) toast.error('Unable to load this template right now.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const handleUseTemplate = async () => {
    if (!user) {
      toast.error("You can't use this template until you're logged in.", {
        position: 'bottom-right',
      });
      return;
    }
    setIsUsing(true);

    try {
      const res = await fetch(`/api/templates/${params.id}/use`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to use template');

      toast.success('Template applied. Opening your new project…');
      router.push(`/chat/${data.data.chatId}`);
    } catch (error: any) {
      toast.error(error.message || 'Something went wrong.');
      setIsUsing(false);
    }
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      toast.error("You can't submit reviews until you're logged in.", {
        position: 'bottom-right',
      });
      return;
    }

    if (!newReview.trim()) {
      toast.error('Write a short review before submitting.');
      return;
    }

    setIsSubmittingReview(true);

    try {
      const res = await fetch(`/api/templates/${params.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, content: newReview.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      toast.success('Your review has been published.');
      setNewReview('');
      setRating(5);

      const reviewsRes = await fetch(`/api/templates/${params.id}/reviews`);
      const reviewsData = await reviewsRes.json();
      if (reviewsData.success) setReviews(reviewsData.data);
    } catch (error: any) {
      toast.error(error.message || 'Unable to submit your review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) return <LoadingState />;

  if (!template) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-6 dark:bg-[#090b12]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-2xl text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            ✦
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Template not found
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            This template may have been removed or is no longer available.
          </p>
          <Link
            href="/templates"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950"
          >
            Explore templates
          </Link>
        </div>
      </main>
    );
  }

  const gallery = [template.mainImage, ...(template.images || [])].filter(Boolean) as string[];
  const activeImage = gallery[selectedImage] || gallery[0];
  const publisherName = template.user?.displayName || template.user?.username || 'Independent creator';

  return (
    <main className="min-h-screen overflow-hidden text-slate-950 dark:text-white">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <BreadcrumbNav templateName={template.name} />

        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
          <div>
            <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
              <TemplateGallery
                template={template}
                gallery={gallery}
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
              />
              <TemplateInfo
                template={template}
                publisherName={publisherName}
                handleUseTemplate={handleUseTemplate}
                isUsing={isUsing}
              />
            </div>
            <TemplateDescription template={template} />
          </div>

          <ReviewsPanel
            reviews={reviews}
            rating={rating}
            newReview={newReview}
            isSubmittingReview={isSubmittingReview}
            onRatingChange={setRating}
            onReviewChange={setNewReview}
            onSubmit={handleSubmitReview}
          />
        </section>
      </div>
    </main>
  );
}
