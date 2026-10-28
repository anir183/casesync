import { z } from 'zod'

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
  JEV_ENABLED: z.coerce.boolean().default(true),
  AI_PROVIDER: z.string().default('jev'),
  OVERLAP_AUTO_ASSESS: z.coerce.boolean().default(true),
})

export const env = envSchema.parse(process.env)
