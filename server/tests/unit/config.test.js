import assert from 'node:assert/strict';
import test from 'node:test';
import { ConfigurationError, parseEnvironment, safeConfigurationSummary } from '../../src/config/env.js';

const valid = {
  NODE_ENV: 'test', PORT: '5050', MONGODB_URI: 'mongodb://127.0.0.1:27017/campuscollab_test',
  CLIENT_URL: 'http://localhost:5173', API_URL: 'http://localhost:5050', LOG_LEVEL: 'error', TRUST_PROXY: 'false',
  SESSION_SECRET: 'test-session-secret-with-more-than-thirty-two-characters',
  CSRF_SECRET: 'test-csrf-secret-with-more-than-thirty-two-characters',
};

test('configuration parses and normalizes Phase 5 values', () => {
  const config = parseEnvironment(valid);
  assert.equal(config.port, 5050);
  assert.equal(config.mongodbDbName, 'CampusCollab');
  assert.equal(config.clientUrl, 'http://localhost:5173');
  assert.equal(config.trustProxy, false);
  assert.equal(config.requireEmailVerification, true);
  assert.deepEqual(config.mongodbDnsServers, []);
  assert.equal(safeConfigurationSummary(config).mongodbConfigured, true);
  assert.equal('mongodbUri' in safeConfigurationSummary(config), false);
});

test('configuration accepts explicit MongoDB DNS resolver IPs', () => {
  const config = parseEnvironment({ ...valid, MONGODB_DNS_SERVERS: '1.1.1.1, 8.8.8.8' });
  assert.deepEqual(config.mongodbDnsServers, ['1.1.1.1', '8.8.8.8']);
  assert.equal(safeConfigurationSummary(config).mongodbDnsOverrideConfigured, true);
  assert.throws(() => parseEnvironment({ ...valid, MONGODB_DNS_SERVERS: 'resolver.example.com' }), ConfigurationError);
});

test('configuration rejects a missing or placeholder MONGODB_URI', () => {
  assert.throws(() => parseEnvironment({ ...valid, MONGODB_URI: '' }), ConfigurationError);
  assert.throws(() => parseEnvironment({ ...valid, MONGODB_URI: 'your_mongodb_connection_string_here' }), ConfigurationError);
});

test('optional email placeholders do not block local development', () => {
  const config = parseEnvironment({
    ...valid,
    SMTP_HOST: 'your_smtp_host_here',
    SMTP_USER: 'your_smtp_username_here',
    SMTP_PASSWORD: 'your_smtp_password_here',
    EMAIL_FROM: 'your_sender_email_here',
  });

  assert.equal(config.smtp, null);
});

test('production configuration requires HTTPS origins', () => {
  assert.throws(() => parseEnvironment({ ...valid, NODE_ENV: 'production' }), ConfigurationError);
  assert.throws(() => parseEnvironment({ ...valid, NODE_ENV: 'production', CLIENT_URL: 'https://app.example.com', API_URL: 'https://api.example.com', SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASSWORD: 'password', EMAIL_FROM: 'mail@example.com', REQUIRE_EMAIL_VERIFICATION: 'false' }), ConfigurationError);
});
