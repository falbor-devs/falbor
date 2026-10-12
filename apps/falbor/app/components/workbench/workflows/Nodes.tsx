import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { classNames } from '~/utils/classNames';

const NodeWrapper = ({ 
  children, 
  title, 
  icon, 
  colorClass,
  selected 
}: { 
  children: React.ReactNode, 
  title: string, 
  icon: string, 
  colorClass: string,
  selected?: boolean
}) => (
  <div className={classNames(
    "rounded-lg border shadow-sm bg-falbor-elements-background-depth-1 min-w-[200px] overflow-hidden transition-all duration-200",
    selected ? "border-accent-500 shadow-md ring-1 ring-accent-500/50" : "border-falbor-elements-borderColor hover:border-falbor-elements-textTertiary"
  )}>
    <div className={classNames("px-3 py-2 border-b flex items-center gap-2", colorClass)}>
      <div className={classNames(icon, "text-white")} />
      <div className="font-medium text-sm text-white">{title}</div>
    </div>
    <div className="p-3">
      {children}
    </div>
  </div>
);

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <NodeWrapper 
        title={data.label as string || 'Trigger'} 
        icon="i-ph:lightning-fill" 
        colorClass="bg-yellow-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.description as string || 'Starts the workflow'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-yellow-500" />
    </>
  );
});
TriggerNode.displayName = 'TriggerNode';

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-blue-500" />
      <NodeWrapper 
        title={data.label as string || 'Action'} 
        icon="i-ph:play-fill" 
        colorClass="bg-blue-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.description as string || 'Performs a task'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-blue-500" />
    </>
  );
});
ActionNode.displayName = 'ActionNode';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-purple-500" />
      <NodeWrapper 
        title={data.label as string || 'Condition'} 
        icon="i-ph:git-branch-fill" 
        colorClass="bg-purple-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.description as string || 'If / Else'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-green-500" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-red-500" />
    </>
  );
});
ConditionNode.displayName = 'ConditionNode';

export const WaitNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-orange-500" />
      <NodeWrapper 
        title={data.label as string || 'Wait'} 
        icon="i-ph:clock-fill" 
        colorClass="bg-orange-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.description as string || 'Delay execution'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-orange-500" />
    </>
  );
});
WaitNode.displayName = 'WaitNode';

export const HttpRequestNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-cyan-500" />
      <NodeWrapper 
        title={data.label as string || 'HTTP Request'} 
        icon="i-ph:globe-hemisphere-west-fill" 
        colorClass="bg-cyan-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.method as string || 'GET'} {data.url as string || 'https://...'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-cyan-500" />
    </>
  );
});
HttpRequestNode.displayName = 'HttpRequestNode';

export const CodeExecuteNode = memo(({ data, selected }: NodeProps) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-pink-500" />
      <NodeWrapper 
        title={data.label as string || 'JS/TS Code'} 
        icon="i-ph:code-fill" 
        colorClass="bg-pink-500"
        selected={selected}
      >
        <div className="text-xs text-falbor-elements-textSecondary">
          {data.description as string || 'Run Custom Code'}
        </div>
      </NodeWrapper>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-falbor-elements-background-depth-1 bg-pink-500" />
    </>
  );
});
CodeExecuteNode.displayName = 'CodeExecuteNode';

export const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
  waitNode: WaitNode,
  httpRequestNode: HttpRequestNode,
  codeExecuteNode: CodeExecuteNode,
};
