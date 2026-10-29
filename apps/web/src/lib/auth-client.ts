import { createAuthClient } from 'better-auth/react'
import { API_BASE } from './api-client'

export const authClient = createAuthClient({
  baseURL: API_BASE,
})

export const { signIn, signUp, signOut, useSession } = authClient
