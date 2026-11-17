// Liveness/readiness inputs. Readiness reports the two dependencies the API
// cannot serve without (Mongo) and the optional JEV integration. JEV is checked
// by configuration rather than a network probe so a slow external service never
// takes the API out of rotation; its provider failures are already logged by the
// JEV client.

import mongoose from 'mongoose'
import { env } from '#/config/env'

export type CheckStatus = 'ok' | 'degraded'

export interface ReadinessCheck {
  status: CheckStatus
  detail: string
}

export interface ReadinessResult {
  status: CheckStatus
  checks: {
    mongo: ReadinessCheck
    jev: ReadinessCheck
  }
}

export function getReadiness(): ReadinessResult {
  const mongoConnected = mongoose.connection.readyState === 1
  const mongo: ReadinessCheck = {
    status: mongoConnected ? 'ok' : 'degraded',
    detail: mongoConnected ? 'connected' : 'not connected',
  }

  const jevConfigured = Boolean(env.JEVMODEL_API_KEY)
  const jev: ReadinessCheck = env.JEV_ENABLED
    ? {
        status: jevConfigured ? 'ok' : 'degraded',
        detail: jevConfigured ? 'configured' : 'enabled without an API key',
      }
    : { status: 'ok', detail: 'disabled' }

  return {
    status: mongo.status === 'ok' && jev.status === 'ok' ? 'ok' : 'degraded',
    checks: { mongo, jev },
  }
}
