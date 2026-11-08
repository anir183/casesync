import { Check } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { cn, formatDateOnly } from '#/lib/utils'

export type ResolutionLoopAudience = 'staff' | 'complainant'

type LoopStepKey =
  | 'request'
  | 'acknowledge'
  | 'respond'
  | 'escalate'
  | 'resolve'
  | 'reopen'
  | 'close'

const LOOP_STEPS: Array<{ key: LoopStepKey; label: string; optional?: boolean }> = [
  { key: 'request', label: 'Request' },
  { key: 'acknowledge', label: 'Acknowledge' },
  { key: 'respond', label: 'Respond' },
  { key: 'escalate', label: 'Escalate', optional: true },
  { key: 'resolve', label: 'Resolve' },
  { key: 'reopen', label: 'Reopen', optional: true },
  { key: 'close', label: 'Close' },
]

const RESPOND_REACHED = [
  'ASSIGNED',
  'UNDER_PROCESS',
  'AWAITING_COMPLAINANT',
  'TRANSFERRED',
  'ESCALATED',
  'DISPOSED',
  'CLOSED',
  'REOPENED',
]

const RESOLVE_REACHED = ['DISPOSED', 'CLOSED', 'REOPENED']

function currentStep(status: string): LoopStepKey | null {
  switch (status) {
    case 'RECEIVED':
      return 'acknowledge'
    case 'ACKNOWLEDGED':
    case 'ASSIGNED':
    case 'UNDER_PROCESS':
    case 'AWAITING_COMPLAINANT':
    case 'TRANSFERRED':
    case 'REOPENED':
      return 'respond'
    case 'ESCALATED':
      return 'escalate'
    case 'DISPOSED':
      return 'close'
    case 'CLOSED':
      return null
    default:
      return 'respond'
  }
}

function reachedSteps(status: string, history: string[]) {
  const seen = new Set([...history, status])
  return {
    request: true,
    acknowledge: seen.has('ACKNOWLEDGED'),
    respond: RESPOND_REACHED.some((entry) => seen.has(entry)),
    escalate: seen.has('ESCALATED'),
    resolve: RESOLVE_REACHED.some((entry) => seen.has(entry)),
    reopen: seen.has('REOPENED'),
    close: seen.has('CLOSED'),
  } satisfies Record<LoopStepKey, boolean>
}

function nextStepCopy(status: string, audience: ResolutionLoopAudience) {
  const complainant = audience === 'complainant'
  switch (status) {
    case 'RECEIVED':
      return {
        owner: 'AICTE case team',
        action: complainant ? 'Acknowledge your complaint' : 'Acknowledge the complaint',
      }
    case 'ACKNOWLEDGED':
      return {
        owner: 'AICTE case team',
        action: complainant ? 'Review and respond to your complaint' : 'Review and respond',
      }
    case 'ASSIGNED':
      return {
        owner: 'Assigned bureau officer',
        action: complainant ? 'Review your complaint' : 'Review the assigned case',
      }
    case 'UNDER_PROCESS':
      return {
        owner: 'Assigned bureau officer',
        action: complainant ? 'Complete the review and respond' : 'Complete the review and respond',
      }
    case 'AWAITING_COMPLAINANT':
      return {
        owner: complainant ? 'You' : 'Complainant',
        action: complainant
          ? 'Provide the information the case team requested'
          : 'Waiting for the complainant to respond',
      }
    case 'TRANSFERRED':
      return {
        owner: 'Receiving bureau officer',
        action: complainant ? 'Review the transferred complaint' : 'Review the transferred case',
      }
    case 'ESCALATED':
      return {
        owner: 'Senior management',
        action: complainant ? 'Review the escalation' : 'Review and decide the escalation',
      }
    case 'DISPOSED':
      return {
        owner: complainant ? 'You' : 'Complainant',
        action: complainant
          ? 'Accept the resolution, reopen, or let the case close'
          : 'Waiting for the complainant to accept the resolution',
      }
    case 'CLOSED':
      return {
        owner: 'No action',
        action: 'The complaint is closed',
      }
    case 'REOPENED':
      return {
        owner: 'Assigned bureau officer',
        action: complainant ? 'Review the reopened complaint' : 'Review the reopened case',
      }
    default:
      return {
        owner: 'AICTE case team',
        action: 'Review the complaint',
      }
  }
}

