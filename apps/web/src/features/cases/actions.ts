import { CASE_STATUS, CASE_TRANSITIONS, ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { useMemo } from 'react'
import { useCurrentUser } from '#/lib/session'
import type { CaseDetail } from './api'

export type ActionKind =
  | 'assign'
  | 'transfer'
  | 'startProcessing'
  | 'escalate'
  | 'dispose'
  | 'reopen'
  | 'remark'
  | 'nextAction'

export const CONFIRM_ACTIONS: ActionKind[] = ['transfer', 'dispose']

export const ACTION_LABELS: Record<ActionKind, string> = {
  assign: 'Assign / reassign',
  transfer: 'Transfer to another bureau',
  startProcessing: 'Start processing',
  escalate: 'Escalate to senior management',
  dispose: 'Dispose case',
  reopen: 'Reopen case',
  remark: 'Add remark',
  nextAction: 'Set next action',
}

export const REMARK_ACTIONS: ActionKind[] = [
  'assign',
  'transfer',
  'startProcessing',
  'escalate',
  'dispose',
  'reopen',
  'remark',
]

/**
 * Actions that change ownership or close the complaint are deliberately kept
 * behind the workspace overflow menu. The remaining actions stay in the
 * everyday action panel.
 */
export const SECONDARY_ACTION_KINDS: ActionKind[] = ['transfer', 'escalate', 'dispose', 'reopen']

export interface CaseActionOption {
  value: ActionKind
  label: string
}

export function useCaseActionOptions(item: CaseDetail | undefined) {
  const { user } = useCurrentUser()

  return useMemo(() => {
    if (!item) {
      return {
        canWrite: false,
        options: [] as CaseActionOption[],
        secondary: [] as CaseActionOption[],
      }
    }

    const transitions = CASE_TRANSITIONS[item.status] ?? []
    const canWrite = hasAnyRole(user?.role, ROLE_GROUPS.CASE_WRITE)
    const canTransfer = hasAnyRole(user?.role, ROLE_GROUPS.CASE_SENSITIVE)
    const canDispose = hasAnyRole(user?.role, ROLE_GROUPS.CASE_DISPOSAL)

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

    const options = definitions
      .filter((option) => option.enabled)
      .map(({ value, label }) => ({ value, label }))

    return {
      canWrite,
      options,
      secondary: options.filter((option) => SECONDARY_ACTION_KINDS.includes(option.value)),
    }
  }, [item, user?.role])
}
