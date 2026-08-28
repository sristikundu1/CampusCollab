import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashOpaqueToken(token, secret) {
  if (!token || !secret) throw new TypeError('Token and secret are required');
  return createHmac('sha256', secret).update(token, 'utf8').digest('base64url');
}

export function opaqueTokenMatches(token, expectedHash, secret) {
  const candidate = Buffer.from(hashOpaqueToken(token, secret));
  const expected = Buffer.from(expectedHash ?? '');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

