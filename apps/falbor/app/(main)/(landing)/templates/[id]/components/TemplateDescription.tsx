import React from 'react';
import type { Template } from '../types';

export function TemplateDescription({ template }: { template: Template }) {
  return (
    <section className="mt-8">
      <article>
        <div className="mb-2">
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
            About this template
          </h2>
        </div>

        <div className="ql-editor !p-0 text-[17px] leading-8 text-slate-600 dark:text-slate-300">
          {template.description ? (
            <div dangerouslySetInnerHTML={{ __html: template.description }} />
          ) : (
            <p className="italic text-slate-500">No detailed description provided.</p>
          )}
        </div>
      </article>
    </section>
  );
}
