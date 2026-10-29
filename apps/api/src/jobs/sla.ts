import { CASE_STATUS, NOTIFICATION_TYPE, ROLES } from '@casesync/config'
import type mongoose from 'mongoose'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { notifyRecipients, resolveScopedRecipients } from '#/lib/notifications'
import { type SlaAlert, dateKey, evaluateSlaAlerts } from '#/lib/sla'
import { Case } from '#/models/case.model'
import { type IJobRun, JOB_RUN_STATUS, JOB_TRIGGER, JobRun } from '#/models/job-run.model'
import {
  backfillCaseDeadlines,
  loadSlaCatalog,
  resolveSlaFromCatalog,
} from '#/modules/sla/sla.service'

export const SLA_JOB_NAME = 'SLA_SCAN'

const OVERSIGHT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGEMENT, ROLES.COMPETENT_AUTHORITY]

const OPEN_STATUSES = [
  CASE_STATUS.RECEIVED,
  CASE_STATUS.ASSIGNED,
  CASE_STATUS.UNDER_PROCESS,
  CASE_STATUS.TRANSFERRED,
  CASE_STATUS.ESCALATED,
  CASE_STATUS.REOPENED,
]

export interface RunSlaJobOptions {
  now?: Date
  trigger?: string
  caseIds?: string[]
}

export interface SlaJobCounts {
  backfilledDeadlines: number
  scannedCases: number
  pendingCases: number
  approachingCases: number
  overdueCases: number
  notificationsCreated: number
  errors: number
}

let running = false

function emptyCounts(): SlaJobCounts {
  return {
    backfilledDeadlines: 0,
    scannedCases: 0,
    pendingCases: 0,
    approachingCases: 0,
    overdueCases: 0,
    notificationsCreated: 0,
    errors: 0,
  }
}

function notificationContent(
  type: string,
  caseNumber: string,
  alert: SlaAlert,
  deadline: Date | undefined,
  timezone: string,
) {
  if (type === NOTIFICATION_TYPE.PENDING_REMINDER) {
    return {
      title: `Pending case reminder: ${caseNumber}`,
      message: `No action has been recorded for ${alert.staleDays} days. Please review this case.`,
    }
  }
  if (type === NOTIFICATION_TYPE.APPROACHING_DEADLINE) {
    return {
      title: `Deadline approaching: ${caseNumber}`,
      message: `The expected disposal date is ${deadline ? dateKey(deadline, timezone) : 'approaching'} (${alert.daysRemaining} day${
        alert.daysRemaining === 1 ? '' : 's'
      } remaining).`,
    }
  }
  return {
    title: `Case overdue: ${caseNumber}`,
    message: `The expected disposal date was ${deadline ? dateKey(deadline, timezone) : 'missed'}. Please act now.`,
  }
}

async function caseRecipients(item: {
  bureauId?: mongoose.Types.ObjectId
  regionId?: mongoose.Types.ObjectId
}) {
  return resolveScopedRecipients({
    roles: OVERSIGHT_ROLES,
    ...(item.bureauId ? { bureauIds: [String(item.bureauId)] } : {}),
    ...(item.regionId ? { regionIds: [String(item.regionId)] } : {}),
  })
}

export async function runSlaJob(options: RunSlaJobOptions = {}) {
  if (running) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'The SLA job is already running', 'JOB_RUNNING')
  }
  running = true
  const now = options.now ?? new Date()
  const trigger = options.trigger ?? JOB_TRIGGER.MANUAL
  let run: IJobRun | undefined
  const counts = emptyCounts()

  try {
    run = await JobRun.create({
      jobName: SLA_JOB_NAME,
      trigger,
      status: JOB_RUN_STATUS.RUNNING,
      startedAt: now,
    })

    counts.backfilledDeadlines = await backfillCaseDeadlines({
      caseIds: options.caseIds,
    })

    const catalog = await loadSlaCatalog()
    const filter: Record<string, unknown> = {
      status: { $in: OPEN_STATUSES },
    }
    if (options.caseIds) filter._id = { $in: options.caseIds }
    const items = await Case.find(filter, {
      caseNumber: 1,
      status: 1,
      category: 1,
      bureauId: 1,
      regionId: 1,
      receivedAt: 1,
      expectedDisposalAt: 1,
      lastActionAt: 1,
    }).lean()

    counts.scannedCases = items.length

    for (const item of items) {
      try {
        const sla = resolveSlaFromCatalog(catalog, {
          bureauId: item.bureauId ? String(item.bureauId) : undefined,
          category: item.category,
          regionId: item.regionId ? String(item.regionId) : undefined,
        })
        const alerts = evaluateSlaAlerts(item, now, {
          timezone: sla.timezone,
          reminderDays: sla.reminderDays,
          pendingReminderDays: sla.pendingReminderDays,
        })
        if (alerts.length === 0) continue

        const recipients = await caseRecipients(item)
        for (const alert of alerts) {
          if (alert.type === NOTIFICATION_TYPE.PENDING_REMINDER) counts.pendingCases += 1
          if (alert.type === NOTIFICATION_TYPE.APPROACHING_DEADLINE) {
            counts.approachingCases += 1
          }
          if (alert.type === NOTIFICATION_TYPE.OVERDUE) counts.overdueCases += 1
          const content = notificationContent(
            alert.type,
            item.caseNumber,
            alert,
            item.expectedDisposalAt,
            sla.timezone,
          )
          counts.notificationsCreated += await notifyRecipients(recipients, {
            type: alert.type,
            referenceId: String(item._id),
            caseId: String(item._id),
            link: `/cases/${String(item._id)}`,
            periodKey: alert.periodKey,
            title: content.title,
            message: content.message,
          })
        }
      } catch (error) {
        counts.errors += 1
        logger.warn('sla case scan failed', {
          caseId: String(item._id),
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const finishedAt = new Date()
    await JobRun.updateOne(
      { _id: run._id },
      {
        $set: {
          status: JOB_RUN_STATUS.SUCCEEDED,
          finishedAt,
          counts,
        },
      },
    )
    return {
      id: String(run._id),
      jobName: SLA_JOB_NAME,
      trigger,
      status: JOB_RUN_STATUS.SUCCEEDED,
      startedAt: now,
      finishedAt,
      counts,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (run) {
      await JobRun.updateOne(
        { _id: run._id },
        {
          $set: {
            status: JOB_RUN_STATUS.FAILED,
            finishedAt: new Date(),
            counts,
            error: message,
          },
        },
      ).catch((updateError) => {
        logger.error('failed to record SLA job failure', {
          message: updateError instanceof Error ? updateError.message : String(updateError),
        })
      })
    }
    throw error
  } finally {
    running = false
  }
}

export async function listJobRuns(jobName = SLA_JOB_NAME, limit = 10) {
  const capped = Math.min(Math.max(limit, 1), 50)
  const items = await JobRun.find({ jobName }).sort({ startedAt: -1, _id: -1 }).limit(capped).lean()
  return items.map((item) => ({
    id: String(item._id),
    jobName: item.jobName,
    trigger: item.trigger,
    status: item.status,
    startedAt: item.startedAt,
    finishedAt: item.finishedAt,
    counts: item.counts,
    error: item.error,
  }))
}
