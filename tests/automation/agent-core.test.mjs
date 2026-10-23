import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const core = await import('../../apps/falbor/app/lib/automation/agentCore.ts');

const baseConfig = { ...core.AGENT_DEFAULT_CONFIG, scopeSubreddits: ['saas'] };
const emptyCounters = { ...core.EMPTY_AGENT_COUNTERS };

describe('Agent session transitions', () => {
  test('running can pause, be stopped or complete; terminal states never restart', () => {
    assert.equal(core.canTransitionSession('running', 'paused'), true);
    assert.equal(core.canTransitionSession('running', 'stopping'), true);
    assert.equal(core.canTransitionSession('running', 'completed'), true);
    assert.equal(core.canTransitionSession('running', 'stopped'), false);
    assert.equal(core.canTransitionSession('stopped', 'running'), false);
    assert.equal(core.canTransitionSession('completed', 'running'), false);
  });

  test('stop acknowledgement moves stopping to stopped', () => {
    assert.equal(core.canTransitionSession('stopping', 'stopped'), true);
    assert.equal(core.canTransitionSession('stopping', 'paused'), false);
    assert.equal(core.canTransitionSession('paused', 'stopped'), true);
  });

  test('assertSessionTransition throws on invalid transitions', () => {
    assert.throws(() => core.assertSessionTransition('stopped', 'running'), /Invalid agent session transition/);
    assert.doesNotThrow(() => core.assertSessionTransition('running', 'paused'));
  });

  test('isActiveAgentStatus covers running, paused and stopping only', () => {
    assert.equal(core.isActiveAgentStatus('running'), true);
    assert.equal(core.isActiveAgentStatus('paused'), true);
    assert.equal(core.isActiveAgentStatus('stopping'), true);
    assert.equal(core.isActiveAgentStatus('stopped'), false);
    assert.equal(core.isActiveAgentStatus('completed'), false);
    assert.equal(core.isActiveAgentStatus('error'), false);
  });
});

describe('Agent configuration normalization', () => {
  test('defaults apply when input is missing or invalid', () => {
    const config = core.normalizeAgentConfig(null);
    assert.deepEqual(config, core.AGENT_DEFAULT_CONFIG);
  });

  test('numeric limits are clamped to their allowed ranges', () => {
    const config = core.normalizeAgentConfig({
      minRelevanceScore: 500,
      maxDiscussions: -5,
      maxRuntimeMinutes: 10_000,
      maxAiCalls: 0,
      maxEstimatedCostUsd: 999,
      maxConsecutiveErrors: 100,
      maxConsecutiveIrrelevant: 0,
    });
    assert.equal(config.minRelevanceScore, 100);
    assert.equal(config.maxDiscussions, 1);
    assert.equal(config.maxRuntimeMinutes, 480);
    assert.equal(config.maxAiCalls, 1);
    assert.equal(config.maxEstimatedCostUsd, 20);
    assert.equal(config.maxConsecutiveErrors, 10);
    assert.equal(config.maxConsecutiveIrrelevant, 1);
  });

  test('subreddit scope strips r/ prefixes, lowercases and dedupes, capped at 20', () => {
    const config = core.normalizeAgentConfig({
      scopeSubreddits: ['r/SaaS', '/r/startups', 'r/saas', 'https://www.reddit.com/r/webdev/', 'x', ...Array.from({ length: 30 }, (_, i) => `sub${i}`)],
    });
    assert.equal(config.scopeSubreddits[0], 'saas');
    assert.equal(config.scopeSubreddits[1], 'startups');
    assert.equal(config.scopeSubreddits[2], 'webdev');
    assert.ok(!config.scopeSubreddits.includes('x'), 'too-short names must be rejected');
    assert.equal(config.scopeSubreddits.length, 20);
    assert.equal(new Set(config.scopeSubreddits).size, 20);
  });

  test('booleans default to true unless explicitly disabled', () => {
    const config = core.normalizeAgentConfig({ allowNavigation: false });
    assert.equal(config.allowNavigation, false);
    assert.equal(config.allowDraftGeneration, true);
  });

  test('counters are coerced to non-negative numbers', () => {
    const counters = core.normalizeAgentCounters({
      inspected: '3',
      analyzed: -1,
      draftsCreated: Number.NaN,
      skipped: 2.7,
      estimatedCostUsd: '0.25',
    });
    assert.equal(counters.inspected, 3);
    assert.equal(counters.analyzed, 0);
    assert.equal(counters.draftsCreated, 0);
    assert.equal(counters.skipped, 2.7);
    assert.equal(counters.estimatedCostUsd, 0.25);
    assert.equal(counters.errors, 0);
  });
});

describe('Agent revision checks', () => {
  test('matching and missing revisions apply, anything else is stale', () => {
    assert.equal(core.checkRevision(4, 4), 'apply');
    assert.equal(core.checkRevision(4, null), 'apply');
    assert.equal(core.checkRevision(4, undefined), 'apply');
    assert.equal(core.checkRevision(4, 3), 'stale');
    assert.equal(core.checkRevision(4, 5), 'stale');
    assert.equal(core.checkRevision(4, Number.NaN), 'stale');
  });
});

describe('Agent cost estimation', () => {
  test('known models use their published per-million pricing', () => {
    assert.equal(core.estimateCostUsd('gpt-4o-mini', 1_000_000, 0), 0.15);
    assert.equal(core.estimateCostUsd('gpt-4o-mini', 0, 1_000_000), 0.6);
    assert.equal(core.estimateCostUsd('gpt-4o', 0, 1_000_000), 10);
  });

  test('unknown models use the conservative fallback instead of undercounting', () => {
    assert.equal(core.estimateCostUsd('some-unknown-model', 1_000_000, 1_000_000), 12.5);
  });

  test('invalid token counts cost nothing but never produce NaN', () => {
    assert.equal(core.estimateCostUsd('gpt-4o', Number.NaN, -5), 0);
  });
});

