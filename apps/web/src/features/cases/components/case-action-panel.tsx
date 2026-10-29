import { CASE_STATUS, CASE_TRANSITIONS, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '#/components/shared/confirm-dialog'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { useBureaus } from '#/features/organization/api'
import { useCurrentUser } from '#/lib/session'
import { type CaseActionInput, type CaseDetail, useCaseAction, useOfficerDirectory } from '../api'

type ActionKind =
  | 'assign'
  | 'transfer'
  | 'startProcessing'
  | 'escalate'
  | 'dispose'
  | 'reopen'
  | 'remark'
  | 'nextAction'

const CONFIRM_ACTIONS: ActionKind[] = ['transfer', 'dispose']

const ACTION_LABELS: Record<ActionKind, string> = {
  assign: 'Assign / reassign',
  transfer: 'Transfer to another bureau',
  startProcessing: 'Start processing',
  escalate: 'Escalate to senior management',
  dispose: 'Dispose case',
  reopen: 'Reopen case',
  remark: 'Add remark',
  nextAction: 'Set next action',
}

const REMARK_ACTIONS: ActionKind[] = [
  'assign',
  'transfer',
  'startProcessing',
  'escalate',
  'dispose',
  'reopen',
  'remark',
]

export function CaseActionPanel({ item }: { item: CaseDetail }) {
  const { user } = useCurrentUser()
  const { data: bureaus } = useBureaus()
  const action = useCaseAction(item.id)
  const [kind, setKind] = useState<ActionKind>('remark')
  const [bureauId, setBureauId] = useState(item.bureauId ?? '')
  const [officerId, setOfficerId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [nextAction, setNextAction] = useState(item.nextAction ?? '')
  const [nextActionDueAt, setNextActionDueAt] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const transitions = CASE_TRANSITIONS[item.status] ?? []
  const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)
  const canTransfer = hasAnyRole(user?.role, ROLE_GROUPS.CASE_SENSITIVE)
  const canDispose = hasAnyRole(user?.role, ROLE_GROUPS.CASE_DISPOSAL)
  const { data: officers } = useOfficerDirectory(bureauId || undefined)

  const options = useMemo(() => {
    const definitions: Array<{ value: ActionKind; label: string; enabled: boolean }> = [
      {
        value: 'assign',
        label: ACTION_LABELS.assign,
        enabled:
          canWrite &&
          (item.status === CASE_STATUS.ASSIGNED || transitions.includes(CASE_STATUS.ASSIGNED)),
      },
      {
        value: 'transfer',
        label: ACTION_LABELS.transfer,
        enabled: canTransfer && transitions.includes(CASE_STATUS.TRANSFERRED),
      },
      {
        value: 'startProcessing',
        label: ACTION_LABELS.startProcessing,
        enabled: canWrite && transitions.includes(CASE_STATUS.UNDER_PROCESS),
      },
      {
        value: 'escalate',
        label: ACTION_LABELS.escalate,
        enabled: canWrite && transitions.includes(CASE_STATUS.ESCALATED),
      },
      {
        value: 'dispose',
        label: ACTION_LABELS.dispose,
        enabled: canDispose && transitions.includes(CASE_STATUS.DISPOSED),
      },
      {
        value: 'reopen',
        label: ACTION_LABELS.reopen,
        enabled: canWrite && transitions.includes(CASE_STATUS.REOPENED),
      },
      { value: 'remark', label: ACTION_LABELS.remark, enabled: canWrite },
      { value: 'nextAction', label: ACTION_LABELS.nextAction, enabled: canWrite },
    ]
    return definitions
      .filter((option) => option.enabled)
      .map(({ value, label }) => ({ value, label }))
  }, [item.status, transitions, canWrite, canTransfer, canDispose])

  useEffect(() => {
    if (!options.some((option) => option.value === kind)) {
      setKind(options[0]?.value ?? 'remark')
    }
  }, [options, kind])

  useEffect(() => {
    setBureauId(item.bureauId ?? '')
  }, [item.bureauId])

  if (!canWrite) return null

  function buildInput(): CaseActionInput | null {
    if (kind === 'assign' || kind === 'transfer') {
      if (!bureauId) {
        setError('Select a bureau or cell.')
        return null
      }
      return {
        kind,
        bureauId,
        officerId: officerId || undefined,
        remarks: remarks.trim() || undefined,
      }
    }
    if (kind === 'remark') {
      if (!remarks.trim()) {
        setError('Enter a remark before saving.')
        return null
      }
      return { kind: 'remark', remarks: remarks.trim() }
    }
    if (kind === 'nextAction') {
      if (!nextAction.trim()) {
        setError('Enter the next action before saving.')
        return null
      }
      return {
        kind: 'nextAction',
        nextAction: nextAction.trim(),
        nextActionDueAt: nextActionDueAt || undefined,
      }
    }
    if (kind === 'startProcessing') {
      return {
        kind: 'status',
        status: CASE_STATUS.UNDER_PROCESS,
        remarks: remarks.trim() || undefined,
      }
    }
    if (kind === 'reopen') {
      return {
        kind: 'status',
        status: CASE_STATUS.REOPENED,
        remarks: remarks.trim() || undefined,
      }
    }
    return { kind, remarks: remarks.trim() || undefined }
  }

  function submit() {
    setError(null)
    setFeedback(null)
    const input = buildInput()
    if (!input) return
    action.mutate(input, {
      onSuccess: () => {
        setConfirming(false)
        setRemarks('')
        setNextActionDueAt('')
        setFeedback(`${ACTION_LABELS[kind]} recorded.`)
      },
      onError: (mutationError) => {
        setConfirming(false)
        setError(
          mutationError instanceof Error ? mutationError.message : 'The action could not be saved.',
        )
      },
    })
  }

  function requestSubmit() {
    setError(null)
    if (buildInput() === null) return
    if (CONFIRM_ACTIONS.includes(kind)) {
      setConfirming(true)
      return
    }
    submit()
  }

  const showBureau = kind === 'assign' || kind === 'transfer'
  const showRemarks = REMARK_ACTIONS.includes(kind)
  const showNextAction = kind === 'nextAction'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No actions are available for your role in the current status.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <FieldLabel htmlFor="case-action">Action</FieldLabel>
              <Select
                id="case-action"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as ActionKind)
                  setFeedback(null)
                  setError(null)
                }}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {showBureau && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor="action-bureau">Bureau or Cell</FieldLabel>
                  <Select
                    id="action-bureau"
                    value={bureauId}
                    onChange={(event) => {
                      setBureauId(event.target.value)
                      setOfficerId('')
                    }}
                  >
                    <option value="">Select a bureau</option>
                    {bureaus?.map((bureau) => (
                      <option key={bureau.id} value={bureau.id}>
                        {bureau.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="action-officer">Officer (optional)</FieldLabel>
                  <Select
                    id="action-officer"
                    value={officerId}
                    disabled={!bureauId}
                    onChange={(event) => setOfficerId(event.target.value)}
                  >
                    <option value="">Leave unassigned</option>
                    {officers?.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {showNextAction && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldLabel htmlFor="action-next">Next action</FieldLabel>
                  <Input
                    id="action-next"
                    value={nextAction}
                    onChange={(event) => setNextAction(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="action-next-due">Due date</FieldLabel>
                  <Input
                    id="action-next-due"
                    type="date"
                    value={nextActionDueAt}
                    onChange={(event) => setNextActionDueAt(event.target.value)}
                  />
                </div>
              </div>
            )}

            {showRemarks && (
              <div className="space-y-1">
                <FieldLabel htmlFor="action-remarks">
                  Remarks {kind === 'remark' ? '' : '(optional)'}
                </FieldLabel>
                <Textarea
                  id="action-remarks"
                  rows={3}
                  maxLength={2000}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Record the reason and any coordination context."
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}

            <Button onClick={requestSubmit} disabled={action.isPending}>
              {action.isPending ? 'Saving…' : ACTION_LABELS[kind]}
            </Button>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        title={kind === 'dispose' ? 'Dispose this case?' : 'Transfer this case?'}
        description={
          kind === 'dispose'
            ? 'The case will be closed and removed from the active workload. The action is recorded in the audit trail.'
            : 'The case will move to the selected bureau or cell and the assignment history will record the handover.'
        }
        confirmLabel={kind === 'dispose' ? 'Dispose case' : 'Transfer case'}
        destructive={kind === 'dispose'}
        pending={action.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      />
    </Card>
  )
}
