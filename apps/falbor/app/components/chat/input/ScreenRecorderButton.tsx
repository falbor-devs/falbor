import React, { useState, useEffect } from 'react';
import { IconButton } from '~/components/ui/IconButton';
import { DropdownItem } from '~/components/ui/Dropdown';
import { classNames } from '~/utils/classNames';
import { useScreenRecorder } from '~/lib/hooks/useScreenRecorder';
import { toast } from 'react-toastify';

interface ScreenRecorderButtonProps {
  onPromptGenerated: (prompt: string) => void;
  disabled?: boolean;
  asMenuItem?: boolean;
}

const DURATIONS = [
  { label: '20s', value: 20 / 60 },
  { label: '5m', value: 5 },
  { label: '10m', value: 10 },
  { label: '20m', value: 20 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
];

export const ScreenRecorderButton: React.FC<ScreenRecorderButtonProps> = ({ onPromptGenerated, disabled, asMenuItem }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [tier, setTier] = useState('free');
  const { status, errorMsg, timeRemaining, startRecording, cancelRecording, dismissError } = useScreenRecorder();

  useEffect(() => {
    fetch('/api/user/credits')
      .then(r => r.ok ? r.json() : {})
      .then((d: any) => {
        if (d.subscriptionTier) setTier(d.subscriptionTier.toLowerCase());
      })
      .catch(() => { });
  }, []);

  const handleStart = async (durationMinutes: number) => {
    setShowMenu(false);
    await startRecording(durationMinutes, (prompt) => {
      onPromptGenerated(prompt);
      toast.success('AI finished analyzing your screen!');
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  useEffect(() => {
    if (errorMsg) {
      toast.error(errorMsg);
      dismissError();
    }
  }, [errorMsg, dismissError]);

  return (
    <>
      {asMenuItem ? (
        <DropdownItem
          onSelect={(e) => {
            if (disabled || status === 'processing' || status === 'testing') {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            if (status === 'recording') {
              cancelRecording();
            } else {
              setShowMenu(!showMenu);
            }
          }}
          className={classNames(
            (disabled || status === 'processing' || status === 'testing') ? 'opacity-50' : '',
            (status === 'recording' || status === 'testing' || status === 'processing') ? 'text-red-500' : 'text-falbor-elements-textPrimary'
          )}
        >
          {status === 'testing' ? (
            <div className="i-svg-spinners:90-ring-with-bg text-red-500 text-xl animate-spin" />
          ) : status === 'processing' ? (
            <div className="i-ph:brain text-xl text-purple-500 animate-pulse" />
          ) : (
            <div className={classNames(status === 'recording' ? "i-ph:stop-circle text-xl" : "i-ph:video-camera text-xl", (status !== 'recording') ? "text-falbor-elements-textSecondary" : "")} />
          )}
          <span>Screen Record</span>
        </DropdownItem>
      ) : (
        <IconButton
          title="Screen Record for AI"
          disabled={disabled || status === 'processing' || status === 'testing'}
          className={classNames(
            'transition-all relative',
            (status === 'recording' || status === 'testing' || status === 'processing') ? 'text-red-500' : ''
          )}
          onClick={() => {
            if (status === 'recording') {
              cancelRecording();
            } else {
              setShowMenu(!showMenu);
            }
          }}
        >
          {status === 'testing' ? (
            <div className="i-svg-spinners:90-ring-with-bg text-red-500 text-xl animate-spin" />
          ) : status === 'processing' ? (
            <div className="i-ph:brain text-xl text-purple-500 animate-pulse" />
          ) : (
            <div className={status === 'recording' ? "i-ph:stop-circle text-xl" : "i-ph:video-camera text-xl"} />
          )}
        </IconButton>
      )}

      {status === 'recording' && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-50">
          {formatTime(timeRemaining)}
        </span>
      )}

      {showMenu && status === 'idle' && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b border-falbor-elements-borderColor text-xs font-semibold text-falbor-elements-textSecondary">
            AI Observation Duration
          </div>
          <div className="p-1 grid grid-cols-3 gap-1">
            {DURATIONS.map((dur) => {
              const isPro = dur.value >= 60;
              const isDisabled = isPro && tier === 'free';

              return (
                <button
                  key={dur.value}
                  onClick={() => !isDisabled && handleStart(dur.value)}
                  disabled={isDisabled}
                  title={isDisabled ? "Requires Pro subscription" : ""}
                  className={classNames(
                    "px-2 py-1.5 text-xs rounded transition-colors",
                    isDisabled
                      ? "text-gray-500 opacity-50 cursor-not-allowed"
                      : "text-falbor-elements-textPrimary hover:bg-falbor-elements-item-backgroundAccent hover:text-falbor-elements-item-contentAccent"
                  )}
                >
                  {dur.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
