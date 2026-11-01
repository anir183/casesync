import { useState } from 'react'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { TableScroll } from '#/components/ui/table-scroll'
import { formatDate } from '#/lib/utils'
import { useAuditLog } from '../api'

const CELL_CLASS = 'px-4 py-3 text-sm'
const HEAD_CLASS = `${CELL_CLASS} bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground`
const ROW_CLASS =
  'border-b border-border align-top transition-colors last:border-0 hover:bg-muted/40'

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
      <PageHeader
        title="Audit log"
        description="Append-only history of administrative and master-data changes."
      />

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
          {isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Loading audit log">
              {['a', 'b', 'c', 'd', 'e'].map((row) => (
                <Skeleton key={row} className="h-11 w-full" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : 'Audit log could not be loaded'}
            </p>
          )}
          {data && data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No audit entries match these filters.</p>
          )}
          {data && data.items.length > 0 && (
            <TableScroll label="Audit log entries">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className={HEAD_CLASS}>When</th>
                    <th className={HEAD_CLASS}>Actor</th>
                    <th className={HEAD_CLASS}>Action</th>
                    <th className={HEAD_CLASS}>Entity</th>
                    <th className={HEAD_CLASS}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className={ROW_CLASS}>
                      <td className={CELL_CLASS}>{formatDate(item.createdAt)}</td>
                      <td className={CELL_CLASS}>{item.actorName ?? item.actorId}</td>
                      <td className={CELL_CLASS}>
                        <Badge variant={actionVariant(item.action)}>
                          {item.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className={CELL_CLASS}>
                        <p>{item.entityType.replace(/_/g, ' ')}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.entityId}</p>
                      </td>
                      <td className={CELL_CLASS}>
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
            </TableScroll>
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
