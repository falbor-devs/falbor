import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { DialogTitle, DialogDescription } from '~/components/ui/Dialog';
import { chatId, description as descriptionStore } from '~/lib/persistence';
import { useEditChatDescription } from '~/lib/hooks';
import { TextShimmer } from '~/components/ui/text-shimmer';

export function ChatSettingsTab() {
  const id = useStore(chatId);
  const title = useStore(descriptionStore) || '';
  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentDescription, toggleEditMode } =
    useEditChatDescription({
      initialDescription: title,
      syncWithGlobalStore: true,
    });

  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    
    if (id) {
      fetch(`/api/data/chats/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data) {
            setIsPublic(data.isPublic || false);
            setDescription(data.description || '');
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id]);

  const handleVisibilityChange = async (newVisibility: boolean) => {
    setIsPublic(newVisibility);
    if (!id) return;
    try {
      const res = await fetch(`/api/data/chats/${id}/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: newVisibility }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      toast.success(newVisibility ? 'App is now Public' : 'App is now Private');
    } catch (e) {
      toast.error('Error updating visibility');
      setIsPublic(!newVisibility);
    }
  };

  const handleCloneApp = async () => {
    if (!id) return;
    setIsCloning(true);
    try {
      const res = await fetch(`/api/data/chats/${id}/clone`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to clone app');
      const { newId } = await res.json();
      toast.success('App cloned successfully!');
      
      window.location.href = `/chat/${newId}`;
    } catch (e) {
      toast.error('Error cloning app');
      setIsCloning(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 gap-6">
      <div className="flex flex-col space-y-1.5">
        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Chat Settings</DialogTitle>
        <DialogDescription className="text-gray-500 dark:text-gray-400 mt-2">
          Manage your chat settings, visibility, and app cloning.
        </DialogDescription>
      </div>

      {}
      <div className="flex flex-col gap-2 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
        <h4 className="text-sm font-medium text-black dark:text-gray-100">Chat Name</h4>
        {editing ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
              value={currentDescription}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              onMouseDown={handleSubmit}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
            >
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[#525258] dark:text-gray-300 text-sm">{title || 'Untitled Chat'}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleEditMode();
              }}
              className="text-[#0099ff] dark:text-indigo-400 text-sm hover:underline"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {}
      <div className="flex flex-col gap-2 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
        <h4 className="text-sm font-medium text-black dark:text-gray-100">
          Description
        </h4>
        <div className="text-sm text-[#525258] dark:text-gray-400 min-h-[40px] flex items-center">
          {isLoading ? (
            <TextShimmer>Loading...</TextShimmer>
          ) : description ? (
            description
          ) : (
            'Description will be automatically generated after a few messages...'
          )}
        </div>
      </div>

      {}
      <div className="flex flex-col gap-2 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
        <h4 className="text-sm font-medium text-black dark:text-gray-100">App Visibility</h4>
        <p className="text-sm text-[#525258] dark:text-gray-400 mb-2">
          Public apps can be viewed by anyone with the link. Private apps are only visible to you.
        </p>
        <div className="flex items-center gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="visibility"
              className="text-indigo-600 focus:ring-indigo-500"
              checked={!isPublic}
              onChange={() => handleVisibilityChange(false)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">
              Private
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="visibility"
              className="text-indigo-600 focus:ring-indigo-500"
              checked={isPublic}
              onChange={() => handleVisibilityChange(true)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">
              Public
            </span>
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-[#F3F0F5] dark:bg-[#111] p-4 rounded-lg border border-[#D6D5DE] dark:border-[#333]">
        <h4 className="text-sm font-medium text-black dark:text-gray-100">Clone App</h4>
        <p className="text-sm text-[#525258] dark:text-gray-400 mb-2">
          Create a copy of this app and its codebase in a new chat. Your conversational history will not be carried over.
        </p>
        <button
          onClick={handleCloneApp}
          disabled={isCloning}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCloning ? (
            <div className="i-ph:spinner animate-spin w-5 h-5" />
          ) : (
            <div className="i-ph:copy w-5 h-5 text-gray-500" />
          )}
          {isCloning ? 'Cloning...' : 'Create Copy'}
        </button>
        <span className='text-sm border border-black/20 px-2 py-2 rounded-md'> <span className='bg-black/20 px-1 py-0.5 rounded-sm font-medium'>!Important:</span><span className='ml-2'>When you clone a chat, it copies the `.env` file to the new chat, so be careful with it.</span></span>
      </div>
    </div>
  );
}
