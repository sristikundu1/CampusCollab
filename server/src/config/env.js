import 'dotenv/config';
import { isIP } from 'node:net';
import { z } from 'zod';

const PLACEHOLDER_PATTERN = /^(your_|generate_)/i;

const optionalFutureSecret = z.string().trim().optional().transform((value) =>
  value && !PLACEHOLDER_PATTERN.test(value) ? value : undefined,
);

const optionalFutureEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && !PLACEHOLDER_PATTERN.test(value) ? value : undefined))
  .refine(
    (value) => value === undefined || z.string().email().safeParse(value).success,
    'Invalid email address',
  );

const optionalDnsServers = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : []))
  .refine((servers) => servers.every((server) => isIP(server) !== 0), 'DNS servers must be comma-separated IP addresses');

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z
      .string()
      .trim()
      .min(1, 'MONGODB_URI is required')
      .refine((value) => !PLACEHOLDER_PATTERN.test(value), 'MONGODB_URI still contains a placeholder')
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must use mongodb:// or mongodb+srv://',
      ),
    MONGODB_DB_NAME: z.string().trim().min(1).max(63).regex(/^[^/\\."$*<>:|?\u0000]+$/, 'MONGODB_DB_NAME contains invalid characters').default('CampusCollab'),
    MONGODB_DNS_SERVERS: optionalDnsServers,
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    API_URL: z.string().url().default('http://localhost:5000'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    TRUST_PROXY: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SESSION_SECRET: z.string().trim().min(32).refine((value) => !PLACEHOLDER_PATTERN.test(value), 'SESSION_SECRET still contains a placeholder'),
    CSRF_SECRET: z.string().trim().min(32).refine((value) => !PLACEHOLDER_PATTERN.test(value), 'CSRF_SECRET still contains a placeholder'),
    SESSION_COOKIE_NAME: z.string().trim().min(3).max(80).default('campuscollab_session'),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
    SMTP_HOST: z.string().trim().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
    SMTP_USER: optionalFutureSecret,
    SMTP_PASSWORD: optionalFutureSecret,
    EMAIL_FROM: optionalFutureEmail,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      for (const key of ['CLIENT_URL', 'API_URL']) {
        if (!value[key].startsWith('https://')) {
          context.addIssue({ code: 'custom', path: [key], message: `${key} must use HTTPS in production` });
        }
      }
      for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM']) {
        if (!value[key]) context.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` });
      }
      if (!value.REQUIRE_EMAIL_VERIFICATION) {
        context.addIssue({ code: 'custom', path: ['REQUIRE_EMAIL_VERIFICATION'], message: 'Email verification cannot be disabled in production' });
      }
    }
  });

export class ConfigurationError extends Error {
  constructor(issues) {
    super('Environment configuration is invalid.');
    this.name = 'ConfigurationError';
    this.issues = issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  }
}

export function parseEnvironment(source = process.env) {
  const result = environmentSchema.safeParse(source);
  if (!result.success) throw new ConfigurationError(result.error.issues);

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    mongodbUri: result.data.MONGODB_URI,
    mongodbDbName: result.data.MONGODB_DB_NAME,
    mongodbDnsServers: result.data.MONGODB_DNS_SERVERS,
    clientUrl: new URL(result.data.CLIENT_URL).origin,
    apiUrl: new URL(result.data.API_URL).origin,
    logLevel: result.data.LOG_LEVEL,
    trustProxy: result.data.TRUST_PROXY,
    sessionSecret: result.data.SESSION_SECRET,
    csrfSecret: result.data.CSRF_SECRET,
    sessionCookieName: result.data.SESSION_COOKIE_NAME,
    sessionTtlDays: result.data.SESSION_TTL_DAYS,
    requireEmailVerification: result.data.REQUIRE_EMAIL_VERIFICATION,
    smtp: result.data.SMTP_HOST && result.data.SMTP_USER && result.data.SMTP_PASSWORD && result.data.EMAIL_FROM ? {
      host: result.data.SMTP_HOST,
      port: result.data.SMTP_PORT,
      secure: result.data.SMTP_SECURE,
      user: result.data.SMTP_USER,
      password: result.data.SMTP_PASSWORD,
      from: result.data.EMAIL_FROM,
    } : null,
    isProduction: result.data.NODE_ENV === 'production',
  });
}

export function safeConfigurationSummary(config) {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    clientUrl: config.clientUrl,
    apiUrl: config.apiUrl,
    logLevel: config.logLevel,
    trustProxy: config.trustProxy,
    mongodbConfigured: Boolean(config.mongodbUri),
    mongodbDatabase: config.mongodbDbName,
    mongodbDnsOverrideConfigured: config.mongodbDnsServers.length > 0,
    emailVerificationRequired: config.requireEmailVerification,
  };
}
