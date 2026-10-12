'use client';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import type { ElementComment } from '~/lib/stores/commentStore';
import { commentStore } from '~/lib/stores/commentStore';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface CommentPopoverProps {
  comment: ElementComment;
  onClose: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

export const CommentPopover = ({ comment, onClose, sendMessage }: CommentPopoverProps) => {
  const profile = useStore(profileStore);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTaggedAI, setIsTaggedAI] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (comment.messages.length === 0) {
      commentStore.deleteComment(comment.id);
    }
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, comment]);

  const handleTagAI = () => {
    if (!inputText.includes('@AI')) {
      setInputText((prev) => (prev ? `${prev} @AI ` : '@AI '));
      setIsTaggedAI(true);
    }
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setInputText((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    const includesAI = textToSend.includes('@AI') || isTaggedAI;
    const authorName = profile?.username || 'You';

    commentStore.addMessage(comment.id, {
      sender: 'user',
      authorName,
      authorAvatar: profile?.avatar || '',
      text: textToSend,
    });

    setInputText('');
    setIsTaggedAI(false);
    setShowEmojiPicker(false);

    if (includesAI && sendMessage) {
      const tagInfo = comment.elementInfo.tagName
        ? `<${comment.elementInfo.tagName.toLowerCase()}${
            comment.elementInfo.id ? ` id="${comment.elementInfo.id}"` : ''
          }${comment.elementInfo.className ? ` class="${comment.elementInfo.className.split(' ')[0]}"` : ''}>`
        : 'element';

      const prompt = `[Comment on ${tagInfo}]: ${textToSend.replace(/@AI/g, '').trim()}\nElement text content: "${comment.elementInfo.textContent || ''}"`;

      commentStore.addMessage(comment.id, {
        sender: 'ai',
        authorName: 'AI Assistant',
        authorAvatar: '🤖',
        text: 'I am working on this update for you...',
      });

      sendMessage(e as any, prompt);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 w-[320px] p-3.5 flex flex-col gap-2.5 font-sans"
      style={{
        left: Math.min(Math.max(10, comment.position.x - 20), window.innerWidth - 340),
        top: Math.max(10, comment.position.y + 20),
      }}
    >
      {}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="User" className="w-7 h-7 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-sm">
              <div className="i-ph:user-fill text-xs" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-800">{profile?.username || 'User'}</span>
            <span className="text-[10px] text-gray-500 font-mono">
              {comment.elementInfo.tagName ? `<${comment.elementInfo.tagName.toLowerCase()}>` : 'element'}
            </span>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors text-xs font-semibold"
          title="Close comment"
        >
          ✕
        </button>
      </div>

      {}
      {comment.messages.length > 0 && (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {comment.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 text-xs p-2 rounded-xl ${
                msg.sender === 'user' ? 'bg-blue-50/80 text-gray-800 self-end' : 'bg-gray-100 text-gray-800 self-start'
              } max-w-[92%]`}
            >
              {msg.authorAvatar && msg.authorAvatar.startsWith('http') ? (
                <img src={msg.authorAvatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] flex-shrink-0 font-medium text-gray-700">
                  {msg.authorAvatar || (msg.sender === 'user' ? (profile?.username ? profile.username[0].toUpperCase() : 'U') : '🤖')}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-[10px] text-gray-500">{msg.authorName}</span>
                <span className="break-words mt-0.5">{msg.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {}
      <form onSubmit={handleSend} className="relative flex flex-col gap-1">
        <div className="relative border border-blue-500 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-blue-200 transition-all bg-white">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Add a comment"
            className="w-full text-xs outline-none bg-transparent text-gray-900 placeholder-gray-400 mb-2"
          />

          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTagAI}
                className={`text-xs font-semibold transition-colors px-1 py-0.5 rounded ${
                  isTaggedAI || inputText.includes('@AI')
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Tag AI Assistant"
              >
                @
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                title="Add Emoji"
              >
                😊
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-6 h-6 bg-gray-200 hover:bg-blue-600 text-gray-700 hover:text-white rounded-lg flex items-center justify-center transition-colors text-xs font-bold disabled:opacity-40 disabled:hover:bg-gray-200 disabled:hover:text-gray-700"
              title="Send"
            >
              ↑
            </button>
          </div>
        </div>

        {}
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={280}
              height={320}
              searchDisabled={false}
              skinTonesDisabled
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </form>
    </div>
  );
};
