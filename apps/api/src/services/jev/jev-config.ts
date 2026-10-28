import { env } from '#/config/env'

export const jevConfig = {
  enabled: env.JEV_ENABLED,
  baseUrl: env.JEVMODEL_BASE_URL,
  apiKey: env.JEVMODEL_API_KEY,
  model: env.JEVMODEL_MODEL,
  timeoutMs: 15000,
}
