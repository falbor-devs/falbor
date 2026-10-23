import { db } from '~/lib/db';
import { automationEvents } from '~/lib/db/schema';

export type AutomationEventType =
  | 'reddit_connected'
  | 'reddit_disconnected'
  | 'reddit_token_refreshed'
  | 'reddit_connection_error'
  | 'extension_pairing_created'
  | 'extension_connected'
  | 'extension_disconnected'
  | 'discovery_started'
  | 'discovery_completed'
  | 'discovery_failed'
  | 'opportunity_discovered'
  | 'opportunity_analyzed'
  | 'analysis_failed'
  | 'draft_created'
  | 'draft_regenerated'
  | 'draft_saved'
  | 'draft_approved'
  | 'draft_rejected'
  | 'draft_cancelled'
  | 'publication_requested'
  | 'execution_claimed'
  | 'publication_submitted'
  | 'publication_verified'
  | 'publication_failed'
  | 'publication_outcome_unknown'
  | 'publication_removed'
  | 'metrics_updated'
  | 'task_failed'
  | 'agent_session_started'
  | 'agent_session_paused'
  | 'agent_session_resumed'
  | 'agent_session_stop_requested'
  | 'agent_session_stopped'
  | 'agent_session_completed'
  | 'agent_session_error'
  | 'agent_discussion_inspected'
  | 'agent_draft_created'
  | 'agent_limit_reached'
  | 'agent_policy_blocked';

export async function recordAutomationEvent(params: {
  workspaceId: string;
  userId?: string | null;
  type: AutomationEventType;
  message: string;
  opportunityId?: string | null;
  draftId?: string | null;
  publicationId?: string | null;
  url?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(automationEvents).values({
      workspaceId: params.workspaceId,
      userId: params.userId || null,
      type: params.type,
      message: params.message,
      opportunityId: params.opportunityId || null,
      draftId: params.draftId || null,
      publicationId: params.publicationId || null,
      url: params.url || null,
      meta: params.meta || {},
    });
  } catch (error) {
    console.error('Failed to record automation event:', error);
  }
}
