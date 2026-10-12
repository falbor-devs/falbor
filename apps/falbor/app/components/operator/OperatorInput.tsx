import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { IoMicOutline, IoMic } from 'react-icons/io5';

interface OperatorInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
}

export function OperatorInput({ onSubmit, disabled }: OperatorInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // If we have a transcript when it ends, submit it
          setTranscript((prev) => {
            if (prev.trim() && !disabled) {
              onSubmit(prev.trim());
            }
            return ''; // clear after submit
          });
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [disabled, onSubmit]);

  useEffect(() => {
    const handleAutoStart = () => {
      if (!isListening && !disabled) {
        toggleListening(true);
      }
    };
    window.addEventListener('falbor:autoStartMic', handleAutoStart);
    return () => window.removeEventListener('falbor:autoStartMic', handleAutoStart);
  }, [isListening, disabled]);

  const toggleListening = async (isAuto = false) => {
    if (disabled) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        if (!recognitionRef.current) {
          throw new Error('Speech recognition not supported');
        }
        // Request permission explicitly before starting
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Could not start speech recognition', e);
        if (!isAuto) {
          alert('Could not start microphone. Please ensure permissions are granted and your browser supports speech recognition.');
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 mt-2 w-full bg-white dark:bg-[#1a1a1a] p-1 rounded-full border border-gray-200 dark:border-[#333] shadow-sm"
    >
      <div className="flex-1 px-3 py-1 text-sm text-gray-800 dark:text-gray-200 opacity-80 italic truncate">
        {isListening ? (transcript || "Listening...") : "Click the mic to speak..."}
      </div>
      <button
        type="button"
        onClick={() => toggleListening()}
        disabled={disabled}
        className={`p-2 rounded-full text-white transition-colors disabled:opacity-50 flex items-center justify-center ${
          isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isListening ? <IoMic size={16} /> : <IoMicOutline size={16} />}
      </button>
    </motion.div>
  );
}
