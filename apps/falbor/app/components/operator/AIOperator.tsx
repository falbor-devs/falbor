'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@nanostores/react';
import { useOperatorStore } from '../../lib/operator/context';
import { processOperatorResponse } from '../../lib/operator/executor';
import { OperatorBubble } from './OperatorBubble';
import { OperatorWave } from './OperatorWave';
import { SimulatedCursor } from './SimulatedCursor';
import { useAuth } from '../../hooks/useAuth';
import { streamingState } from '../../lib/stores/streaming';

export function AIOperator() {
  const store = useOperatorStore();
  const { user } = useAuth();
  const [isActivated, setIsActivated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStreaming = useStore(streamingState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasStreamingRef = useRef(false);
  const speechBlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeechBlockedRef = useRef(false);


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechDetectedRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMediaRecorder = () => {
    if (!streamRef.current || isRecordingRef.current) return;

    try {
      console.log("[AI Operator Debug] Starting MediaRecorder...");
      const recorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        isRecordingRef.current = false;
        console.log("[AI Operator Debug] MediaRecorder stopped. Processing audio...");

        if (!speechDetectedRef.current) {
          console.log("[AI Operator Debug] No speech detected, ignoring audio chunk.");
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return; // Ignore tiny files

        try {
          setTranscript("Transcribing...");
          store.setThinking(true);

          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            console.log("[AI Operator Debug] Transcribed text:", data.text);
            if (data.text && data.text.trim()) {
              setTranscript(data.text);
              handleMessageSubmit(data.text);
            }
          } else {
            console.error("[AI Operator Debug] Transcription API error");
          }
        } catch (err) {
          console.error("[AI Operator Debug] Failed to transcribe:", err);
        } finally {
          store.setThinking(false);
          setTranscript("");
          speechDetectedRef.current = false;
        }
      };

      recorder.start();
      isRecordingRef.current = true;
    } catch (err) {
      console.error("[AI Operator Debug] MediaRecorder start failed:", err);
    }
  };

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const startAudioAnalyzer = async (shouldRecord = false) => {
    try {
      console.log("[AI Operator Debug] Requesting microphone stream for analyzer...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      // High-pass filter to block low frequency breath/exhalations and background hums (under 180Hz)
      const biquadFilter = audioCtx.createBiquadFilter();
      biquadFilter.type = 'highpass';
      biquadFilter.frequency.setValueAtTime(180, audioCtx.currentTime);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(biquadFilter);
      biquadFilter.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      console.log("[AI Operator Debug] Audio Context, Filter, and Analyser initialized.");

      // Start recording only if fallback requires it (Whisper fallback)
      if (shouldRecord) {
        startMediaRecorder();
      }

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(average);

        // Voice Activity Detection (VAD) - only when fallback recording is enabled
        if (shouldRecord) {
          if (average > 15) { // Speech threshold (raised slightly to ignore noise)
            speechDetectedRef.current = true;
            // Clear silence timer
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
          } else if (average <= 15 && speechDetectedRef.current && !silenceTimeoutRef.current) {
            // Silence detected - set a timeout of 800ms to submit faster
            silenceTimeoutRef.current = setTimeout(() => {
              console.log("[AI Operator Debug] Silence timeout reached. Stopping recording.");
              stopMediaRecorder();
            }, 800);
          }
        }

        if (stream.active) {
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();
    } catch (e) {
      console.error('[AI Operator Debug] Audio analyzer error (likely mic blocked or busy):', e);
    }
  };

  const stopAudioAnalyzer = () => {
    console.log("[AI Operator Debug] Stopping Audio Analyzer...");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    stopMediaRecorder();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && isActivated) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        console.log("[AI Operator Debug] Initializing native SpeechRecognition...");
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          console.log("[AI Operator Debug] SpeechRecognition started listening.");
          setIsListening(true);
          // Only analyze audio level for visual wave, do not start recording/VAD (saving credits!)
          startAudioAnalyzer(false);
        };

        rec.onresult = (event: any) => {
          if (isSpeaking || store.isThinking || isSpeechBlockedRef.current) {
            return;
          }

          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          console.log("[AI Operator Debug] Current speech transcript:", currentTranscript);
          setTranscript(currentTranscript);

          if (event.results[event.results.length - 1].isFinal) {
            const finalText = currentTranscript.trim();
            console.log("[AI Operator Debug] Final phrase recorded:", finalText);
            if (finalText) {
              store.setVisibility(true);
              setIsActivated(true);
              handleMessageSubmit(finalText);
            }
          }
        };


        rec.onerror = (e: any) => {
          console.error('[AI Operator Debug] SpeechRecognition error:', e.error, e.message);
        };

        rec.onend = () => {
          console.log("[AI Operator Debug] SpeechRecognition session ended.");
          setIsListening(false);
          stopAudioAnalyzer();
        };

        recognitionRef.current = rec;
      } else {
        // Fallback for Firefox (MediaRecorder + Whisper VAD loop)
        console.log("[AI Operator Debug] SpeechRecognition is NOT supported. Using MediaRecorder fallback.");

        setIsListening(true);
        startAudioAnalyzer(true);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
        recognitionRef.current = null;
      } else {
        stopAudioAnalyzer();
      }
    };
  }, [isActivated]);

  const shouldListen = isActivated && !isStreaming;

  // Sync speech block state
  useEffect(() => {
    if (isSpeaking || store.isThinking) {
      isSpeechBlockedRef.current = true;
      if (speechBlockTimeoutRef.current) {
        clearTimeout(speechBlockTimeoutRef.current);
        speechBlockTimeoutRef.current = null;
      }
    } else {
      speechBlockTimeoutRef.current = setTimeout(() => {
        isSpeechBlockedRef.current = false;
      }, 800);
    }
    return () => {
      if (speechBlockTimeoutRef.current) {
        clearTimeout(speechBlockTimeoutRef.current);
      }
    };
  }, [isSpeaking, store.isThinking]);

  // Control listening state based on operator status
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (shouldListen) {
      if (!isListening) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("[AI Operator Debug] SpeechRecognition start pending or already running:", e);
        }
      }
    } else {
      if (isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("[AI Operator Debug] Failed to stop SpeechRecognition:", e);
        }
      }
    }
  }, [shouldListen, isListening]);


  // Handle OpenAI TTS
  useEffect(() => {
    if (store.currentMessage && isActivated && typeof window !== 'undefined') {
      setIsSpeaking(true);

      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: store.currentMessage }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('TTS failed');
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          if (audioRef.current) {
            audioRef.current.pause();
          }

          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            URL.revokeObjectURL(url);
          };

          audio.play().catch((err) => {
            console.error('Audio playback failed:', err);
            setIsSpeaking(false);
          });
        })
        .catch((err) => {
          console.error('TTS error:', err);
          setIsSpeaking(false);
        });
    }
  }, [store.currentMessage, isActivated]);

  // Watch streaming state to auto-hide operator while building
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      // Stop listening while building to save credits and keep UI clean
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
      setIsListening(false);
      store.setVisibility(false);
    } else if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      // When building finishes, automatically show the operator and greet the user
      store.setVisibility(true);
      setIsActivated(true);
      store.setCurrentMessage("The site is ready! Let me know if you want any changes.");
    }
  }, [isStreaming]);

  const handleActivate = async () => {
    try {
      setIsActivated(true);

      // Speak the welcome greeting immediately
      const greeting = `Hello ${user?.displayName || (user as any)?.username || (user as any)?.email || 'there'}, what would you like to build today?`;
      store.setCurrentMessage(greeting);
      store.setIsAskingUser(true);
    } catch (err) {
      console.error('Failed to activate operator:', err);
    }
  };

  const handleMessageSubmit = async (message: string) => {
    store.setThinking(true);
    store.setIsAskingUser(false);

    // Show transcript temporarily
    setTranscript(message);

    try {
      const response = await fetch('/api/operator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: store.memory,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await processOperatorResponse(data);
      } else {
        store.setCurrentMessage('Sorry, I encountered an error. Let me try again.');
        store.setIsAskingUser(true);
      }
    } catch (error) {
      store.setCurrentMessage('Sorry, I encountered an error. Let me try again.');
      store.setIsAskingUser(true);
    } finally {
      store.setThinking(false);
      setTranscript('');
    }
  };

  if (!store.isVisible) return null;

  return (
    <>
      <SimulatedCursor />
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isActivated ? (
          <OperatorBubble
            message={store.currentMessage}
            isAskingUser={false} // Disable text/button form in bubble
            onSubmit={handleMessageSubmit}
            isThinking={store.isThinking}
          />
        ) : (
          <div className="absolute bottom-16 right-0 mb-2 w-64 p-3 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-lg border border-gray-100 dark:border-[#333] text-center">
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
              Enable your microphone to start the hands-free AI Operator.
            </p>
            <button
              onClick={handleActivate}
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Start AI Operator
            </button>
          </div>
        )}

        <motion.button
          onClick={() => store.setOpen(!store.isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-colors relative overflow-hidden ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          <div className="relative z-10">
            <OperatorWave isThinking={store.isThinking} audioLevel={audioLevel} />
          </div>
        </motion.button>

        {/* Display live transcript above the icon for user visibility */}
        {isListening && transcript && (
          <div className="absolute bottom-16 right-0 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg max-w-[200px] truncate pointer-events-none">
            {transcript}
          </div>
        )}
      </div>
    </>
  );
}
