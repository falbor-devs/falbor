import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogTitle, DialogRoot } from '~/components/ui/Dialog';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import styles from '~/components/chat/core/BaseChat.module.scss';
import { ImageEditor } from '../tools/ImageEditor';

interface ImageGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageAdd: (file: File, dataUrl: string) => void;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
}

export const ImageGeneratorDialog: React.FC<ImageGeneratorDialogProps> = ({ open, onOpenChange, onImageAdd }) => {
  const [view, setView] = useState<'generator' | 'editor'>('generator');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      if (view === 'generator') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      fetchHistory();
    } else {
      setPrompt('');
      setView('generator');
      setSelectedImage(null);
    }
  }, [open, view]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/generated-images');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.images || []);
      }
    } catch (err) {
      console.error('Failed to load image history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const response = await fetch('http://localhost:8001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const imageUrl = `data:image/jpeg;base64,${data.image_base64}`;

      const saveRes = await fetch('/api/generated-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, imageUrl }),
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        setHistory(prev => [saveData.image, ...prev]);
        toast.success('Image generated successfully!');
      }

    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Error generating image.');
      setPrompt(currentPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setView('editor');
  };

  const handleEditorAddToChat = (file: File, dataUrl: string) => {
    onImageAdd(file, dataUrl);
    toast.success('Image added to chat!');
    onOpenChange(false);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog className="max-w-5xl w-full h-[85vh] flex flex-col p-0 overflow-hidden bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor shadow-2xl">

        {view === 'editor' && selectedImage ? (
          <ImageEditor
            imageUrl={selectedImage}
            onBack={() => setView('generator')}
            onAddToChat={handleEditorAddToChat}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-falbor-elements-borderColor shrink-0">
              <DialogTitle className="text-xl font-bold text-falbor-elements-textPrimary m-0 flex items-center gap-2">
                <div className="i-ph:image text-purple-500" />
                Image Generator
              </DialogTitle>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex flex-col items-center justify-center text-center space-y-4 pt-10 pb-6 px-4">
                <h1
                  className="text-4xl mb-1 text-center text-zinc-900 px-4 md:px-8"
                  style={{
                    fontFamily: '"Google Sans", sans-serif',
                    fontOpticalSizing: "auto",
                    fontVariationSettings: '"GRAD" 0',
                  }}
                >What would you like to create?
                </h1>
              </div>

              <form onSubmit={handleGenerate} className="relative mx-auto w-full max-w-2xl px-6 shrink-0 z-10">
                <div className="relative bg-falbor-elements-background-depth-2 dark:bg-[#1E1E21] backdrop-blur border border-[#BDBDBD] dark:border-[#353538] shadow-md rounded-lg transition-all duration-200 hover:shadow-lg focus-within:shadow-lg focus-within:border-purple-500/50">
                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    placeholder="A futuristic city at sunset, cyberpunk style..."
                    className="w-full bg-transparent p-4 pr-14 text-falbor-elements-textPrimary placeholder-falbor-elements-textTertiary resize-none focus:outline-none min-h-[120px]"
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="absolute right-3 bottom-3 z-20"
                  >
                    {isGenerating ? (
                      <div className="i-svg-spinners:90-ring-with-bg text-lg" />
                    ) : (
                      <div className="i-ph:paper-plane-right-fill text-lg" />
                    )}
                  </button>
                </div>
              </form>

              {}
              <div className="mt-8 px-6 pb-6 w-full max-w-2xl mx-auto flex flex-col gap-2">
                <h3 className="text-sm font-medium text-falbor-elements-textSecondary">Recent Generations</h3>

                <div className="flex overflow-x-auto gap-4 custom-scrollbar pb-4 pt-2 items-center">
                  {isLoadingHistory ? (
                    <div className="flex items-center text-purple-500 gap-2 text-sm ml-2">
                      <div className="i-svg-spinners:90-ring-with-bg text-xl" /> Loading history...
                    </div>
                  ) : history.length === 0 && !isGenerating ? (
                    <div className="text-sm text-falbor-elements-textTertiary ml-2">
                      No images generated yet.
                    </div>
                  ) : (
                    <>
                      {isGenerating && (
                        <div className="shrink-0 w-24 h-24 bg-falbor-elements-background-depth-2 rounded-lg border border-falbor-elements-borderColor border-dashed flex flex-col items-center justify-center text-purple-500 animate-pulse">
                          <div className="i-svg-spinners:90-ring-with-bg text-2xl" />
                        </div>
                      )}

                      {history.map((img) => (
                        <div
                          key={img.id}
                          className="shrink-0 group relative w-24 h-24 bg-falbor-elements-background-depth-2 rounded-lg overflow-hidden border border-falbor-elements-borderColor cursor-pointer hover:border-purple-500/50 transition-colors shadow-sm hover:shadow-md"
                          onClick={() => handleImageClick(img.imageUrl)}
                          title={img.prompt}
                        >
                          <img
                            src={img.imageUrl}
                            alt={img.prompt}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="i-ph:pencil-simple text-white text-xl drop-shadow-md" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </DialogRoot>
  );
};
