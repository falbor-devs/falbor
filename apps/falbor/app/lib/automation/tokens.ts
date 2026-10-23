import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PAIRING_CODE_ALPHABET } from './constants';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashContent(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export function generateExtensionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generatePairingCode(): string {
  const bytes = randomBytes(10);
  const chars: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    chars.push(PAIRING_CODE_ALPHABET[bytes[i] % PAIRING_CODE_ALPHABET.length]);
  }
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

export function normalizePairingCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function safeCompareHashes(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0 || a.length % 2 !== 0) return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}
