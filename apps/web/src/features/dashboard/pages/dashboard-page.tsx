import { ROLES } from '@casesync/config'
import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { AdminCommandPanel } from '#/features/admin/components/admin-command-panel'
import { useCases } from '#/features/cases/api'
import { DashboardCommandSurface } from '#/features/dashboard/components/dashboard-command-surface'
import { landingForRole } from '#/features/dashboard/landing'
import type { DashboardSummary } from '#/features/dashboard/types'
import { useDashboardAttention } from '#/features/dashboard/use-dashboard-attention'
import { apiClient } from '#/lib/api-client'
import { QUERY_KEY } from '#/lib/query-keys'
import { useCurrentUser } from '#/lib/session'

const dashboardKeys = {
  summary: [QUERY_KEY.dashboard, 'summary'] as const,
}

export function DashboardPage() {
  const { user } = useCurrentUser()
  const landing = landingForRole(user?.role, {
    bureauId: user?.bureauId,
    regionId: user?.regionId,
  })

  const summary = useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 30_000,
  })
  const queue = useCases(landing.queueFilters ?? {}, { enabled: Boolean(landing.queueFilters) })
  const { newIds, newCount } = useDashboardAttention({
    userId: user?.id,
    items: queue.data?.items ?? [],
  })

  const refresh = useCallback(() => {
    void summary.refetch()
    void queue.refetch()
  }, [summary, queue])

  const adminPanel =
    landing.showAdminHub && user?.role === ROLES.ADMIN ? (
      <AdminCommandPanel summary={summary.data} />
    ) : null

  return (
    <DashboardCommandSurface
      landing={landing}
      summary={{
        data: summary.data,
        isLoading: summary.isLoading,
        isError: summary.isError,
        isFetching: summary.isFetching,
        refetch: summary.refetch,
      }}
      queue={{
        data: queue.data,
        isLoading: queue.isLoading,
        isError: queue.isError,
        isFetching: queue.isFetching,
        refetch: queue.refetch,
      }}
      newIds={newIds}
      newCount={newCount}
      onRefresh={refresh}
      admin={adminPanel}
    />
  )
}
