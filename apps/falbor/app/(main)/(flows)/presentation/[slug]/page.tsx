import React from 'react';
import { getPublicProductDeckById, SlideData } from '~/lib/actions/productDeck';
import { notFound } from 'next/navigation';

interface PublicPresentationPageProps {
  params: {
    slug: string;
  };
}

export default async function PublicPresentationPage({ params }: PublicPresentationPageProps) {
  const deck = await getPublicProductDeckById(params.slug);

  if (!deck || !deck.isPublished) {
    notFound();
  }

  const slides: SlideData[] = (deck.slides as any) || [];

  return (
    <div className="min-h-screen w-full bg-[#0D0D10] text-white flex flex-col justify-center items-center p-6 space-y-12">
      <div className="text-center space-y-2 max-w-2xl">
        <h1 className="text-3xl font-black">{deck.title}</h1>
        <p className="text-sm text-gray-400">Published Investor Presentation • {slides.length} Slides</p>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="w-full aspect-[16/9] min-h-[500px] bg-[#141417] border border-gray-800 rounded-2xl p-10 flex flex-col justify-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-6 left-8 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Slide {idx + 1} of {slides.length} • {slide.type}
              </span>
            </div>
            <div
              className="mt-10 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: slide.content || '' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
