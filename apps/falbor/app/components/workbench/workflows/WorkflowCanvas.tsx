'use client';
import React, { useCallback, useRef, useState, memo, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  useOnSelectionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './Nodes';
import { ConfigurationPanel } from './ConfigurationPanel';
import { classNames } from '~/utils/classNames';
import * as htmlToImage from 'html-to-image';
import { useParams } from 'next/navigation';
import { useStore } from '@nanostores/react';
import { chatId as chatIdStore } from '~/lib/persistence';

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 250, y: 100 },
    data: { label: 'User Signup', description: 'When a new user registers' },
  },
];

const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

interface WorkflowCanvasProps {
  workflowId?: string | null;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
}

const WorkflowEditor = ({ workflowId: initialWorkflowId, sendMessage }: WorkflowCanvasProps) => {
  const params = useParams();
  const storeChatId = useStore(chatIdStore);
  const chatId = params.id || storeChatId;

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(initialWorkflowId || null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(!!initialWorkflowId);

  useEffect(() => {
    if (initialWorkflowId) {
      setIsLoading(true);
      fetch(`/api/workflows/${initialWorkflowId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.version) {
            setNodes(data.version.nodes || initialNodes);
            setEdges(data.version.edges || initialEdges);
            setVersionId(data.version.id);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setWorkflowId(null);
      setVersionId(null);
    }
  }, [initialWorkflowId, setNodes, setEdges]);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      if (nodes.length === 1) {
        setSelectedNodeId(nodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
  });

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label: `${type.replace('Node', '')} Node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      {isLoading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-falbor-elements-background-depth-1/80 backdrop-blur-sm">
          <div className="i-svg-spinners:90-ring-with-bg text-3xl text-accent-500 animate-spin" />
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-falbor-elements-background-depth-1"
      >
        <Controls className="bg-falbor-elements-background-depth-2 border-falbor-elements-borderColor text-falbor-elements-textPrimary fill-falbor-elements-textPrimary" />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
      
      {}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={async () => {
            setIsSaving(true);
            try {
              let thumbnailUrl = null;
              const flowElement = document.querySelector('.react-flow') as HTMLElement;
              if (flowElement) {
                
                const filter = (node: HTMLElement) => {
                  if (node?.classList?.contains('react-flow__controls') || node?.classList?.contains('react-flow__panel')) {
                    return false;
                  }
                  return true;
                };
                
                thumbnailUrl = await htmlToImage.toJpeg(flowElement, { 
                  quality: 0.5,
                  canvasWidth: 800,
                  canvasHeight: 600,
                  filter,
                  backgroundColor: '#ffffff'
                }).catch(err => {
                  console.error('Failed to capture screenshot:', err);
                  return null;
                });
              }

              const currentNodes = reactFlowInstance ? reactFlowInstance.getNodes() : nodes;
              const currentEdges = reactFlowInstance ? reactFlowInstance.getEdges() : edges;

              const res = await fetch('/api/workflows/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId, name: 'My Workflow', nodes: currentNodes, edges: currentEdges, thumbnailUrl, chatId })
              });
              
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`API error: ${res.status} - ${text}`);
              }
              
              const data = await res.json();
              if (data.success) {
                setWorkflowId(data.workflowId);
                setVersionId(data.versionId);
                toast.success('Workflow saved successfully!');
              }
            } catch (e) {
              console.error(e);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className="px-4 py-2 bg-falbor-elements-background-depth-3 text-falbor-elements-textPrimary border border-falbor-elements-borderColor rounded-md text-sm font-medium hover:bg-falbor-elements-background-depth-4 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </button>
        <button 
          onClick={async () => {
            if (!workflowId || !versionId) {
              alert('Please save the workflow first');
              return;
            }
            setIsRunning(true);
            try {
              const res = await fetch('/api/workflows/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId, versionId, inputData: { source: 'manual' } })
              });
              const data = await res.json();
              if (data.success) {
                if (sendMessage) {
                  sendMessage({} as any, `Workflow executed successfully! Execution ID: ${data.executionId}`);
                }
              }
            } catch (e) {
              console.error(e);
            } finally {
              setIsRunning(false);
            }
          }}
          disabled={isRunning || !workflowId}
          className="px-4 py-2 bg-accent-500 text-white rounded-md text-sm font-medium hover:bg-accent-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Workflow'}
        </button>
      </div>
      
      <ConfigurationPanel 
        selectedNode={selectedNode} 
        onUpdateNode={updateNodeData} 
        onClose={() => setSelectedNodeId(null)} 
      />
    </div>
  );
};

export const WorkflowCanvas = memo((props: WorkflowCanvasProps) => {
  return (
    <ReactFlowProvider>
      <WorkflowEditor {...props} />
    </ReactFlowProvider>
  );
});

WorkflowCanvas.displayName = 'WorkflowCanvas';
