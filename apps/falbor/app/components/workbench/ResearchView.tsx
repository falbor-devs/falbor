import { useStore } from '@nanostores/react';
import ReactMarkdown from 'react-markdown';
import { workbenchStore } from '~/lib/stores/workbench';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { chatStore } from '~/lib/stores/chat';
import { remarkPlugins } from '~/utils/markdown';

export const ResearchView = () => {
  const currentResearchData = useStore(workbenchStore.currentResearchData);
  
  const [isPublic, setIsPublic] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const closeResearch = () => {
    workbenchStore.currentView.set('code');
  };

  const handleCreateSharePage = async () => {
    if (!currentResearchData) return;
    setIsGenerating(true);
    try {
      
      const lines = currentResearchData.split('\n');
      const firstLine = lines.find(l => l.trim().length > 0) || "My Idea";
      let title = firstLine.replace(/^[#*\d.\s]+/, '').substring(0, 100);
      
      const res = await fetch('/api/analyzed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          problem: "See full analysis for details.",
          targetAudience: "General Audience",
          rawAnalysis: currentResearchData,
          isPublic: isPublic
        })
      });

      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json();
      
      setShareLink(`${window.location.origin}/analyzed/${data.id}`);
      toast.success("Validation page created successfully!");
    } catch (error) {
      toast.error("Failed to generate link");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-falbor-elements-background-depth-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 shrink-0 z-10 sticky top-0">
        <h2 className="text-lg font-semibold text-falbor-elements-textPrimary flex items-center gap-2">
          <div className="i-ph:magnifying-glass-duotone text-falbor-elements-item-contentAccent" />
          Validation Research
        </h2>
        <button
          onClick={closeResearch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-falbor-elements-background-depth-3 text-sm font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary transition-colors"
        >
          <div className="i-ph:x" />
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto w-full">
          {currentResearchData ? (
            <>
              <ReactMarkdown
                remarkPlugins={remarkPlugins(false)}
                className="flex flex-col gap-6 text-falbor-elements-textPrimary font-sans"
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-3xl font-bold text-falbor-elements-textPrimary mt-10 mb-6 pb-3 border-b border-falbor-elements-borderColor tracking-tight" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-2xl font-bold text-falbor-elements-textPrimary mt-10 mb-4 pb-2 border-b border-falbor-elements-borderColor tracking-tight flex items-center gap-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold text-falbor-elements-textPrimary mt-8 mb-3 tracking-tight" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="text-base text-falbor-elements-textSecondary leading-loose m-0" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="flex flex-col gap-3 my-4 ml-1" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="relative pl-5 text-base text-falbor-elements-textSecondary leading-relaxed before:absolute before:left-0 before:top-2.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-falbor-elements-item-contentAccent" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-semibold text-falbor-elements-textPrimary" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="italic text-falbor-elements-textPrimary" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a className="inline-flex items-center gap-1 text-falbor-elements-item-contentAccent hover:underline transition-opacity font-medium no-underline" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-falbor-elements-item-contentAccent pl-5 py-2 italic bg-falbor-elements-background-depth-2 rounded-r-lg my-6 text-falbor-elements-textSecondary shadow-sm" {...props} />
                  ),
                  code: ({ node, className, ...props }) => (
                    <code className="px-1.5 py-0.5 rounded-md bg-falbor-elements-background-depth-3 text-sm font-mono text-falbor-elements-textPrimary border border-falbor-elements-borderColor/50" {...props} />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="p-4 rounded-xl bg-falbor-elements-background-depth-3 overflow-x-auto text-sm font-mono text-falbor-elements-textSecondary border border-falbor-elements-borderColor/50 shadow-sm my-6 whitespace-pre-wrap word-break" {...props} />
                  ),
                }}
              >
                {currentResearchData}
              </ReactMarkdown>

              {}
              <div className="mt-12 pt-8 border-t border-falbor-elements-borderColor flex flex-col items-center">
                <div className="bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor p-6 rounded-xl w-full max-w-lg text-center flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-falbor-elements-textPrimary flex items-center justify-center gap-2">
                      <div className="i-ph:rocket-launch-duotone text-falbor-elements-item-contentAccent" />
                      Create Validation Page
                    </h3>
                    <p className="text-sm text-falbor-elements-textSecondary mt-2">
                      Turn this analysis into a shareable page to collect real feedback from users.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-center gap-3 bg-falbor-elements-background-depth-3 p-2 rounded-lg w-fit mx-auto">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${!isPublic ? 'bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary shadow-sm' : 'text-falbor-elements-textTertiary hover:text-falbor-elements-textSecondary'}`}
                    >
                      Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${isPublic ? 'bg-falbor-elements-background-depth-1 text-falbor-elements-textPrimary shadow-sm' : 'text-falbor-elements-textTertiary hover:text-falbor-elements-textSecondary'}`}
                    >
                      Public
                    </button>
                  </div>

                  {shareLink ? (
                    <div className="mt-2 flex flex-col gap-3">
                      <div className="bg-falbor-elements-item-backgroundAccent/10 text-falbor-elements-item-contentAccent p-3 rounded-lg text-sm font-medium break-all border border-falbor-elements-item-backgroundAccent/20">
                        {shareLink}
                      </div>
                      <a
                        href={shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor text-falbor-elements-textPrimary rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <div className="i-ph:arrow-square-out-duotone" />
                        Open Page
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateSharePage}
                      disabled={isGenerating}
                      className="w-full mt-2 py-2.5 bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent hover:opacity-90 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <div className="i-svg-spinners:90-ring-with-bg" />
                      ) : (
                        <div className="i-ph:link-duotone" />
                      )}
                      Generate Shareable Link
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-falbor-elements-textTertiary mt-20">
              No research data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
