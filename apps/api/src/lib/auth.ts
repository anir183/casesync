import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { ROLES } from '@casesync/config'

const db = mongoose.connection

export const auth = betterAuth({
  database: mongodbAdapter(db),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: ROLES.VIEWER,
        input: false,
      },
      bureauId: {
        type: 'string',
        required: false,
        input: false,
      },
      regionId: {
        type: 'string',
        required: false,
        input: false,
      },
      active: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
})
