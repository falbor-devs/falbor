import React, { useState } from 'react';
import { Dialog, DialogRoot, DialogTitle, DialogDescription, DialogButton } from '~/components/ui/Dialog';
import { IoCopyOutline, IoCheckmarkOutline } from 'react-icons/io5';

interface TelegramConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  sessionTitle: string;
}

export const TelegramConnectModal: React.FC<TelegramConnectModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FalborAgent_bot';

  if (!sessionId) return null;

  const deepLink = `https://t.me/${botUsername}?start=${sessionId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(deepLink)}&color=000000&bgcolor=ffffff`;

  const handleCopy = () => {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <Dialog onClose={onClose} showCloseButton={true}>
        <div className="p-6 flex flex-col gap-4 text-falbor-elements-textPrimary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img className='shrink-0 w-10 h-10' src="/icons/connectors/telegram_agent.svg" alt="" />
            </div>
            <div>
              <DialogTitle>Connect Telegram Bot</DialogTitle>
              <DialogDescription className="text-xs">
                Sync live chat messages with: <span className="font-semibold text-blue-500">{sessionTitle}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 my-2">
            <div className="p-3 bg-white rounded-xl border border-falbor-elements-borderColor shadow-sm flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="Telegram QR Code"
                className="w-44 h-44 rounded-lg"
                loading="lazy"
              />
            </div>

            <div className="text-center max-w-xs space-y-1">
              <p className="text-xs font-semibold text-falbor-elements-textPrimary">
                Scan with your camera or open in Telegram
              </p>
              <p className="text-[11px] text-falbor-elements-textSecondary">
                Tap <strong>Start</strong> in Telegram to connect this session.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 bg-falbor-elements-background-depth-2 border border-falbor-elements-borderColor rounded-md p-1.5 pl-3">
              <span className="text-xs text-falbor-elements-textSecondary truncate flex-1 font-mono">{deepLink}</span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-medium bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor hover:bg-falbor-elements-background-depth-2 rounded-lg text-falbor-elements-textPrimary flex items-center gap-1 shrink-0 transition-colors"
              >
                {copied ? (
                  <>
                    <IoCheckmarkOutline className="text-green-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <IoCopyOutline />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-[#0099ff]/20 text-[#0099ff] font-medium text-sm rounded-md flex items-center justify-center gap-2 transition-colors"
            >
              <img className='shrink-0 w-5 h-5' src="/icons/connectors/telegram_agent.svg" alt="" />
              <span>Open Telegram App</span>
            </a>
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
};
