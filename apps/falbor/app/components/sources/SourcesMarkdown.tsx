import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SourcesMarkdownProps {
  content: string;
}

export function SourcesMarkdown({ content }: SourcesMarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none text-falbor-elements-textPrimary">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-8 mb-4 border-b border-falbor-elements-borderColor pb-2 text-falbor-elements-textPrimary" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-6 mb-3 text-falbor-elements-textPrimary" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-falbor-elements-textPrimary" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-7 text-falbor-elements-textSecondary" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2 text-falbor-elements-textSecondary" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-falbor-elements-textSecondary" {...props} />,
          li: ({ node, ...props }) => <li className="leading-snug" {...props} />,
          a: ({ node, ...props }) => <a className="text-[#4B8BBE] hover:underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-falbor-elements-textPrimary bg-falbor-elements-background-depth-2 px-1 rounded" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
