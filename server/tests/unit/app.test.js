import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';

const config = { nodeEnv: 'test', clientUrl: 'http://localhost:5173', trustProxy: false, isProduction: false, sessionCookieName: 'campuscollab_session', sessionTtlDays: 30, sessionSecret: 'test-session-secret-with-more-than-thirty-two-characters', csrfSecret: 'test-csrf-secret-with-more-than-thirty-two-characters', smtp: null };
const logger = createLogger({ level: 'silent', environment: 'test' });

async function withServer(readiness, work, overrides = {}) {
  const server = http.createServer(createApp({ config, logger, databaseReadiness: () => readiness, ...overrides }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await work(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health is live and readiness follows MongoDB state', async () => {
  await withServer({ ready: false, status: 'DISCONNECTED' }, async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).data.status, 'alive');
    assert.ok(health.headers.get('x-request-id'));
    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).data.dependencies.mongodb, 'unavailable');
  });
});

test('404 uses the safe Phase 4 error envelope', async () => {
  await withServer({ ready: true, status: 'CONNECTED' }, async (base) => {
    const response = await fetch(`${base}/missing`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'RESOURCE_NOT_FOUND');
    assert.ok(body.error.requestId);
    assert.equal('stack' in body.error, false);
  });
});

test('security headers and exact-origin CORS are enforced', async () => {
  await withServer({ ready: true, status: 'CONNECTED' }, async (base) => {
    const allowed = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.ok(allowed.headers.get('x-content-type-options'));
    assert.equal(allowed.headers.get('x-powered-by'), null);
    const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
});

test('oversized JSON is rejected without internal details', async () => {
  await withServer({ ready: true, status: 'CONNECTED' }, async (base) => {
    const response = await fetch(`${base}/api/v1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(110_000) }) });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error.code, 'PAYLOAD_TOO_LARGE');
  });
});

test('registration rejects invalid input before database access', async () => {
  await withServer({ ready: true, status: 'CONNECTED' }, async (base) => {
    const response = await fetch(`${base}/api/v1/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A', email: 'bad', password: 'short', confirmPassword: 'different' }) });
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.equal(body.error.code, 'VALIDATION_FAILED');
    assert.ok(body.error.details.length >= 3);
  });
});

test('login sets an opaque HttpOnly cookie and logout enforces CSRF', async () => {
  const rawToken = 'opaque-test-session-token';
  const fakeAuthService = {
    async login() { return { rawToken, expiresAt: new Date(Date.now() + 60_000), user: { id: 'a'.repeat(24), email: 'student@example.edu', status: 'ACTIVE' } }; },
    async authenticate(token) { assert.equal(token, rawToken); return { user: { _id: 'a'.repeat(24) }, session: { _id: 'b'.repeat(24) } }; },
    async currentUser() { return { id: 'a'.repeat(24), email: 'student@example.edu', status: 'ACTIVE' }; },
    async logout() {},
  };
  await withServer({ ready: true, status: 'CONNECTED' }, async (base) => {
    const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'student@example.edu', password: 'Password1', remember: false }) });
    assert.equal(login.status, 200);
    const loginBody = await login.json();
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /campuscollab_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.equal(cookie.includes(rawToken), true);
    const missingCsrf = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { cookie } });
    assert.equal(missingCsrf.status, 403);
    const logout = await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { cookie, 'x-csrf-token': loginBody.data.csrfToken } });
    assert.equal(logout.status, 204);
  }, { authService: fakeAuthService });
});
