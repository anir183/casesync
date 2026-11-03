import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { ROLE_KEYS, accountFor } from './fixtures/accounts'
import { signedInApi } from './fixtures/api'
import { authFile } from './fixtures/auth'

export default async function globalSetup() {
  for (const role of ROLE_KEYS) {
    const account = accountFor(role)
    const api = await signedInApi(role)
    try {
      const state = await api.storageState()
      const path = authFile(role)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `${JSON.stringify(state, null, 2)}\n`)
      console.log(`[e2e] cached ${role} session for ${account.email}`)
    } finally {
      await api.dispose()
    }
  }
}
