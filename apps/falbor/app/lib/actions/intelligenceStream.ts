'use client';

import { v4 } from 'uuid';
import { aiSidebarStore } from '~/lib/stores/aiSidebar';
import { consumeAgentStream } from '~/lib/agent-ui/consumeStream';
import { beginUiRun } from '~/lib/agent-ui/apply';
import { getWorkspaceIntelligence } from '~/lib/actions/intelligence';

export async function runDeepIntelligenceResearch(
  workspaceId: string,
  onComplete: (data: any) => void,
  onError: (err: string) => void
) {
  aiSidebarStore.startGeneration();
  beginUiRun();

  aiSidebarStore.addEvent({
    id: v4(),
    type: 'user',
    title: 'Generate Product Intelligence',
    status: 'completed',
    details: ['Triggered deep research and market analysis'],
  });

  let result: any = null;
  const grab = (candidate: any) => {
    const d = candidate?.healthScore !== undefined ? candidate : candidate?.data;
    if (d && d.healthScore !== undefined) result = d;
  };

  try {
    const response = await fetch('/api/intelligence/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        context: 'Analyze the product thoroughly based on the workspace context.',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }

    const { errors } = await consumeAgentStream(response, {
      onToolCall: (name, args) => {
        if (name === 'submit_intelligence') grab(args);
      },
      onToolResult: (name, res) => {
        if (name === 'submit_intelligence') grab(res);
        if (name === 'search_competitors' && Array.isArray(res?.foundLinks) && res.foundLinks.length > 0) {
          aiSidebarStore.addEvent({
            id: v4(),
            type: 'links',
            title: 'Sources',
            links: res.foundLinks,
            status: 'completed',
          });
        }
      },
    });

    // The server saves the result inside submit_intelligence. If we couldn't parse it from the
    // stream, read what the server stored before giving up.
    if (!result) {
      const stored = await getWorkspaceIntelligence(workspaceId).catch(() => null);
      if (stored) result = stored;
    }

    if (!result) {
      throw new Error(errors[0] || 'The AI finished without submitting Product Intelligence. Please try again.');
    }

    aiSidebarStore.addEvent({
      id: v4(),
      type: 'status',
      title: 'Product Intelligence generated',
      status: 'completed',
    });
    onComplete(result);
  } catch (error: any) {
    console.error('Deep research failed', error);
    const message = error?.message || 'An unknown error occurred';
    aiSidebarStore.settleActive();
    aiSidebarStore.addEvent({
      id: v4(),
      type: 'status',
      title: 'Research failed',
      status: 'error',
      details: [message],
    });
    onError(message);
  } finally {
    aiSidebarStore.settleActive();
    aiSidebarStore.finishGeneration();
    aiSidebarStore.persistNow();
  }
}