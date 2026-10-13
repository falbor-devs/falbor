import { classNames } from '~/utils/classNames';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { Button } from '~/components/ui/Button';
import type { BuildState, StageStatus } from '~/lib/workspace-build/stages';

interface WorkspaceBuildProgressProps {
  build: BuildState;
  onRetry: () => void;
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'completed') {
    return <span className="i-ph:check-circle-fill text-xl text-green-500" />;
  }

  if (status === 'running') {
    return <span className="i-svg-spinners:90-ring-with-bg text-xl text-falbor-elements-textPrimary" />;
  }

  if (status === 'failed') {
    return <span className="i-ph:warning-circle-fill text-xl text-red-500" />;
  }

  return <span className="i-ph:circle text-xl text-falbor-elements-textTertiary" />;
}

export function WorkspaceBuildProgress({ build, onRetry }: WorkspaceBuildProgressProps) {
  const hasFailed = build.status === 'failed';

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 p-8">
        <h2 className="text-lg font-semibold text-falbor-elements-textPrimary">
          {hasFailed ? 'Workspace build paused' : 'Building your workspace'}
        </h2>
        <p className="mt-1 mb-6 text-sm text-falbor-elements-textSecondary">
          {hasFailed
            ? 'A stage could not be completed. Finished stages are kept.'
            : 'Our AI is researching your product and market. You can leave this page and come back.'}
        </p>
        <ul className="flex flex-col gap-3">
          {build.stages.map((stage) => (
            <li key={stage.key} className="flex items-center gap-3">
              <StageIcon status={stage.status} />
              <span
                className={classNames('text-sm', {
                  'text-falbor-elements-textPrimary': stage.status === 'completed',
                  'text-falbor-elements-textTertiary': stage.status === 'pending',
                  'text-red-500': stage.status === 'failed',
                })}
              >
                {stage.status === 'running' ? <TextShimmer>{stage.label}</TextShimmer> : stage.label}
              </span>
            </li>
          ))}
        </ul>
        {hasFailed && (
          <div className="mt-6 flex flex-col gap-3">
            {build.error && <p className="text-xs text-falbor-elements-textTertiary">{build.error}</p>}
            <Button variant="outline" onClick={onRetry} className="self-start">
              Retry failed stage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
