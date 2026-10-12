import React, { memo } from 'react';

export const Sidebar = memo(() => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 p-4 flex flex-col gap-4">
      <h3 className="font-semibold text-falbor-elements-textPrimary">Workflow Nodes</h3>
      <div className="text-xs text-falbor-elements-textSecondary mb-2">Drag these nodes to the canvas</div>
      
      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'triggerNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:lightning-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">Trigger</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">Starts the workflow</div>
      </div>

      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'actionNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:play-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">Action</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">Performs a task</div>
      </div>

      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'conditionNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:git-branch-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">Condition</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">If/Else logic</div>
      </div>
      
      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'waitNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:clock-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">Wait</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">Delay execution</div>
      </div>

      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'httpRequestNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:globe-hemisphere-west-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">HTTP Request</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">Make an API call</div>
      </div>

      <div 
        className="p-3 border border-falbor-elements-borderColor rounded-md bg-falbor-elements-background-depth-1 cursor-grab hover:border-accent-500 transition-colors" 
        onDragStart={(event) => onDragStart(event, 'codeExecuteNode')} 
        draggable
      >
        <div className="flex items-center gap-2">
          <div className="i-ph:code-fill text-xl text-falbor-elements-textSecondary" />
          <div className="font-medium">JS/TS Code</div>
        </div>
        <div className="text-xs text-falbor-elements-textTertiary mt-1 ml-7">Run custom script</div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
