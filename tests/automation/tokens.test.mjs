import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const tokens = await import('../../apps/falbor/app/lib/automation/tokens.ts');
const { PAIRING_CODE_ALPHABET } = await import('../../apps/falbor/app/lib/automation/constants.ts');

describe('Token hashing', () => {
  test('hashToken and hashContent are deterministic sha256 hex digests', () => {
    const a = tokens.hashToken('secret-token');
    assert.equal(a.length, 64);
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.equal(a, tokens.hashToken('secret-token'));
    assert.notEqual(a, tokens.hashToken('secret-token2'));
    assert.equal(tokens.hashToken('x'), tokens.hashContent('x'));
  });
});

describe('Extension tokens', () => {
  test('generateExtensionToken produces unique base64url tokens with 256 bits of entropy', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i += 1) {
      const token = tokens.generateExtensionToken();
      assert.match(token, /^[A-Za-z0-9_-]+$/);
      assert.equal(Buffer.from(token, 'base64url').length, 32);
      assert.ok(!seen.has(token), 'tokens must be unique');
      seen.add(token);
    }
  });
});

describe('Pairing codes', () => {
  test('generatePairingCode emits AAAAA-BBBBB format from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = tokens.generatePairingCode();
      assert.match(code, /^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
      for (const char of code.replace('-', '')) {
        assert.ok(PAIRING_CODE_ALPHABET.includes(char), `char ${char} must be in safe alphabet`);
      }
    }
  });

  test('normalizePairingCode strips separators and uppercases', () => {
    assert.equal(tokens.normalizePairingCode(' ab-cd ef '), 'ABCDEF');
    assert.equal(tokens.normalizePairingCode('AAAAA-BBBBB'), 'AAAAABBBBB');
  });
});

describe('safeCompareHashes', () => {
  test('compares equal hashes and rejects mismatches, wrong lengths and non-hex input without throwing', () => {
    const a = tokens.hashToken('one');
    const b = tokens.hashToken('two');
    assert.equal(tokens.safeCompareHashes(a, a), true);
    assert.equal(tokens.safeCompareHashes(a, b), false);
    assert.equal(tokens.safeCompareHashes(a, a.slice(0, 10)), false);
    assert.equal(tokens.safeCompareHashes('zz', 'zz'), false);
    assert.equal(tokens.safeCompareHashes('', ''), false);
  });
});
