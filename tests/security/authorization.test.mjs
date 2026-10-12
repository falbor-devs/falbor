import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Security Boundary & Authorization Tests', () => {
  test('Rate limit check blocks excessive requests', async () => {
    const { checkRateLimit } = await import('../../apps/falbor/app/lib/security.ts');
    
    const fakeRequest = new Request('http://localhost/api/llmcall', {
      headers: { 'x-forwarded-for': '192.168.100.1' },
    });

    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 15; i++) {
      const res = checkRateLimit(fakeRequest, '/api/llmcall');
      if (res.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    }

    assert.equal(allowedCount, 10, 'Should allow exactly 10 requests within window');
    assert.ok(blockedCount > 0, 'Should block requests exceeding rate limit threshold');
  });

  test('Sanitize error messages strips sensitive technical details', async () => {
    const { sanitizeErrorMessage } = await import('../../apps/falbor/app/lib/security.ts');
    
    const sensitiveError = new Error('Database connection failed at postgres://user:secretpass@db.example.com:5432/main');
    const sanitized = sanitizeErrorMessage(sensitiveError, false);

    assert.equal(sanitized, 'An unexpected error occurred', 'Sensitive error should be masked in production mode');
  });
});
