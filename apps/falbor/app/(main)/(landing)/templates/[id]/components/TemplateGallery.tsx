import React from 'react';
import type { Template } from '../types';

export function TemplateGallery({
  template,
  gallery,
  selectedImage,
  setSelectedImage,
}: {
  template: Template;
  gallery: string[];
  selectedImage: number;
  setSelectedImage: (index: number) => void;
}) {
  const activeImage = gallery[selectedImage] || gallery[0];

  return (
    <div className="group relative">
      <div className="relative overflow-hidden rounded-[0.5rem] border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-slate-900">
        {activeImage ? (
          <img
            key={activeImage}
            src={activeImage}
            alt={template.name}
            className="aspect-[1.3/1] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[1.3/1] items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500 text-7xl text-white">
            ✦
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 pt-20 text-white">
          {gallery.length > 1 && (
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
              {selectedImage + 1} / {gallery.length}
            </span>
          )}
        </div>
      </div>

      {gallery.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2" aria-label="Select template image">
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={selectedImage === index}
              className={`group/thumb relative overflow-hidden rounded-[0.5rem] border bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-slate-900 ${selectedImage === index
                ? 'border-slate-950 ring-2 ring-slate-950/10 dark:border-white dark:ring-white/10'
                : 'border-slate-200 dark:border-white/10'
                }`}
            >
              <img
                src={image}
                alt=""
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105"
              />
              {selectedImage === index && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-violet-600" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
      <style jsx>{`
        .template-main-image {
          animation: image-arrival 520ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform, filter;
        }

        @keyframes image-arrival {
          0% {
            opacity: 0;
            transform: scale(1.045) translate3d(0, 8px, 0);
            filter: saturate(0.72) blur(7px);
          }
          55% {
            opacity: 0.82;
            filter: saturate(0.9) blur(1px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translate3d(0, 0, 0);
            filter: saturate(1) blur(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .template-main-image {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
