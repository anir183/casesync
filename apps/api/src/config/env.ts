import { z } from 'zod'

const booleanFromEnv = z
  .preprocess((value) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1'
    return false
  }, z.boolean())
  .default(true)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Coarse ceiling for the whole request body; attachment routes validate the
  // file itself against ATTACHMENT_MAX_BYTES. Based on a generous multipart
  // allowance so the two limits never reject a legitimate upload.
  MAX_REQUEST_BODY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(25 * 1024 * 1024),
  SECURITY_HEADERS_ENABLED: booleanFromEnv,
  SECURITY_HEADERS_CSP: z
    .string()
    .default(
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:",
    ),
  // HSTS only makes sense over HTTPS behind a TLS-terminating proxy.
  HSTS_ENABLED: booleanFromEnv.default(false),
  MONGODB_URI: z.string().min(1),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().optional(),
  MONGODB_MAX_IDLE_TIME_MS: z.coerce.number().int().positive().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  JEVMODEL_API_KEY: z.string().optional(),
  JEVMODEL_BASE_URL: z.string().url().default('https://jevmodel.org'),
  JEVMODEL_MODEL: z.string().default('jev-latest'),
  JEV_ENABLED: booleanFromEnv,
  JEV_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  JEV_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  JEV_COORDINATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  INSTITUTION_FUZZY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
  AI_PROVIDER: z.string().default('jev'),
  OVERLAP_AUTO_ASSESS: booleanFromEnv,
  OVERLAP_AUTO_MERGE_ENABLED: booleanFromEnv,
  OVERLAP_AUTO_MERGE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
  OVERLAP_AUTO_MERGE_TEXT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  STAFF_SIGNUP_ENABLED: booleanFromEnv.default(false),
  COMPLAINANT_SIGNUP_ENABLED: booleanFromEnv.default(true),
  REPRESENTATIVE_SIGNUP_ENABLED: booleanFromEnv.default(true),
  COMPLAINT_REOPEN_DAYS: z.coerce.number().int().positive().default(30),
  DEFAULT_SLA_DAYS: z.coerce.number().int().positive().default(30),
  SLA_REMINDER_DAYS: z.string().default('7,3,1'),
  PENDING_REMINDER_DAYS: z.coerce.number().int().positive().default(7),
  CRON_ENABLED: booleanFromEnv,
  SLA_TIMEZONE: z.string().default('Asia/Kolkata'),
  ATTACHMENT_STORAGE_DIR: z.string().default('storage/attachments'),
  ATTACHMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  ATTACHMENT_ALLOWED_MIME_TYPES: z
    .string()
    .default(
      'application/pdf,image/png,image/jpeg,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
})

export const env = envSchema.parse(process.env)
