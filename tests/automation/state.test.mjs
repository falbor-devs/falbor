import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const state = await import('../../apps/falbor/app/lib/automation/state.ts');

describe('Automation state machine', () => {
  test('draft transitions follow the approval pipeline', () => {
    assert.equal(state.canTransitionDraft('draft', 'approved'), true);
    assert.equal(state.canTransitionDraft('draft', 'awaiting_approval'), true);
    assert.equal(state.canTransitionDraft('approved', 'queued'), true);
    assert.equal(state.canTransitionDraft('queued', 'submitting'), true);
    assert.equal(state.canTransitionDraft('submitting', 'submitted'), true);
    assert.equal(state.canTransitionDraft('submitted', 'verified'), true);
    assert.equal(state.canTransitionDraft('outcome_unknown', 'verified'), true);
    assert.equal(state.canTransitionDraft('verified', 'submitted'), false);
    assert.equal(state.canTransitionDraft('cancelled', 'draft'), true);
    assert.equal(state.canTransitionDraft('rejected', 'draft'), true);
  });

  test('assertDraftTransition throws on invalid transitions', () => {
    assert.throws(() => state.assertDraftTransition('verified', 'approved'), /Invalid draft transition/);
    assert.doesNotThrow(() => state.assertDraftTransition('draft', 'approved'));
  });

  test('task transitions only allow retry from failed, never from terminal states', () => {
    assert.equal(state.canTransitionTask('queued', 'running'), true);
    assert.equal(state.canTransitionTask('running', 'completed'), true);
    assert.equal(state.canTransitionTask('running', 'failed'), true);
    assert.equal(state.canTransitionTask('failed', 'queued'), true);
    assert.equal(state.canTransitionTask('completed', 'queued'), false);
    assert.equal(state.canTransitionTask('cancelled', 'queued'), false);
    assert.equal(state.canTransitionTask('expired', 'running'), false);
  });

  test('publication transitions treat failed as terminal (no blind repost)', () => {
    assert.equal(state.canTransitionPublication('pending', 'submitted'), true);
    assert.equal(state.canTransitionPublication('submitted', 'verified'), true);
    assert.equal(state.canTransitionPublication('outcome_unknown', 'verified'), true);
    assert.equal(state.canTransitionPublication('failed', 'submitted'), false);
    assert.equal(state.canTransitionPublication('failed', 'outcome_unknown'), false);
    assert.equal(state.canTransitionPublication('verified', 'removed_or_unavailable'), true);
  });

  test('normalizeCommentText strips invisible characters and normalizes whitespace', () => {
    const raw = '  Hello\u200b \u200dWorld\r\n\r\n\r\n\r\nSecond   Line\t\tHere  ';
    assert.equal(state.normalizeCommentText(raw), 'hello world\n\nsecond line here');
  });

  test('textsMatch matches identical and fuzzy-contained text, rejects short or different text', () => {
    assert.equal(state.textsMatch('Hello World', 'hello   world'), true);
    const long = 'This is a sufficiently long comment body used for verification matching purposes.';
    assert.equal(state.textsMatch(long, `prefix ${long} suffix`), true);
    assert.equal(state.textsMatch('short', 'short'), true, 'exact equality is a match even for short text');
    assert.equal(state.textsMatch('short', 'short extended with more words'), false, 'fuzzy containment requires 40+ chars');
    assert.equal(state.textsMatch('', 'anything'), false);
    assert.equal(
      state.textsMatch(long, 'A completely different piece of text that shares no substantial content with the other.'),
      false,
    );
  });

  test('isPublishableDraft requires approved status and an exact content hash', () => {
    const hash = 'abc123';
    assert.deepEqual(
      state.isPublishableDraft({ status: 'draft', body: 'x', approvedContentHash: hash }, hash),
      { ok: false, reason: 'Draft is not approved (current status: draft).' },
    );
    assert.equal(
      state.isPublishableDraft({ status: 'approved', body: 'x', approvedContentHash: null }, hash).ok,
      false,
    );
    assert.equal(
      state.isPublishableDraft({ status: 'approved', body: 'x', approvedContentHash: 'other' }, hash).ok,
      false,
    );
    assert.deepEqual(
      state.isPublishableDraft({ status: 'approved', body: 'x', approvedContentHash: hash }, hash),
      { ok: true },
    );
  });
});
