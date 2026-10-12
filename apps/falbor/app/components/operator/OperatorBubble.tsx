import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { IoSend } from 'react-icons/io5';

interface OperatorBubbleProps {
  message: string;
  isAskingUser: boolean;
  onSubmit: (message: string) => void;
  isThinking: boolean;
}

export function OperatorBubble({ message, isAskingUser, onSubmit, isThinking }: OperatorBubbleProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isThinking) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute bottom-16 right-0 mb-2 w-64 p-3 bg-white dark:bg-[#1a1a1a] rounded-2xl rounded-br-sm shadow-lg border border-gray-100 dark:border-[#333]"
        >
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
            {message}
          </p>
          
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 mt-2 w-full bg-gray-50 dark:bg-[#111] p-1 rounded-full border border-gray-200 dark:border-[#222]"
          >
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isThinking}
              placeholder="Or type your prompt..."
              className="flex-1 bg-transparent px-3 py-1 text-xs outline-none text-gray-800 dark:text-gray-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isThinking || !value.trim()}
              className="p-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              <IoSend size={10} />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
