import cron from 'node-cron'
import { env } from '#/config/env'
import { logger } from '#/lib/logger'
import { JOB_TRIGGER } from '#/models/job-run.model'
import { runSlaJob } from './sla'

const SLA_CRON = '0 2 * * *'

let started = false

export function startScheduler() {
  if (!env.CRON_ENABLED || started) return
  started = true

  cron.schedule(
    SLA_CRON,
    () => {
      void runSlaJob({ trigger: JOB_TRIGGER.SCHEDULED }).catch((error) => {
        logger.error('scheduled SLA job failed', {
          message: error instanceof Error ? error.message : String(error),
        })
      })
    },
    { timezone: env.SLA_TIMEZONE },
  )

  logger.info('scheduler started', {
    job: 'SLA_SCAN',
    expression: SLA_CRON,
    timezone: env.SLA_TIMEZONE,
  })
}