describe('Agent feed target selection', () => {
  const candidates = [
    { externalId: 'AAA', url: 'https://www.reddit.com/r/saas/comments/aaa/post/', subreddit: 'saas' },
    { externalId: 'BBB', url: 'https://www.reddit.com/r/startups/comments/bbb/post/', subreddit: 'r/startups' },
    { externalId: 'CCC', url: 'https://evil.example.com/r/saas/comments/ccc/', subreddit: 'saas' },
    { externalId: 'DDD', url: 'https://www.reddit.com/r/other/comments/ddd/', subreddit: 'other' },
    { externalId: '', url: 'https://www.reddit.com/r/saas/comments/empty/', subreddit: 'saas' },
    { externalId: 'aaa', url: 'https://www.reddit.com/r/saas/comments/aaa2/', subreddit: 'saas' },
  ];

  test('filters out non-reddit urls, missing ids, duplicates and out-of-scope subreddits', () => {
    const targets = core.selectFeedTargets({
      candidates,
      inspectedExternalIds: [],
      remaining: 10,
      scopeSubreddits: ['saas', 'startups'],
    });
    assert.deepEqual(
      targets.map((t) => t.externalId),
      ['aaa', 'bbb'],
    );
    assert.equal(targets[1].subreddit, 'startups');
  });

  test('excludes already inspected discussions and respects the remaining budget', () => {
    const targets = core.selectFeedTargets({
      candidates,
      inspectedExternalIds: ['aaa'],
      remaining: 1,
      scopeSubreddits: [],
    });
    assert.deepEqual(
      targets.map((t) => t.externalId),
      ['bbb'],
    );
  });

  test('an empty scope accepts every valid reddit candidate', () => {
    const targets = core.selectFeedTargets({
      candidates,
      inspectedExternalIds: [],
      remaining: 10,
      scopeSubreddits: [],
    });
    assert.deepEqual(
      targets.map((t) => t.externalId),
      ['aaa', 'bbb', 'ddd'],
    );
  });
});

describe('Agent decision engine', () => {
  const decide = (overrides) =>
    core.decideAgentAction({
      config: baseConfig,
      counters: emptyCounters,
      elapsedMs: 0,
      relevanceScore: 80,
      ...overrides,
    });

  test('human verification always pauses, even when everything else is within limits', () => {
    const decision = decide({ verificationRequired: true });
    assert.equal(decision.action, 'pause');
    assert.match(decision.reason, /verification/i);
  });

  test('consecutive errors pause the session', () => {
    const decision = decide({ counters: { ...emptyCounters, consecutiveErrors: baseConfig.maxConsecutiveErrors } });
    assert.equal(decision.action, 'pause');
    assert.match(decision.reason, /consecutive errors/);
  });

  test('runtime and discussion limits stop the session', () => {
    assert.equal(decide({ elapsedMs: baseConfig.maxRuntimeMinutes * 60_000 }).action, 'stop');
    assert.equal(decide({ counters: { ...emptyCounters, inspected: baseConfig.maxDiscussions } }).action, 'stop');
  });

  test('AI call and cost budgets pause instead of stopping', () => {
    assert.equal(decide({ counters: { ...emptyCounters, aiCalls: baseConfig.maxAiCalls } }).action, 'pause');
    const costDecision = decide({
      counters: { ...emptyCounters, estimatedCostUsd: baseConfig.maxEstimatedCostUsd },
    });
    assert.equal(costDecision.action, 'pause');
  });

  test('unscored discussions are skipped without drafting', () => {
    assert.equal(decide({ relevanceScore: null }).action, 'skip');
  });

  test('scores below the threshold are skipped until the consecutive limit stops the session', () => {
    const skip = decide({ relevanceScore: 10, counters: { ...emptyCounters, consecutiveIrrelevant: 0 } });
    assert.equal(skip.action, 'skip');
    const stop = decide({
      relevanceScore: 10,
      counters: { ...emptyCounters, consecutiveIrrelevant: baseConfig.maxConsecutiveIrrelevant - 1 },
    });
    assert.equal(stop.action, 'stop');
  });

  test('relevant discussions create drafts, unless draft generation is disabled', () => {
    assert.equal(decide({ relevanceScore: 90 }).action, 'draft_created');
    const disabled = decide({
      relevanceScore: 90,
      config: { ...baseConfig, allowDraftGeneration: false },
    });
    assert.equal(disabled.action, 'skip');
  });

  test('the decision surface never includes an autonomous submit action', () => {
    assert.equal(core.AUTONOMOUS_SUBMISSION_AUTHORIZED, false);
    assert.deepEqual(
      [...core.AGENT_DECISION_ACTIONS],
      ['inspect', 'scroll_feed', 'open_listing', 'draft_created', 'skip', 'wait', 'pause', 'stop'],
    );
    for (const action of core.AGENT_DECISION_ACTIONS) {
      assert.ok(!/submit|post|comment|vote/i.test(action), 'No decision may submit content: ' + action);
    }
  });

  test('feed interaction bounds are explicit and finite', () => {
    assert.equal(core.AGENT_MAX_FEED_SCROLLS, 3);
    assert.equal(core.AGENT_MAX_OPEN_FAILURES, 2);
    assert.equal(core.AGENT_MAX_LISTING_ROTATIONS_FACTOR, 2);
    assert.equal(core.EMPTY_AGENT_COUNTERS.relevantFound, 0);
  });
});
