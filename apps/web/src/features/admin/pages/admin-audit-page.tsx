import { useState } from 'react'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { formatDate } from '#/lib/utils'
import { useAuditLog } from '../api'

const ENTITY_TYPES = [
  'USER',
  'BUREAU',
  'REGION',
  'CATEGORY',
  'SLA_CONFIG',
  'INSTITUTION',
  'ATTACHMENT',
]
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'MERGE', 'RESET_PASSWORD']

function actionVariant(action: string) {
  if (action === 'DELETE') return 'danger' as const
  if (action === 'MERGE') return 'warning' as const
  if (action === 'CREATE') return 'success' as const
  return 'muted' as const
}

export function AdminAuditPage() {
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { data, isLoading, error } = useAuditLog({ entityType, action, page, pageSize })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only history of administrative and master-data changes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Filter audit entity"
              className="w-44"
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All entity types</option>
              {ENTITY_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter audit action"
              className="w-40"
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All actions</option>
              {ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading audit log...</p>}
          {error && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Audit log could not be loaded'}
            </p>
          )}
          {data && data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit entries match these filters.</p>
          )}
          {data && data.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">When</th>
                    <th className="px-3 py-2.5">Actor</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Entity</th>
                    <th className="px-3 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-border align-top last:border-0">
                      <td className="px-3 py-2.5 text-sm">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-2.5 text-sm">{item.actorName ?? item.actorId}</td>
                      <td className="px-3 py-2.5 text-sm">
                        <Badge variant={actionVariant(item.action)}>
                          {item.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <p>{item.entityType.replace(/_/g, ' ')}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.entityId}</p>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <details>
                          <summary className="cursor-pointer text-xs underline underline-offset-4">
                            View before / after
                          </summary>
                          <div className="mt-2 grid gap-2 lg:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Before</p>
                              <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted p-2 text-xs">
                                {item.before ? JSON.stringify(item.before, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">After</p>
                              <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted p-2 text-xs">
                                {item.after ? JSON.stringify(item.after, null, 2) : '—'}
                              </pre>
                              {item.metadata && (
                                <>
                                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                                    Metadata
                                  </p>
                                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                                    {JSON.stringify(item.metadata, null, 2)}
                                  </pre>
                                </>
                              )}
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.total > 0 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
