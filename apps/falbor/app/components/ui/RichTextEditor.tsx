'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-gray-500">Loading editor...</div>
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function RichTextEditor({ value, onChange, readOnly = false }: RichTextEditorProps) {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  return (
    <div className={`rich-text-editor h-full w-full ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}>
      <style jsx global>{`
        .rich-text-editor {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
        }
        .rich-text-editor .quill {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .rich-text-editor .ql-container {
          font-family: inherit;
          font-size: 1rem;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          background-color: #ffffff;
          color: #111827;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        :global(.dark) .rich-text-editor .ql-container {
          border-color: #353538;
          background-color: #1C1D21;
          color: #e5e7eb;
        }
        .rich-text-editor .ql-toolbar {
          border: 1px solid #e5e7eb;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background-color: #f9fafb;
        }
        :global(.dark) .rich-text-editor .ql-toolbar {
          border-color: #353538;
          background-color: #2B2D31;
        }
        .rich-text-editor .ql-stroke {
          stroke: #4b5563;
        }
        :global(.dark) .rich-text-editor .ql-stroke {
          stroke: #9ca3af;
        }
        .rich-text-editor .ql-fill {
          fill: #4b5563;
        }
        :global(.dark) .rich-text-editor .ql-fill {
          fill: #9ca3af;
        }
        .rich-text-editor .ql-picker {
          color: #4b5563;
        }
        :global(.dark) .rich-text-editor .ql-picker {
          color: #9ca3af;
        }
        .rich-text-editor .ql-editor {
          min-height: 400px;
        }
      `}</style>
      <ReactQuill 
        theme="snow"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
      />
    </div>
  );
}
