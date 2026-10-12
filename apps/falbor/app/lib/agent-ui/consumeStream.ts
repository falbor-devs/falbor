'use client';

import { v4 } from 'uuid';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { applyUiCall } from './apply';
import { isUiTool } from './schema';

export type StreamHandlers = {
    /** Called for real (non-UI) tool calls. */
    onToolCall?: (name: string, args: any) => void;
    /** Called for real (non-UI) tool results. */
    onToolResult?: (name: string, result: any) => void;
};

/**
 * Reads an AI SDK data stream progressively:
 *  - text deltas become 'text' events (a tool call or new step starts a new text block)
 *  - ui_* tool calls are applied to the store immediately
 *  - other tool calls/results are forwarded to handlers
 * Stream errors are collected (not thrown) so callers can decide what to do.
 */
export async function consumeAgentStream(res: Response, handlers: StreamHandlers = {}) {
    if (!res.body) throw new Error('Empty response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const toolNames = new Map<string, string>();
    const errors: string[] = [];

    let buffer = '';
    let textId: string | null = null;
    let text = '';

    const flushText = () => {
        if (textId) aiSidebarStore.updateEvent(textId, { status: 'completed' });
        textId = null;
        text = '';
    };

    const pushText = (delta: string) => {
        text += delta;
        if (!text.trim()) return;
        const visible = text.trimStart();
        if (!textId) {
            textId = v4();
            aiSidebarStore.addEvent({ id: textId, type: 'text', title: visible, status: 'active' });
        } else {
            aiSidebarStore.updateEvent(textId, { title: visible });
        }
    };

    const handleLine = (line: string) => {
        const i = line.indexOf(':');
        if (i < 1) return;
        const code = line.slice(0, i);
        let payload: any;
        try {
            payload = JSON.parse(line.slice(i + 1));
        } catch {
            return;
        }

        switch (code) {
            case '0':
                if (typeof payload === 'string') pushText(payload);
                break;
            case 'f': // new step starts
                flushText();
                break;
            case '9': { // tool call
                flushText();
                const name = payload?.toolName as string;
                toolNames.set(payload?.toolCallId, name);
                if (isUiTool(name)) {
                    applyUiCall(name, payload?.args);
                } else {
                    const toolInvocation = {
                        state: 'call' as const,
                        toolCallId: payload?.toolCallId,
                        toolName: name,
                        args: payload?.args || {},
                    };
                    aiSidebarStore.addEvent({
                        id: payload?.toolCallId || v4(),
                        type: 'tool',
                        title: name,
                        status: 'active',
                        toolInvocations: [{ type: 'tool-invocation', toolInvocation }],
                    } as any);
                    handlers.onToolCall?.(name, payload?.args);
                }
                break;
            }
            case 'a': { // tool result
                const name = toolNames.get(payload?.toolCallId);
                if (name && !isUiTool(name)) {
                    const existingEvent = [...aiSidebarStore.events.get()].find((e) => e.id === payload?.toolCallId);
                    if (existingEvent) {
                        const prevInvocations = (existingEvent as any).toolInvocations || [];
                        const updatedInvocations = prevInvocations.map((inv: any) => ({
                            ...inv,
                            toolInvocation: {
                                ...inv.toolInvocation,
                                state: 'result' as const,
                                result: payload?.result,
                            },
                        }));
                        aiSidebarStore.updateEvent(existingEvent.id, {
                            status: 'completed',
                            toolInvocations: updatedInvocations,
                        } as any);
                    }
                    handlers.onToolResult?.(name, payload?.result);
                }
                break;
            }
            case '3': // error
                errors.push(typeof payload === 'string' ? payload : JSON.stringify(payload));
                break;
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line) handleLine(line);
        }
    }
    if (buffer.trim()) handleLine(buffer.trim());

    flushText();
    return { errors };
}