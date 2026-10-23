import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const queries = await import('../../apps/falbor/app/lib/automation/queries.ts');
const { DISCOVERY_MAX_QUERIES } = await import('../../apps/falbor/app/lib/automation/constants.ts');

const baseContext = {
  productName: 'AcmeMetrics',
  website: 'https://acme.example',
  category: 'analytics',
  problem: 'teams waste hours building weekly reports',
  targetAudience: 'startup founders',
  useCases: ['automate weekly reporting', 'track product metrics', 'share dashboards'],
  keywords: ['reporting automation', 'metrics dashboard'],
  competitors: ['OldAnalytics', 'ReportRival'],
  pricing: null,
  features: [],
  description: 'Analytics platform',
  missing: [],
};

describe('Automation discovery queries', () => {
  test('buildDiscoveryQueries produces deduplicated categorized queries within limits', () => {
    const result = queries.buildDiscoveryQueries(baseContext, [], 5);
    assert.equal(result.length, 5);
    const keys = result.map((q) => q.query.toLowerCase());
    assert.equal(new Set(keys).size, keys.length, 'queries must be unique');
    const categories = new Set(result.map((q) => q.category));
    assert.ok(categories.size >= 1);
    for (const item of result) {
      assert.ok(item.query.length >= 8 && item.query.length <= 220);
    }
  });

  test('buildDiscoveryQueries never exceeds DISCOVERY_MAX_QUERIES even with a large limit', () => {
    const result = queries.buildDiscoveryQueries(baseContext, [], 1000);
    assert.ok(result.length <= DISCOVERY_MAX_QUERIES);
  });

  test('buildDiscoveryQueries interleaves categories so competitors and keywords survive the cap', () => {
    const result = queries.buildDiscoveryQueries(baseContext, [], 8);
    const text = result.map((q) => q.query.toLowerCase());
    const categories = new Set(result.map((q) => q.category));
    assert.ok(text.some((q) => q.includes('oldanalytics')), 'competitor queries must be present');
    assert.ok(categories.has('problem'));
    assert.ok(categories.has('recommendation'));
    assert.ok(categories.size >= 4, `expected diverse categories, got ${[...categories].join(', ')}`);
  });

  test('buildDiscoveryQueries includes extra keywords when keyword bucket has room', () => {
    const noKeywords = { ...baseContext, keywords: [] };
    const result = queries.buildDiscoveryQueries(noKeywords, ['reddit growth tool'], 8);
    assert.ok(result.some((q) => q.query.toLowerCase().includes('reddit growth tool')));
  });

  test('buildDiscoveryQueries handles an empty context honestly (offers product-name fallback only)', () => {
    const empty = {
      ...baseContext,
      problem: '',
      targetAudience: '',
      useCases: [],
      keywords: [],
      competitors: [],
    };
    const result = queries.buildDiscoveryQueries(empty, [], 5);
    assert.ok(result.length >= 1);
    assert.ok(result.every((q) => q.query.length >= 8));
  });
});

describe('Reddit fullname helpers', () => {
  test('parseRedditFullname parses t1_/t3_ names and rejects garbage', () => {
    assert.deepEqual(queries.parseRedditFullname('t1_AbC123'), { kind: 't1', id: 'abc123' });
    assert.deepEqual(queries.parseRedditFullname('t3_xyz'), { kind: 't3', id: 'xyz' });
    assert.equal(queries.parseRedditFullname('xyz'), null);
    assert.equal(queries.parseRedditFullname(''), null);
    assert.equal(queries.parseRedditFullname(null), null);
  });

  test('redditFullname builds prefixed names idempotently', () => {
    assert.equal(queries.redditFullname('comment', 'abc'), 't1_abc');
    assert.equal(queries.redditFullname('post', 'abc'), 't3_abc');
    assert.equal(queries.redditFullname('comment', 't1_abc'), 't1_abc');
  });
});

describe('Idempotency keys', () => {
  test('publicationIdempotencyKey is deterministic per draft and content hash', () => {
    const a = queries.publicationIdempotencyKey('draft-1', 'a'.repeat(64));
    const b = queries.publicationIdempotencyKey('draft-1', 'a'.repeat(64));
    const c = queries.publicationIdempotencyKey('draft-1', 'b'.repeat(64));
    const d = queries.publicationIdempotencyKey('draft-2', 'a'.repeat(64));
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.notEqual(a, d);
    assert.equal(a, `publish:draft-1:${'a'.repeat(16)}`);
  });

  test('verificationIdempotencyKey is deterministic per publication', () => {
    assert.equal(queries.verificationIdempotencyKey('pub-1'), 'verify:pub-1');
    assert.equal(queries.verificationIdempotencyKey('pub-1'), queries.verificationIdempotencyKey('pub-1'));
  });
});

describe('formatSubreddit', () => {
  test('normalizes subreddit inputs', () => {
    assert.equal(queries.formatSubreddit('r/SaaS'), 'SaaS');
    assert.equal(queries.formatSubreddit('/r/webdev/'), 'webdev');
    assert.equal(queries.formatSubreddit('  startups '), 'startups');
  });
});
