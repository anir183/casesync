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
  MONGODB_URI: z.string().min(1),
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
  STAFF_SIGNUP_ENABLED: booleanFromEnv.default(false),
  DEFAULT_SLA_DAYS: z.coerce.number().int().positive().default(30),
  SLA_REMINDER_DAYS: z.string().default('7,3,1'),
  PENDING_REMINDER_DAYS: z.coerce.number().int().positive().default(7),
  CRON_ENABLED: booleanFromEnv,
  SLA_TIMEZONE: z.string().default('Asia/Kolkata'),
})

export const env = envSchema.parse(process.env)
