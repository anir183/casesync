import { ROLES } from '@casesync/config'
import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import mongoose from 'mongoose'
import { env } from '#/config/env'
import { parseAllowedOrigins } from '#/lib/origins'
import { User } from '#/models/user.model'

const db = mongoose.connection.db
if (!db) {
  throw new Error('MongoDB connection is not ready when initializing Better Auth')
}

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
      phone: {
        type: 'string',
        required: false,
        input: false,
      },
      institutionId: {
        type: 'string',
        required: false,
        input: false,
      },
      verificationStatus: {
        type: 'string',
        required: false,
        defaultValue: 'UNVERIFIED',
        input: false,
      },
      verificationMethod: {
        type: 'string',
        required: false,
        input: false,
      },
      verifiedAt: {
        type: 'date',
        required: false,
        input: false,
      },
      verifiedBy: {
        type: 'string',
        required: false,
        input: false,
      },
      rejectionReason: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  session: {
    // Authorization fields (role/scope/active) must reflect the database on every
    // request; a cached session would keep a downgraded or deactivated user valid.
    cookieCache: {
      enabled: false,
      maxAge: 5 * 60,
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Refuse to issue a session to a deactivated account instead of creating
        // one that every subsequent API call would then have to reject.
        before: async (session) => {
          const user = await User.findById(session.userId).lean()
          if (!user || user.active === false) return false
          return { data: session }
        },
      },
    },
  },
  trustedOrigins: parseAllowedOrigins(env.CORS_ORIGIN, env.NODE_ENV),
})
