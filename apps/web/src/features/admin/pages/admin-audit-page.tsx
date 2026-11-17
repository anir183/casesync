import { useState } from 'react'
import { PageHeader } from '#/components/shared/page-header'
import { Pagination } from '#/components/shared/pagination'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Select } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '#/components/ui/table'
import { TableScroll } from '#/components/ui/table-scroll'
import { useAuditLog } from '#/features/admin/api'
import { formatDate } from '#/lib/utils'

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
    <div className="space-y-section">
      <PageHeader
        title="Audit log"
        description="Append-only history of administrative and master-data changes."
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-control">
          <CardTitle className="text-subhead">Recent activity</CardTitle>
          <div className="flex flex-wrap gap-tight">
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
            <p className="text-body text-danger">
              {error instanceof Error ? error.message : 'Audit log could not be loaded'}
            </p>
          )}
          {data && data.items.length === 0 && (
            <p className="text-body text-muted-foreground">No audit entries match these filters.</p>
          )}
          {data && data.items.length > 0 && (
            <TableScroll label="Audit log entries">
              <Table className="min-w-[900px]" density="compact">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className="uppercase tracking-wide">When</TableHeaderCell>
                    <TableHeaderCell className="uppercase tracking-wide">Actor</TableHeaderCell>
                    <TableHeaderCell className="uppercase tracking-wide">Action</TableHeaderCell>
                    <TableHeaderCell className="uppercase tracking-wide">Entity</TableHeaderCell>
                    <TableHeaderCell className="uppercase tracking-wide">Details</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id} className="align-top last:border-0">
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>{item.actorName ?? item.actorId}</TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(item.action)}>
                          {item.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p>{item.entityType.replace(/_/g, ' ')}</p>
                        <p className="font-mono text-meta text-muted-foreground">{item.entityId}</p>
                      </TableCell>
                      <TableCell>
                        <details>
                          <summary className="cursor-pointer text-meta underline underline-offset-4">
                            View before / after
                          </summary>
                          <div className="mt-2 grid gap-tight lg:grid-cols-2">
                            <div>
                              <p className="text-meta font-medium text-muted-foreground">Before</p>
                              <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted p-2 text-meta">
                                {item.before ? JSON.stringify(item.before, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-meta font-medium text-muted-foreground">After</p>
                              <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted p-2 text-meta">
                                {item.after ? JSON.stringify(item.after, null, 2) : '—'}
                              </pre>
                              {item.metadata && (
                                <>
                                  <p className="mt-2 text-meta font-medium text-muted-foreground">
                                    Metadata
                                  </p>
                                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-meta">
                                    {JSON.stringify(item.metadata, null, 2)}
                                  </pre>
                                </>
                              )}
                            </div>
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
