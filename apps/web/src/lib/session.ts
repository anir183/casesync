import { useSession } from '#/lib/auth-client'

export interface CurrentUser {
  id: string
  name?: string
  email?: string
  role?: string
  bureauId?: string
  regionId?: string
}

export function useCurrentUser() {
  const { data, isPending } = useSession()
  return { user: data?.user as CurrentUser | undefined, isPending }
}
