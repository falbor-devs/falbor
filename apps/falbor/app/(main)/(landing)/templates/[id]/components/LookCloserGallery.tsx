import React from 'react';
import type { Template } from '../types';

export function LookCloserGallery({
  template,
  gallery,
  setSelectedImage,
}: {
  template: Template;
  gallery: string[];
  setSelectedImage: (index: number) => void;
}) {
  if (gallery.length <= 1) return null;

  return (
    <section className="mt-5 dark:border-white/10" aria-labelledby="gallery-heading">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
            Look closer
          </p>
          <h2 id="gallery-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            A flexible foundation
          </h2>
        </div>
        <span className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
          Explore the details
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {gallery.slice(1, 5).map((image, index) => {
          const galleryIndex = index + 1;

          return (
            <button
              key={`${image}-${galleryIndex}`}
              type="button"
              onClick={() => {
                setSelectedImage(galleryIndex);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-left dark:border-white/10 dark:bg-slate-900 ${index === 0 ? 'col-span-2 row-span-2' : ''
                }`}
              aria-label={`Show ${template.name} preview ${galleryIndex + 1}`}
            >
              <img
                src={image}
                alt={`${template.name} preview ${galleryIndex + 1}`}
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
