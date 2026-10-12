'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  getWorkspaceBlog,
  saveWorkspaceBlog,
  publishWorkspaceBlog,
} from '~/lib/actions/blogContent';
import { Dropdown, DropdownItem } from '~/components/ui/Dropdown';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  RemoveFormatting,
  ChevronDown,
  FileText,
  Save,
  Globe,
  Copy,
  Check,
  Loader2,
  MoreVertical,
} from 'lucide-react';

interface WorkspaceBlogContentViewProps {
  workspaceId: string;
}

const FONT_FAMILIES = ['Arial', 'Georgia', 'Impact', 'Tahoma', 'Times New Roman', 'Verdana'];
const FONT_SIZES = [
  { label: 'Small', value: '1' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Huge', value: '7' },
];

export function WorkspaceBlogContentView({ workspaceId }: WorkspaceBlogContentViewProps) {
  const [blogId, setBlogId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('3');
  const editorRef = useRef<HTMLDivElement>(null);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const isEditingRef = useRef(false);
  const titleRef = useRef(title);
  const contentRef = useRef(content);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const cleanHtml = (raw: string) => {
    if (!raw) return '';
    let clean = raw.replace(/^```html\s*/i, '').replace(/```$/i, '').trim();
    clean = clean.replace(/<title[\s\S]*?<\/title>/gi, '').trim();
    return clean;
  };

  // Debounced auto-save when title or content changes
  useEffect(() => {
    if (!blogId) return;
    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      triggerAutoSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, content]);

  // Auto-save on page unload / exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (workspaceId && (titleRef.current || contentRef.current)) {
        const currentHtml = editorRef.current?.innerHTML || contentRef.current;
        saveWorkspaceBlog(workspaceId, titleRef.current, currentHtml);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [workspaceId]);

  useEffect(() => {
    loadBlog();
    const interval = setInterval(() => {
      loadBlog(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const triggerAutoSave = async () => {
    if (!workspaceId) return;
    setSaveStatus('saving');
    try {
      const htmlContent = editorRef.current?.innerHTML || contentRef.current;
      await saveWorkspaceBlog(workspaceId, titleRef.current, htmlContent);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('unsaved');
    }
  };

  const loadBlog = async (isBackground = false) => {
    if (!isBackground && !blogId) setLoading(true);
    try {
      const blog = await getWorkspaceBlog(workspaceId);
      if (blog) {
        setBlogId(blog.id);
        const isFocusingTitle = typeof document !== 'undefined' && document.activeElement?.getAttribute('data-blog-title') === 'true';
        const isFocusingEditor = typeof document !== 'undefined' && document.activeElement === editorRef.current;

        if (!isBackground || (!isFocusingTitle && !isEditingRef.current)) {
          if (blog.title && !isFocusingTitle) setTitle(blog.title);
        }

        const cleaned = cleanHtml(blog.content || '');
        if (!isBackground || (!isFocusingEditor && !isEditingRef.current)) {
          setContent(cleaned);
          if (editorRef.current && (isBackground ? editorRef.current.innerHTML !== cleaned : !editorRef.current.innerHTML)) {
            editorRef.current.innerHTML = cleaned;
          }
        }
        setIsPublished(blog.isPublished || false);
      }
    } catch (err) {
      console.error('Failed to load blog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = () => {
    isEditingRef.current = true;
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    isEditingRef.current = true;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('saving');
    try {
      const htmlContent = editorRef.current?.innerHTML || content;
      const updated = await saveWorkspaceBlog(workspaceId, title, htmlContent);
      if (updated) {
        setBlogId(updated.id);
        setIsPublished(updated.isPublished);
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to save blog:', err);
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setSaveStatus('saving');
    try {
      const htmlContent = editorRef.current?.innerHTML || content;
      await saveWorkspaceBlog(workspaceId, title, htmlContent);
      const published = await publishWorkspaceBlog(workspaceId);
      if (published) {
        setBlogId(published.id);
        setIsPublished(true);
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to publish blog:', err);
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = blogId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/blog/${blogId}` : '';

  const handleCopyLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !blogId) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-white dark:bg-[#09090B]">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
      <div className="h-14 bg-white dark:bg-[#111114] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <FileText className="w-6 h-6 text-blue-600 shrink-0" />
          <input
            type="text"
            data-blog-title="true"
            value={title}
            onChange={(e) => {
              isEditingRef.current = true;
              setTitle(e.target.value);
            }}
            placeholder="Untitled Blog Post"
            className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white w-full px-1 py-0.5 transition-colors"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 select-none">
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'unsaved' && 'Unsaved'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Dropdown
            align="end"
            side="bottom"
            sideOffset={4}
            trigger={
              <button
                title="More Options"
                className="p-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#18181C] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
          >
            <DropdownItem onSelect={handleSave} disabled={saving}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-gray-500" />}
                <span>Save Draft</span>
              </div>
            </DropdownItem>
            <DropdownItem onSelect={handlePublish} disabled={publishing}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4 text-blue-500" />}
                <span>{isPublished ? 'Update Public Post' : 'Publish Post'}</span>
              </div>
            </DropdownItem>
            {isPublished && blogId && (
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
      <div className="h-11 border border-gray-300 rounded-md px-4 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0 text-gray-700 dark:text-gray-300">
        <button
          onClick={() => execCmd('undo')}
          title="Undo"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('redo')}
          title="Redo"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1" />

        {/* Font Family UI Dropdown */}
        <Dropdown
          align="start"
          side="bottom"
          sideOffset={4}
          trigger={
            <button className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-[#222226] border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <span>{fontFamily}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          }
        >
          {FONT_FAMILIES.map((font) => (
            <DropdownItem
              key={font}
              active={fontFamily === font}
              onSelect={() => {
                setFontFamily(font);
                execCmd('fontName', font);
              }}
            >
              <span style={{ fontFamily: font }}>{font}</span>
            </DropdownItem>
          ))}
        </Dropdown>

        {/* Font Size UI Dropdown */}
        <Dropdown
          align="start"
          side="bottom"
          sideOffset={4}
          trigger={
            <button className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-[#222226] border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <span>{FONT_SIZES.find((s) => s.value === fontSize)?.label || 'Normal'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          }
        >
          {FONT_SIZES.map((size) => (
            <DropdownItem
              key={size.value}
              active={fontSize === size.value}
              onSelect={() => {
                setFontSize(size.value);
                execCmd('fontSize', size.value);
              }}
            >
              <span>{size.label}</span>
            </DropdownItem>
          ))}
        </Dropdown>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1" />

        <button
          onClick={() => execCmd('bold')}
          title="Bold"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('italic')}
          title="Italic"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('underline')}
          title="Underline"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('strikeThrough')}
          title="Strikethrough"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1" />

        <button
          onClick={() => execCmd('justifyLeft')}
          title="Align Left"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('justifyCenter')}
          title="Align Center"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('justifyRight')}
          title="Align Right"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1" />

        <button
          onClick={() => execCmd('insertUnorderedList')}
          title="Bullet List"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('insertOrderedList')}
          title="Numbered List"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700 mx-1" />

        <button
          onClick={() => {
            const url = prompt('Enter link URL:');
            if (url) execCmd('createLink', url);
          }}
          title="Insert Link"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCmd('removeFormat')}
          title="Clear Formatting"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 w-full mt-2 overflow-y-auto flex justify-center items-start custom-scrollbar">
        <div className="w-full min-h-[900px] h-fit bg-[#F8F8F8] dark:bg-[#111114] dark:border-gray-800 rounded-md p-12 flex flex-col my-auto sm:my-0">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            suppressContentEditableWarning
            className="flex-1 min-h-[750px] outline-none text-gray-900 dark:text-gray-100 text-base leading-relaxed space-y-4 prose dark:prose-invert max-w-none focus:outline-none"
            style={{ fontFamily }}
          />
        </div>
      </div>
    </div>
  );
}
