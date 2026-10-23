import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const reddit = await import('../../apps/falbor/app/lib/automation/reddit.ts');

describe('Reddit post normalization', () => {
  test('maps a realistic Reddit listing payload', () => {
    const post = reddit.normalizeRedditPost({
      kind: 't3',
      data: {
        id: 'abc123',
        name: 't3_abc123',
        subreddit: 'SaaS',
        title: 'Best reporting automation?',
        selftext: 'We waste hours every week on reports.',
        permalink: '/r/SaaS/comments/abc123/best_reporting_automation/',
        author: 'founder_guy',
        score: 42,
        num_comments: 7,
        created_utc: 1_700_000_000,
        locked: false,
        archived: false,
        over_18: false,
        is_self: true,
      },
    });
    assert.equal(post.id, 'abc123');
    assert.equal(post.subreddit, 'SaaS');
    assert.equal(post.permalink, 'https://www.reddit.com/r/SaaS/comments/abc123/best_reporting_automation/');
    assert.equal(post.score, 42);
    assert.equal(post.numComments, 7);
    assert.equal(post.over18, false);
    assert.equal(post.body, 'We waste hours every week on reports.');
  });

  test('rejects payloads without id, subreddit, title or permalink', () => {
    assert.equal(reddit.normalizeRedditPost(null), null);
    assert.equal(reddit.normalizeRedditPost({ data: { id: 'x', subreddit: 'SaaS' } }), null);
    assert.equal(reddit.normalizeRedditPost({ data: { id: 'x', subreddit: 'SaaS', title: 't' } }), null);
  });

  test('keeps unknown numeric fields null instead of inventing values', () => {
    const post = reddit.normalizeRedditPost({
      data: { id: 'x', subreddit: 'SaaS', title: 't', permalink: '/r/SaaS/comments/x/t/' },
    });
    assert.equal(post.score, null);
    assert.equal(post.numComments, null);
    assert.equal(post.createdUtc, null);
    assert.equal(post.author, null);
    assert.equal(post.fullname, 't3_x');
  });

  test('treats empty selftext as no body', () => {
    const post = reddit.normalizeRedditPost({
      data: { id: 'x', subreddit: 'SaaS', title: 't', selftext: '   ', permalink: '/r/SaaS/comments/x/t/' },
    });
    assert.equal(post.body, null);
  });
});

describe('Reddit comment normalization', () => {
  test('maps a comment payload', () => {
    const comment = reddit.normalizeRedditComment({
      data: {
        id: 'c1',
        name: 't1_c1',
        body: 'You could try automating it.',
        author: 'helper',
        score: 9,
        created_utc: 1_700_000_000,
        permalink: '/r/SaaS/comments/abc123/title/c1/',
        subreddit: 'SaaS',
        link_id: 't3_abc123',
        link_title: 'Best reporting automation?',
      },
    });
    assert.equal(comment.id, 'c1');
    assert.equal(comment.body, 'You could try automating it.');
    assert.equal(comment.linkId, 't3_abc123');
    assert.equal(comment.permalink, 'https://www.reddit.com/r/SaaS/comments/abc123/title/c1/');
  });

  test('rejects deleted or empty comments honestly', () => {
    assert.equal(reddit.normalizeRedditComment(null), null);
    assert.equal(reddit.normalizeRedditComment({ data: { id: 'c1', body: '' } }), null);
    assert.equal(reddit.normalizeRedditComment({ data: { id: 'c1', body: '   ' } }), null);
    assert.equal(reddit.normalizeRedditComment({ data: { body: 'no id' } }), null);
  });
});

describe('Reddit configuration detection', () => {
  const originalId = process.env.REDDIT_CLIENT_ID;
  const originalSecret = process.env.REDDIT_CLIENT_SECRET;

  test('isRedditConfigured is false for missing or placeholder credentials', () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    assert.equal(reddit.isRedditConfigured(), false);
    assert.equal(reddit.buildRedditAuthorizeUrl({ state: 's', redirectUri: 'http://localhost/cb' }), null);

    process.env.REDDIT_CLIENT_ID = 'FALBOR_REDDIT_ID';
    process.env.REDDIT_CLIENT_SECRET = 'placeholder';
    assert.equal(reddit.isRedditConfigured(), false);
  });

  test('buildRedditAuthorizeUrl targets the official endpoint with required params', () => {
    process.env.REDDIT_CLIENT_ID = 'real-client-id';
    process.env.REDDIT_CLIENT_SECRET = 'real-secret';
    const url = reddit.buildRedditAuthorizeUrl({
      state: 'nonce-1',
      redirectUri: 'http://localhost:3000/api/auth/reddit/callback',
    });
    assert.ok(url);
    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, 'https://www.reddit.com/api/v1/authorize');
    assert.equal(parsed.searchParams.get('client_id'), 'real-client-id');
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.equal(parsed.searchParams.get('state'), 'nonce-1');
    assert.equal(parsed.searchParams.get('duration'), 'permanent');
    assert.equal(parsed.searchParams.get('scope'), 'identity read');
  });

  test('getRedditRedirectUri respects an explicit override and otherwise derives from origin', () => {
    delete process.env.REDDIT_REDIRECT_URI;
    assert.equal(
      reddit.getRedditRedirectUri('http://localhost:3000/'),
      'http://localhost:3000/api/auth/reddit/callback',
    );
    process.env.REDDIT_REDIRECT_URI = 'https://example.com/custom/callback';
    assert.equal(reddit.getRedditRedirectUri('http://localhost:3000'), 'https://example.com/custom/callback');
    delete process.env.REDDIT_REDIRECT_URI;

    if (originalId === undefined) delete process.env.REDDIT_CLIENT_ID;
    else process.env.REDDIT_CLIENT_ID = originalId;
    if (originalSecret === undefined) delete process.env.REDDIT_CLIENT_SECRET;
    else process.env.REDDIT_CLIENT_SECRET = originalSecret;
  });
});