function slaCopy({
  status,
  audience,
  expectedDisposalAt,
  nextActionDueAt,
  reopenDeadline,
  closedAt,
}: {
  status: string
  audience: ResolutionLoopAudience
  expectedDisposalAt?: string
  nextActionDueAt?: string
  reopenDeadline?: string
  closedAt?: string
}) {
  if (status === 'CLOSED') {
    return {
      text: closedAt ? `Closed ${formatDateOnly(closedAt)}` : 'Closed',
      overdue: false,
    }
  }

  if (audience === 'complainant' && status === 'DISPOSED' && reopenDeadline) {
    return {
      text: `Reopen window closes ${formatDateOnly(reopenDeadline)}`,
      overdue: new Date(reopenDeadline).getTime() < Date.now(),
    }
  }

  if (nextActionDueAt && audience === 'staff') {
    return {
      text: `Next action due ${formatDateOnly(nextActionDueAt)}`,
      overdue: new Date(nextActionDueAt).getTime() < Date.now(),
    }
  }

  if (expectedDisposalAt) {
    const overdue = new Date(expectedDisposalAt).getTime() < Date.now()
    return {
      text: `Target decision ${formatDateOnly(expectedDisposalAt)}`,
      overdue,
    }
  }

  return { text: 'No deadline recorded', overdue: false }
}

export function ResolutionLoop({
  status,
  history = [],
  nextAction,
  nextActionDueAt,
  expectedDisposalAt,
  reopenDeadline,
  closedAt,
  audience,
  className,
}: {
  status: string
  history?: string[]
  nextAction?: string
  nextActionDueAt?: string
  expectedDisposalAt?: string
  reopenDeadline?: string
  closedAt?: string
  audience: ResolutionLoopAudience
  className?: string
}) {
  const activeStep = currentStep(status)
  const reached = reachedSteps(status, history)
  const next = nextStepCopy(status, audience)
  const sla = slaCopy({
    status,
    audience,
    expectedDisposalAt,
    nextActionDueAt,
    reopenDeadline,
    closedAt,
  })
  const nextActionText = audience === 'staff' && nextAction ? nextAction : next.action
  const ownerNeedsComplainant = next.owner === 'You' || next.owner === 'Complainant'
  const ownerIsClosed = next.owner === 'No action'

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Resolution loop</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol
          aria-label="Complaint lifecycle"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        >
          {LOOP_STEPS.map((step) => {
            const isCurrent = activeStep === step.key
            const isComplete = reached[step.key]
            const state = isCurrent ? 'current' : isComplete ? 'complete' : 'upcoming'
            return (
              <li
                key={step.key}
                aria-current={isCurrent ? 'step' : undefined}
                data-state={state}
                className={cn(
                  'rounded-lg border p-2.5',
                  state === 'complete' && 'border-success/30 bg-success-soft/40',
                  state === 'current' && 'border-primary bg-primary/10',
                  state === 'upcoming' && 'border-dashed border-border bg-muted/20',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                      state === 'complete' && 'border-success bg-success text-success-foreground',
                      state === 'current' && 'border-primary bg-primary text-primary-foreground',
                      state === 'upcoming' && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {state === 'complete' ? (
                      <Check className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      LOOP_STEPS.findIndex((entry) => entry.key === step.key) + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      state === 'upcoming' && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {step.optional && !isComplete ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">Optional</p>
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next action
            </p>
            <p>{nextActionText}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Owner
            </p>
            <Badge variant={ownerIsClosed ? 'muted' : ownerNeedsComplainant ? 'warning' : 'info'}>
              {next.owner}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              SLA context
            </p>
            <p className={sla.overdue ? 'text-danger' : undefined}>
              {sla.text}
              {sla.overdue && sla.text !== 'No deadline recorded' ? ' · overdue' : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
