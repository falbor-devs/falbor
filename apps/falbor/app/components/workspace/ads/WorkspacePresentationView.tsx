'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  getWorkspaceProductDeck,
  saveWorkspaceProductDeck,
  publishWorkspaceProductDeck,
  autoGenerateWorkspaceProductDeck,
  SlideData,
} from '~/lib/actions/productDeck';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import {
  Presentation,
  MoreVertical,
  Save,
  Globe,
  Copy,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface WorkspacePresentationViewProps {
  workspaceId: string;
}

export function WorkspacePresentationView({ workspaceId }: WorkspacePresentationViewProps) {
  const [deckId, setDeckId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    if (typeof document !== 'undefined') {
      document.execCommand(command, false, value);
      handleSlideContentChange();
    }
  };
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const editorRef = useRef<HTMLDivElement | null>(null);
  const isEditingRef = useRef(false);
  const titleRef = useRef(title);
  const slidesRef = useRef(slides);
  const activeSlideIndexRef = useRef(activeSlideIndex);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;
    if (editorRef.current && slides[activeSlideIndex]) {
      editorRef.current.innerHTML = slides[activeSlideIndex].content || '';
    }
  }, [activeSlideIndex, slides]);

  const selectSlide = (index: number) => {
    // Flush current slide DOM edits before changing slide
    if (editorRef.current && slidesRef.current[activeSlideIndexRef.current]) {
      const currentHtml = editorRef.current.innerHTML;
      const updated = [...slidesRef.current];
      updated[activeSlideIndexRef.current] = {
        ...updated[activeSlideIndexRef.current],
        content: currentHtml,
      };
      setSlides(updated);
      slidesRef.current = updated;
      saveWorkspaceProductDeck(workspaceId, titleRef.current, updated);
    }
    setActiveSlideIndex(index);
    activeSlideIndexRef.current = index;
    isEditingRef.current = false;
  };

  // Debounced auto-save
  useEffect(() => {
    if (!workspaceId) return;
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      triggerAutoSave();
    }, 800);
    return () => clearTimeout(timer);
  }, [title, slides, workspaceId]);

  // Save on navigation or tab unmount
  useEffect(() => {
    const handleSaveOnExit = () => {
      if (workspaceId && slidesRef.current.length > 0) {
        if (editorRef.current && slidesRef.current[activeSlideIndexRef.current]) {
          slidesRef.current[activeSlideIndexRef.current].content = editorRef.current.innerHTML;
        }
        saveWorkspaceProductDeck(workspaceId, titleRef.current, slidesRef.current);
      }
    };
    window.addEventListener('beforeunload', handleSaveOnExit);
    return () => {
      window.removeEventListener('beforeunload', handleSaveOnExit);
      handleSaveOnExit();
    };
  }, [workspaceId]);

  // Background polling every 5 seconds
  useEffect(() => {
    loadDeck();
    const interval = setInterval(() => {
      loadDeck(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const triggerAutoSave = async () => {
    if (!workspaceId || slidesRef.current.length === 0 || isSavingFromRemoteRef.current) return;
    setSaveStatus('saving');
    try {
      const updated = await saveWorkspaceProductDeck(workspaceId, titleRef.current, slidesRef.current);
      if (updated && updated.id) {
        setDeckId(updated.id);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('unsaved');
    }
  };

  const isSavingFromRemoteRef = useRef(false);

  const loadDeck = async (isBackground = false) => {
    if (!isBackground && !deckId) setLoading(true);
    try {
      const deck = await getWorkspaceProductDeck(workspaceId);
      if (deck) {
        setDeckId(deck.id);
        const isFocusingTitle = typeof document !== 'undefined' && document.activeElement?.getAttribute('data-deck-title') === 'true';
        const isFocusingEditor = typeof document !== 'undefined' && document.activeElement === editorRef.current;

        if (!isFocusingTitle && !isEditingRef.current) {
          if (deck.title && deck.title !== titleRef.current) {
            setTitle(deck.title);
          }
        }

        const loadedSlides: SlideData[] = (deck.slides as any) || [];
        if (loadedSlides.length > 0) {
          const loadedJson = JSON.stringify(loadedSlides);
          const currentJson = JSON.stringify(slidesRef.current);

          // Only sync from remote in background if user is NOT currently editing and state is saved
          if (loadedJson !== currentJson && !isEditingRef.current && (!isBackground || !isFocusingEditor)) {
            isSavingFromRemoteRef.current = true;
            setSlides(loadedSlides);
            slidesRef.current = loadedSlides;

            const currentIdx = activeSlideIndexRef.current;
            if (editorRef.current && loadedSlides[currentIdx]) {
              editorRef.current.innerHTML = loadedSlides[currentIdx].content || '';
            }

            setTimeout(() => {
              isSavingFromRemoteRef.current = false;
            }, 1000);
          }
        }
        setIsPublished(deck.isPublished || false);
      }
    } catch (err) {
      console.error('Failed to load product deck:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSlideContentChange = () => {
    isEditingRef.current = true;
    const currentIdx = activeSlideIndexRef.current;
    if (editorRef.current && slides[currentIdx]) {
      const newHtml = editorRef.current.innerHTML;
      const updatedSlides = [...slides];
      updatedSlides[currentIdx] = {
        ...updatedSlides[currentIdx],
        content: newHtml,
      };
      setSlides(updatedSlides);
    }
  };



  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const updated = await saveWorkspaceProductDeck(workspaceId, title, slides);
      if (updated) {
        setDeckId(updated.id);
        setIsPublished(updated.isPublished);
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to save deck:', err);
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  };

  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('falbor:send_agent_message', {
            detail: {
              prompt: `[CONTEXT: PRODUCT_DECK_IMPROVEMENT_MCP] [WORKSPACE_ID: ${workspaceId}] Regenerate the entire presentation canvas from scratch.`,
            },
          })
        );
      }
      const updated = await autoGenerateWorkspaceProductDeck(workspaceId);
      if (updated) {
        setDeckId(updated.id);
        const loadedSlides: SlideData[] = (updated.slides as any) || [];
        setSlides(loadedSlides);
        if (editorRef.current && loadedSlides[0]) {
          editorRef.current.innerHTML = loadedSlides[0].content || '';
        }
        setActiveSlideIndex(0);
        activeSlideIndexRef.current = 0;
      }
    } catch (err) {
      console.error('Failed to regenerate presentation deck:', err);
    } finally {
      setRegenerating(false);
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setSaveStatus('saving');
    try {
      await saveWorkspaceProductDeck(workspaceId, title, slides);
      const published = await publishWorkspaceProductDeck(workspaceId);
      if (published) {
        setDeckId(published.id);
        setIsPublished(true);
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to publish deck:', err);
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = deckId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presentation/${deckId}` : '';

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !deckId) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-white dark:bg-[#09090B]">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading Pitch Deck...</span>
        </div>
      </div>
    );
  }

  const currentSlide = slides[activeSlideIndex];

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#F9FBFD] dark:bg-[#09090B]">
      <div className="h-14 bg-white dark:bg-[#111114] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <Presentation className="w-6 h-6 shrink-0" />
          <input
            type="text"
            data-deck-title="true"
            value={title}
            onChange={(e) => {
              isEditingRef.current = true;
              setTitle(e.target.value);
            }}
            onBlur={() => {
              isEditingRef.current = false;
              if (workspaceId && title) {
                saveWorkspaceProductDeck(workspaceId, title, slidesRef.current);
              }
            }}
            placeholder="Product Pitch Deck"
            className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white w-full px-1 py-0.5 transition-colors"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 select-none">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'unsaved' && 'Unsaved'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#18181C] px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            title="Bold"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
            title="Italic"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('underline')}
            title="Underline"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyLeft')}
            title="Align Left"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyCenter')}
            title="Align Center"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('justifyRight')}
            title="Align Right"
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
          <div className="relative flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-gray-500" />
            {['#000000', '#2563EB', '#9333EA', '#16A34A', '#DC2626', '#EA580C'].map((color) => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormat('foreColor', color)}
                className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-700 transition-transform hover:scale-125"
                style={{ backgroundColor: color }}
                title={`Color ${color}`}
              />
            ))}
            <input
              type="color"
              title="Custom Color"
              onChange={(e) => applyFormat('foreColor', e.target.value)}
              className="w-5 h-5 cursor-pointer bg-transparent border-none outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dropdown
            align="end"
            side="bottom"
            sideOffset={4}
            trigger={
              <button
                title="More Options"
                className="p-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem onSelect={handleRegenerate} disabled={regenerating}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {regenerating ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <RefreshCw className="w-4 h-4 text-purple-500" />}
                <span>Regenerate Deck</span>
              </div>
            </DropdownItem>
            <DropdownItem onSelect={handleSave} disabled={saving}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gray-500" />}
                <span>Save Draft</span>
              </div>
            </DropdownItem>
            <DropdownItem onSelect={handlePublish} disabled={publishing}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4 text-blue-500" />}
                <span>{isPublished ? 'Update Public Deck' : 'Publish Presentation'}</span>
              </div>
            </DropdownItem>
            {isPublished && deckId && (
              <DropdownItem onSelect={handleCopyLink}>
                <div className="flex items-center gap-2 text-xs font-medium">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Public URL'}</span>
                </div>
              </DropdownItem>
            )}
          </Dropdown>
        </div>
      </div>
      <div className="flex-1 w-full flex overflow-hidden">
        <div className="w-64 border border-gray-300 rounded-md dark:border-gray-800 bg-white dark:bg-[#111114] flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {slides.map((slide, idx) => {
              const isActive = idx === activeSlideIndex;
              return (
                <button
                  key={slide.id || idx}
                  onClick={() => selectSlide(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 relative ${isActive
                    ? 'border-blue-500 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-transparent shadow-md ring-2 ring-blue-500/40'
                    : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold text-[11px] ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>#{idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                      {slide.type}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{slide.title}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 px-2  flex flex-col items-center justify-between overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-5xl aspect-[16/9] min-h-[540px] bg-white dark:bg-[#141417] border border-gray-300 dark:border-gray-800 rounded-md p-8 flex flex-col justify-center relative overflow-hidden transition-all duration-300 transform scale-100">
            <div className="absolute top-6 left-8 flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
                Slide {activeSlideIndex + 1} of {slides.length} • {currentSlide?.type}
              </span>
            </div>
            {regenerating ? (
              <div className="flex-1 mt-8 flex flex-col items-center justify-center gap-3 text-purple-600 dark:text-purple-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-bold animate-pulse">AI is generating slide presentation...</span>
              </div>
            ) : (
              <div
                key={activeSlideIndex}
                ref={(node) => {
                  editorRef.current = node;
                  if (node && slides[activeSlideIndex] && !isEditingRef.current) {
                    if (!node.innerHTML) {
                      node.innerHTML = slides[activeSlideIndex].content || '';
                    }
                  }
                }}
                contentEditable
                onInput={handleSlideContentChange}
                suppressContentEditableWarning
                className="flex-1 mt-8 outline-none text-gray-900 dark:text-gray-100 max-w-none focus:outline-none animate-in fade-in duration-200"
              />
            )}
          </div>
          <div className="mt-6 flex items-center gap-4 bg-white dark:bg-[#141417] px-5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg text-xs">
            <button
              onClick={() => selectSlide(Math.max(0, activeSlideIndex - 1))}
              disabled={activeSlideIndex === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-gray-700 dark:text-gray-300">
              Slide {activeSlideIndex + 1} of {slides.length}
            </span>

            <button
              onClick={() => selectSlide(Math.min(slides.length - 1, activeSlideIndex + 1))}
              disabled={activeSlideIndex === slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
