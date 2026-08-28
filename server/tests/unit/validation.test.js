import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { validateRequest } from '../../src/middleware/validate.js';
import { generateOpaqueToken, hashOpaqueToken, opaqueTokenMatches } from '../../src/lib/crypto/opaque-token.js';
import { hashPassword, verifyPassword } from '../../src/lib/crypto/password.js';

test('validation middleware parses params, query, and body into request.validated', () => {
  const middleware = validateRequest(z.object({ params: z.object({ id: z.string().length(24) }), query: z.object({ limit: z.coerce.number().int() }), body: z.object({ name: z.string() }).strict() }));
  const request = { params: { id: 'a'.repeat(24) }, query: { limit: '10' }, body: { name: 'Campus' } };
  middleware(request, {}, (error) => assert.equal(error, undefined));
  assert.equal(request.validated.query.limit, 10);
});

test('opaque session material is random, hashed, and compared without storing the raw value', () => {
  const token = generateOpaqueToken();
  const secret = 'test-only-secret-that-is-never-a-production-value';
  const hash = hashOpaqueToken(token, secret);
  assert.notEqual(hash, token);
  assert.equal(opaqueTokenMatches(token, hash, secret), true);
  assert.equal(opaqueTokenMatches(`${token}x`, hash, secret), false);
});

test('passwords use salted scrypt hashes and constant-time verification', async () => {
  const first = await hashPassword('StrongPassword1');
  const second = await hashPassword('StrongPassword1');
  assert.notEqual(first, second);
  assert.equal(first.includes('StrongPassword1'), false);
  assert.equal(await verifyPassword('StrongPassword1', first), true);
  assert.equal(await verifyPassword('WrongPassword1', first), false);
});
