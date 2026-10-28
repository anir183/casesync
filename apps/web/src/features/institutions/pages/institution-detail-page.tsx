import { CASE_STATUS } from '@casesync/config'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CaseTable } from '#/features/cases/components/case-table'
import { useInstitution } from '../api'

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? '—'}</span>
    </div>
  )
}

export function InstitutionDetailPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError, error } = useInstitution(id)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading institution…</p>

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Institution not found'}
        </p>
        <Link to="/cases" className="text-sm underline underline-offset-4">
          Back to case registry
        </Link>
      </div>
    )
  }

  const { institution, cases } = data
  const disposed = cases.filter((item) => item.status === CASE_STATUS.DISPOSED).length

  return (
    <div className="space-y-6">
      <div>
        <Link to="/cases" className="text-sm text-muted-foreground underline underline-offset-4">
          ← Back to case registry
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{institution.name}</h1>
          <Badge variant={institution.verified ? 'success' : 'warning'}>
            {institution.verified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidated complaint history across all Bureaus and Cells.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Institution profile</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailRow label="AICTE permanent ID" value={institution.aictePermanentId} />
            <DetailRow label="Address" value={institution.address} />
            <DetailRow label="Region" value={institution.regionId} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Case summary</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <DetailRow label="Total cases" value={cases.length} />
            <DetailRow label="Open" value={cases.length - disposed} />
            <DetailRow label="Disposed" value={disposed} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All cases</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTable cases={cases} />
        </CardContent>
      </Card>
    </div>
  )
}
