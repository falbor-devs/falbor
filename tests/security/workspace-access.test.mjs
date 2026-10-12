import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Workspace Access & Permission Boundaries', () => {
  test('Access check rejects null or empty workspace/user IDs', async () => {
    const { getAccessibleWorkspace } = await import('../../apps/falbor/app/lib/workspace-build/access.ts');

    const result1 = await getAccessibleWorkspace('', 'user-123');
    assert.equal(result1, null, 'Empty workspaceId should return null');

    const result2 = await getAccessibleWorkspace('ws-123', '');
    assert.equal(result2, null, 'Empty userId should return null');
  });

  test('Malformed UUID queries are caught safely without unhandled error', async () => {
    const { getAccessibleWorkspace } = await import('../../apps/falbor/app/lib/workspace-build/access.ts');

    const result = await getAccessibleWorkspace('invalid-uuid-string-$$$', 'user-123');
    assert.equal(result, null, 'Malformed workspace ID should return null cleanly');
  });
});
