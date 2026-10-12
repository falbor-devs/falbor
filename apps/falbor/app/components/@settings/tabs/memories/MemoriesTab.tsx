import React, { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { Brain, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function MemoriesTab() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories(memories.filter((m) => m.id !== id));
        toast.success('Memory deleted');
      } else {
        toast.error('Failed to delete memory');
      }
    } catch (e) {
      toast.error('Failed to delete memory');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          AI Memories
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The AI learns about your preferences, habits, and friction points as you use the platform.
          It uses these memories to automatically tailor future websites and solutions directly to you.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="i-svg-spinners:90-ring-with-bg text-purple-500 text-3xl animate-spin" />
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <Brain className="w-12 h-12 text-gray-500 dark:text-gray-500 mb-4 opacity-30" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No memories stored yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 max-w-sm">
              Try recording your screen! The AI will automatically learn about your workflow and save it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {memories.map((memory) => (
              <div className="p-1 bg-[#E5E5E5] dark:bg-[#262626] rounded-xl">
                <div
                  key={memory.id}
                  className="flex items-start justify-between p-4 border border-gray-600 rounded-xl bg-white dark:bg-[#171717] shadow-[0_0_20px_rgba(168,85,247,0.25)] dark:shadow-none"
                >
                  <div className="flex-1 pr-4">
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                      {memory.content}
                    </p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-500 mt-2 font-mono">
                      Created on {new Date(memory.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title="Forget this memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
