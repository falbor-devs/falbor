import { map } from 'nanostores';

export type CanvasNode = {
    id: string;
    type: 'text' | 'flowchart' | 'button' | 'generating';
    x: number;
    y: number;
    content?: string;
    label?: string;
};

export const canvasStore = map<{
    nodes: CanvasNode[];
    focusTrigger: { x: number; y: number; timestamp: number } | null;
}>({
    nodes: [],
    focusTrigger: null,
});

export const canvasActions = {
    focus: (x: number, y: number) => {
        canvasStore.setKey('focusTrigger', { x, y, timestamp: Date.now() });
        // Add a temporary generating node there
        const nodes = canvasStore.get().nodes;
        const genNode = nodes.find(n => n.type === 'generating');
        if (genNode) {
            canvasStore.setKey('nodes', nodes.map(n => n.type === 'generating' ? { ...n, x, y } : n));
        } else {
            canvasStore.setKey('nodes', [...nodes, { id: 'gen-node', type: 'generating', x, y }]);
        }
    },
    draw: (id: string, type: CanvasNode['type'], x: number, y: number, content?: string, label?: string) => {
        console.log(`[canvasStore] Drawing element ${id} at ${x},${y}`);
        const nodes = canvasStore.get().nodes.filter(n => n.type !== 'generating' && n.id !== id);
        canvasStore.setKey('nodes', [...nodes, { id, type, x, y, content, label }]);
    },
};
