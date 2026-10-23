'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ConfirmationDialog, Dialog, DialogRoot } from '~/components/ui/Dialog';
import { StatusPill, type StatusTone } from './StatusPill';
import { formatDateTime, formatRelativeTime } from './format';
import { CHROME_EXTENSION_URL, FIREFOX_EXTENSION_URL } from '~/lib/automation/constants';
import {
  createExtensionPairing,
  listExtensionInstallations,
  revokeExtensionInstallation,
} from '~/lib/actions/automation/extension';
import type { ExtensionInstallationItem } from '~/lib/actions/automation/extension';
import type { AutomationStatusSummary, ExtensionConnectionState } from '~/lib/automation/types';

const PRIMARY_BUTTON =
  'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0084DE] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm transition-colors disabled:opacity-50';
const DANGER_BUTTON =
  'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm transition-colors disabled:opacity-50';
const LINK_BUTTON = `${SECONDARY_BUTTON} inline-flex`;

function extensionStateLabel(state: ExtensionConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Connected';
    case 'stale':
      return 'Stale';
    case 'revoked':
      return 'Revoked';
    default:
      return 'Not connected';
  }
}

function extensionStateTone(state: ExtensionConnectionState): StatusTone {
  switch (state) {
    case 'connected':
      return 'good';
    case 'stale':
      return 'warn';
    case 'revoked':
      return 'bad';
    default:
      return 'neutral';
  }
}

function installationStateTone(state: string): StatusTone {
  if (state === 'connected') return 'good';
  if (state === 'revoked') return 'bad';
  return 'neutral';
}

