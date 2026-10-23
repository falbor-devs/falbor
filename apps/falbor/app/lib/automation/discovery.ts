import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~/lib/db';
import { automationDiscoveryRuns, automationOpportunities } from '~/lib/db/schema';
import { requireRedditContext } from './auth';
import { DISCOVERY_MAX_POST_AGE_DAYS, DISCOVERY_POSTS_PER_QUERY } from './constants';
import { loadProductContext } from './context';
import { recordAutomationEvent } from './events';
import { buildDiscoveryQueries, formatSubreddit } from './queries';
import { searchRedditPosts, type RedditPost } from './reddit';
import type { DiscoveryQuery, DiscoveryRunStatus } from './types';

const QUERY_DELAY_MS = 1200;
const MAX_DISCOVERY_EVENT_ROWS = 25;

export interface DiscoveryRunResult {
  runId: string;
  status: DiscoveryRunStatus;
  found: number;
  upserted: number;
  queries: DiscoveryQuery[];
  error: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function postExternalId(post: RedditPost): string {
  return post.fullname.toLowerCase();
}

export async function runDiscovery(
  workspaceId: string,
  userId: string,
  options: { queries?: DiscoveryQuery[]; limit?: number } = {},
): Promise<DiscoveryRunResult> {
  const reddit = await requireRedditContext(workspaceId);
  const settings = await db.query.automationSettings.findFirst({
    where: (t, { eq: e }) => e(t.workspaceId, workspaceId),
  });
  const context = await loadProductContext(workspaceId);

  const keywords = stringArray(settings?.keywords);
  const blockedSubreddits = new Set(
    stringArray(settings?.blockedSubreddits)
      .map((subreddit) => formatSubreddit(subreddit).toLowerCase())
      .filter(Boolean),
  );
  const baseQueries = options.queries?.length
    ? options.queries
    : buildDiscoveryQueries(context, keywords, settings?.queriesPerRun ?? 5);
  const queries = options.limit && options.limit > 0 ? baseQueries.slice(0, options.limit) : baseQueries;

  const [run] = await db
    .insert(automationDiscoveryRuns)
    .values({
      workspaceId,
      userId,
      status: 'running',
      queries,
      queriesTotal: queries.length,
      startedAt: new Date(),
    })
    .returning({ id: automationDiscoveryRuns.id });

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'discovery_started',
    message: `Discovery started with ${queries.length} ${queries.length === 1 ? 'query' : 'queries'}.`,
    meta: { runId: run.id },
  });

  const cutoffMs = Date.now() - DISCOVERY_MAX_POST_AGE_DAYS * 86_400_000;
  const deduped = new Map<string, RedditPost>();
  const queryErrors: string[] = [];
  let queriesCompleted = 0;
  let resultsFound = 0;
  let runStatus: 'completed' | 'partial' = 'completed';
  let runError: string | null = null;

  const persistProgress = async () => {
    await db
      .update(automationDiscoveryRuns)
      .set({ queriesCompleted, resultsFound, updatedAt: new Date() })
      .where(eq(automationDiscoveryRuns.id, run.id));
  };

  for (let index = 0; index < queries.length; index += 1) {
    if (index > 0) await sleep(QUERY_DELAY_MS);
    const query = queries[index];

    const search = await searchRedditPosts(reddit.accessToken, {
      query: query.query,
      sort: 'relevance',
      time: 'month',
      limit: DISCOVERY_POSTS_PER_QUERY,
      username: reddit.username,
    });

    if (!search.ok) {
      if (search.rateLimited) {
        runStatus = 'partial';
        runError = `Reddit rate limit reached after ${queriesCompleted} of ${queries.length} queries. ${search.error}`;
        break;
      }
      if (search.status === 401 || search.status === 403) {
        runError = 'Reddit authorization is invalid or expired. Reconnect your Reddit account.';
        const failedAt = new Date();
        await db
          .update(automationDiscoveryRuns)
          .set({
            status: 'failed',
            queriesCompleted,
            resultsFound,
            errorMessage: runError,
            completedAt: failedAt,
            updatedAt: failedAt,
          })
          .where(eq(automationDiscoveryRuns.id, run.id));
        await recordAutomationEvent({
          workspaceId,
          userId,
          type: 'discovery_failed',
          message: runError,
          meta: { runId: run.id },
        });
        throw new Error(runError);
      }
      queryErrors.push(`"${query.query}": ${search.error}`);
      queriesCompleted += 1;
      await persistProgress();
      continue;
    }

    for (const post of search.data) {
      if (post.over18) continue;
      if (post.createdUtc && post.createdUtc * 1000 < cutoffMs) continue;
      const subreddit = formatSubreddit(post.subreddit).toLowerCase();
      if (blockedSubreddits.has(subreddit)) continue;
      const externalId = postExternalId(post);
      if (!deduped.has(externalId)) deduped.set(externalId, post);
    }

    queriesCompleted += 1;
    resultsFound = deduped.size;
    await persistProgress();
  }

  if (queryErrors.length > 0) {
    runStatus = 'partial';
    runError = `Some queries failed: ${queryErrors.join(' | ')}`.slice(0, 1000);
  }

  const posts = Array.from(deduped.values());
  resultsFound = posts.length;

  const externalIds = posts.map(postExternalId);
  const existingRows = externalIds.length
    ? await db
        .select({ id: automationOpportunities.id, externalId: automationOpportunities.externalId })
        .from(automationOpportunities)
        .where(
          and(
            eq(automationOpportunities.workspaceId, workspaceId),
            inArray(automationOpportunities.externalId, externalIds),
          ),
        )
    : [];
  const existingIds = new Map(existingRows.map((row) => [row.externalId, row.id]));

  const toInsert = posts.filter((post) => !existingIds.has(postExternalId(post)));
  const toUpdate = posts.filter((post) => existingIds.has(postExternalId(post)));

  let inserted: Array<{ id: string; title: string; subreddit: string; url: string }> = [];
  if (toInsert.length) {
    inserted = await db
      .insert(automationOpportunities)
      .values(
        toInsert.map((post) => ({
          workspaceId,
          discoveryRunId: run.id,
          externalId: postExternalId(post),
          subreddit: post.subreddit,
          title: post.title,
          body: post.body,
          url: post.permalink,
          author: post.author,
          score: post.score,
          numComments: post.numComments,
          postedAt: post.createdUtc ? new Date(post.createdUtc * 1000) : null,
          source: 'reddit_api',
          status: 'new',
        })),
      )
      .returning({
        id: automationOpportunities.id,
        title: automationOpportunities.title,
        subreddit: automationOpportunities.subreddit,
        url: automationOpportunities.url,
      });
  }

  const eventRows = inserted.slice(0, MAX_DISCOVERY_EVENT_ROWS);
  const hiddenCount = inserted.length - eventRows.length;
  for (let index = 0; index < eventRows.length; index += 1) {
    const row = eventRows[index];
    const capNote =
      hiddenCount > 0 && index === eventRows.length - 1
        ? ` (event cap of ${MAX_DISCOVERY_EVENT_ROWS} reached; ${hiddenCount} more new opportunities were discovered but not listed individually)`
        : '';
    await recordAutomationEvent({
      workspaceId,
      userId,
      type: 'opportunity_discovered',
      opportunityId: row.id,
      url: row.url,
      message: `New opportunity in r/${row.subreddit}: ${row.title}${capNote}`,
    });
  }

  for (const post of toUpdate) {
    const id = existingIds.get(postExternalId(post));
    if (!id) continue;
    await db
      .update(automationOpportunities)
      .set({
        title: post.title,
        body: post.body,
        url: post.permalink,
        author: post.author,
        score: post.score,
        numComments: post.numComments,
        postedAt: post.createdUtc ? new Date(post.createdUtc * 1000) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(automationOpportunities.workspaceId, workspaceId), eq(automationOpportunities.id, id)));
  }

  const opportunitiesUpserted = inserted.length + toUpdate.length;
  const completedAt = new Date();
  await db
    .update(automationDiscoveryRuns)
    .set({
      status: runStatus,
      completedAt,
      resultsFound,
      opportunitiesUpserted,
      queriesCompleted,
      errorMessage: runError,
      updatedAt: completedAt,
    })
    .where(eq(automationDiscoveryRuns.id, run.id));

  await recordAutomationEvent({
    workspaceId,
    userId,
    type: 'discovery_completed',
    message:
      runStatus === 'partial'
        ? `Discovery finished partially: found ${resultsFound} posts, persisted ${opportunitiesUpserted} opportunities.${runError ? ` ${runError}` : ''}`
        : `Discovery completed: found ${resultsFound} posts, persisted ${opportunitiesUpserted} opportunities.`,
    meta: { runId: run.id, found: resultsFound, upserted: opportunitiesUpserted },
  });

  return { runId: run.id, status: runStatus, found: resultsFound, upserted: opportunitiesUpserted, queries, error: runError };
}
