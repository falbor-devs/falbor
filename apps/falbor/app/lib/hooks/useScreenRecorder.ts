import { useState, useRef } from 'react';
import { screenAnalysisPrompt } from '../common/prompts/screen-prompt';

type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error' | 'testing';

export function useScreenRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const framesRef = useRef<string[]>([]);

  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const initCaptureElements = () => {
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      videoRef.current = video;
    }
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  };

  const startRecording = async (durationMinutes: number, onComplete: (prompt: string) => void) => {
    console.log('startRecording called with duration:', durationMinutes);

    try {
      setStatus('testing');
      const testRes = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testOnly: true }),
      });
      if (!testRes.ok) {
        const errData = await testRes.json().catch(() => ({}));
        throw new Error(errData.error || 'OpenAI API test failed');
      }
    } catch (e: any) {
      console.error('API pre-check failed:', e);
      setErrorMsg(`API Check Failed: ${e.message}`);
      setStatus('error');
      return;
    }

    initCaptureElements();
    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      streamRef.current = stream;
    } catch (error) {
      console.error('Error accessing display media:', error);
      setErrorMsg('Failed to access screen recording. Did you cancel the selection?');
      setStatus('error');
      return;
    }

    try {
      const video = videoRef.current!;
      video.srcObject = stream;
      framesRef.current = [];

      // Wait for video metadata to load before playing
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // Handle user stopping stream manually via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (status === 'recording') {
          stopCaptureAndProcess(onComplete);
        }
      };

      // Dynamically calculate interval to cap at ~30 frames total to avoid OpenAI TPM limit errors
      // 30 frames at 1280px costs ~23,500 tokens, staying safely under the 30,000 TPM limit of lower-tier OpenAI accounts
      const targetFrames = 30;
      const durationMs = durationMinutes * 60 * 1000;
      const intervalMs = Math.max(1000, Math.floor(durationMs / targetFrames));

      console.log(`Setting capture interval to ${intervalMs}ms to cap frames at ${targetFrames}`);

      // Capture frames dynamically
      captureIntervalRef.current = setInterval(() => {
        captureFrame();
      }, intervalMs);

      setStatus('recording');

      setTimeRemaining(durationMinutes * 60);

      countdownRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timerRef.current = setTimeout(() => {
        stopCaptureAndProcess(onComplete);
      }, durationMs);

    } catch (error) {
      console.error('Error starting capture:', error);
      setErrorMsg('Failed to start capturing frames.');
      setStatus('error');
      stopStream();
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Scale down image to 1280px width max to save memory & payload size
    const targetWidth = 1280;
    const scale = Math.min(1, targetWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // 50% quality JPEG
      framesRef.current.push(dataUrl);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const stopCaptureAndProcess = async (onComplete: (prompt: string) => void) => {
    stopStream();
    await processRecording(onComplete);
  };

  const processRecording = async (onComplete: (prompt: string) => void) => {
    setStatus('processing');
    console.log(`Processing ${framesRef.current.length} captured frames`);

    try {
      const response = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: screenAnalysisPrompt,
          frames: framesRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error processing video frames');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setStatus('idle');
      onComplete(data.generated_prompt);
    } catch (error: any) {
      console.error('Error uploading frames to API:', error);
      setErrorMsg(error.message || 'Failed to process the recording with AI.');
      setStatus('error');
    }
  };

  const cancelRecording = () => {
    stopStream();
    setStatus('idle');
  };

  const dismissError = () => {
    setStatus('idle');
    setErrorMsg('');
  };

  return {
    status,
    errorMsg,
    timeRemaining,
    startRecording,
    cancelRecording,
    dismissError,
  };
}
