import { jevConfig } from './jev-config'
import type { JevRequest, JevResponse } from './jev-types'

export class JevProvider {
  async assessPair(request: JevRequest): Promise<JevResponse> {
    if (!jevConfig.enabled) {
      throw new Error('JEV_DISABLED')
    }
    if (!jevConfig.apiKey) {
      throw new Error('JEV_API_KEY_MISSING')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), jevConfig.timeoutMs)

    try {
      const res = await fetch(`${jevConfig.baseUrl}/v1/systemone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jevConfig.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`JEV_HTTP_${res.status}: ${text}`)
      }

      const data = (await res.json()) as JevResponse
      return data
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const jevProvider = new JevProvider()
