import { env } from '#/config/env'

export const jevConfig = {
  enabled: env.JEV_ENABLED,
  baseUrl: env.JEVMODEL_BASE_URL,
  apiKey: env.JEVMODEL_API_KEY,
  model: env.JEVMODEL_MODEL,
  timeoutMs: env.JEV_TIMEOUT_MS,
  maxRetries: env.JEV_MAX_RETRIES,
  coordinationThreshold: env.JEV_COORDINATION_THRESHOLD,
}

export const RETRYABLE_HTTP_STATUS = new Set([429, 502, 503, 504])
export const RETRY_BASE_DELAY_MS = 500