export function ExtensionSetupCard({
  workspaceId,
  status,
  onChanged,
}: {
  workspaceId: string;
  status: AutomationStatusSummary;
  onChanged: () => void;
}) {
  const [installations, setInstallations] = useState<ExtensionInstallationItem[]>([]);
  const [loadingInstallations, setLoadingInstallations] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pair' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const extension = status.extension;

  const loadInstallations = useCallback(async () => {
    try {
      const items = await listExtensionInstallations(workspaceId);
      setInstallations(items);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load extension installations.');
    } finally {
      setLoadingInstallations(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setLoadingInstallations(true);
    void loadInstallations();
  }, [loadInstallations, extension.state, extension.installationId, extension.lastSeenAt]);

  useEffect(() => {
    if (pairing && extension.state === 'connected') {
      setPairing(null);
      toast.success('Browser extension connected.');
      void loadInstallations();
    }
  }, [pairing, extension.state, loadInstallations]);

  const handlePair = async () => {
    setBusy('pair');
    setError(null);
    try {
      const result = await createExtensionPairing(workspaceId);
      setPairing(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create a pairing code.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    if (!pairing) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      toast.success('Pairing code copied.');
    } catch {
      toast.error('Could not copy the code — select it manually.');
    }
  };

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    setBusy('revoke');
    setError(null);
    try {
      await revokeExtensionInstallation(workspaceId, confirmRevoke);
      toast.success('Browser extension disconnected.');
      setConfirmRevoke(null);
      await loadInstallations();
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke the extension installation.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111114] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <i className="i-ph:puzzle-piece text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Browser extension</h3>
        </div>
        <StatusPill
          label={
            extension.state === 'connected'
              ? `Connected (${extension.lastSeenAt ? formatRelativeTime(extension.lastSeenAt) : 'never checked in'})`
              : extensionStateLabel(extension.state)
          }
          tone={extensionStateTone(extension.state)}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        The extension is required because Falbor opens the exact approved comment in your own browser and detects the
        result. There is no auto-submit — you review and click post yourself.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <i className="i-ph:warning-circle shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
          <button className="ml-auto text-xs font-semibold hover:underline shrink-0" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {CHROME_EXTENSION_URL || FIREFOX_EXTENSION_URL ? (
        <div className="flex items-center gap-2 flex-wrap">
          {CHROME_EXTENSION_URL && (
            <a href={CHROME_EXTENSION_URL} target="_blank" rel="noreferrer" className={LINK_BUTTON}>
              <i className="i-ph:chrome-logo" />
              Add to Chrome
            </a>
          )}
          {FIREFOX_EXTENSION_URL && (
            <a href={FIREFOX_EXTENSION_URL} target="_blank" rel="noreferrer" className={LINK_BUTTON}>
              <i className="i-ph:firefox-logo" />
              Add to Firefox
            </a>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The extension is not published to any browser store yet. Until it is, load the unpacked development build:
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Chrome:</span> build{' '}
              <code className="font-mono text-[11px]">apps/browser-extension/dist/chrome</code>, then open{' '}
              <code className="font-mono text-[11px]">chrome://extensions</code>, enable Developer mode, and choose
              &quot;Load unpacked&quot;.
            </p>
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Firefox:</span> build{' '}
              <code className="font-mono text-[11px]">apps/browser-extension/dist/firefox</code>, then open{' '}
              <code className="font-mono text-[11px]">about:debugging</code> and use &quot;Load Temporary Add-on&quot;.
            </p>
          </div>
        </div>
      )}

      {extension.state !== 'connected' && (
        <button onClick={handlePair} disabled={busy === 'pair'} className={PRIMARY_BUTTON}>
          {busy === 'pair' ? <i className="i-ph:spinner-gap animate-spin" /> : <i className="i-ph:link" />}
          Connect extension
        </button>
      )}

      {extension.state === 'connected' && (
        <>
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span>
              Checked in {extension.lastSeenAt ? formatRelativeTime(extension.lastSeenAt) : '—'}
            </span>
            <span>Browser {extension.browser || '—'}</span>
            <span>Version {extension.version || '—'}</span>
            <span>Label {extension.label || '—'}</span>
          </div>
          <button
            onClick={() => {
              if (extension.installationId) setConfirmRevoke(extension.installationId);
            }}
            disabled={busy !== null || !extension.installationId}
            className={DANGER_BUTTON}
          >
            <i className="i-ph:plugs" />
            Revoke
          </button>
        </>
      )}

      <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Installations</h4>
        {listError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <i className="i-ph:warning-circle shrink-0 mt-0.5" />
            <span className="break-words">{listError}</span>
          </div>
        )}
        {!listError && loadingInstallations && installations.length === 0 && (
          <div className="space-y-2">
            <div className="h-10 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
            <div className="h-10 bg-gray-100 dark:bg-[#111114] rounded-lg animate-pulse" />
          </div>
        )}
        {!listError && !loadingInstallations && installations.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">No extension installations yet.</p>
        )}
        {!listError && installations.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {installations.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {item.label || item.browser || 'Browser extension'}
                    </span>
                    <StatusPill label={item.status} tone={installationStateTone(item.status)} />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {item.browser || 'Unknown browser'} {item.version ? `· v${item.version}` : ''} · Last seen{' '}
                    {item.lastSeenAt ? formatRelativeTime(item.lastSeenAt) : '—'}
                  </div>
                </div>
                {item.status !== 'revoked' && (
                  <button
                    onClick={() => setConfirmRevoke(item.installationId)}
                    disabled={busy !== null}
                    className={`${DANGER_BUTTON} !text-xs`}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DialogRoot
        open={pairing !== null}
        onOpenChange={(open) => {
          if (!open) setPairing(null);
        }}
      >
        <Dialog
          className="!w-[460px] !max-w-[92vw] p-6 bg-white dark:bg-[#0d0d10] border border-gray-200 dark:border-gray-800"
          showCloseButton={false}
        >
          {pairing && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pair the browser extension</h3>
              <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#111114] text-center">
                <div className="text-2xl font-mono font-semibold tracking-[0.3em] text-gray-900 dark:text-white select-all">
                  {pairing.code}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Expires {formatDateTime(pairing.expiresAt)}
                </div>
              </div>
              <button onClick={handleCopy} className={SECONDARY_BUTTON}>
                <i className="i-ph:copy" />
                Copy code
              </button>
              <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>Open the Falbor browser extension popup.</li>
                <li>Paste the one-time code above.</li>
                <li>Click &quot;Connect&quot;.</li>
              </ol>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setPairing(null)} className={SECONDARY_BUTTON}>
                  Close
                </button>
                <button onClick={onChanged} className={PRIMARY_BUTTON}>
                  <i className="i-ph:arrow-clockwise" />
                  Done, refresh status
                </button>
              </div>
            </div>
          )}
        </Dialog>
      </DialogRoot>

      <ConfirmationDialog
        isOpen={confirmRevoke !== null}
        onClose={() => {
          if (busy !== 'revoke') setConfirmRevoke(null);
        }}
        onConfirm={handleRevoke}
        title="Disconnect browser extension"
        description="This installation will no longer be able to pick up or report publication tasks for this workspace. You can pair it again with a new code."
        confirmLabel="Revoke"
        variant="destructive"
        isLoading={busy === 'revoke'}
      />
    </section>
  );
}
