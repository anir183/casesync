// Persistence for demo overlap and escalation notifications.

import { CASE_STATUS, NOTIFICATION_TYPE, OVERLAP, OVERLAP_MERGE_STATUS } from '@casesync/config'
import { Notification } from '#/models/notification.model'
import type { SeedMastersResult } from '#/seed/masters'
import {
  type DemoCaseState,
  type NotificationInput,
  addDays,
  demoBureauOfficer,
  demoOversightUsers,
} from './demo-fixtures'
import type { seedOverlaps } from './demo-seed-overlaps'

export async function upsertNotification(input: NotificationInput) {
  await Notification.findOneAndUpdate(
    {
      recipientId: input.recipientId,
      type: input.type,
      referenceId: input.referenceId,
      periodKey: input.periodKey,
    },
    {
      $set: {
        link: input.link,
        title: input.title,
        message: input.message,
        readAt: input.readAt,
      },
      $unset: {
        ...(input.readAt ? {} : { readAt: 1 }),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}
export async function seedNotifications(
  masters: SeedMastersResult,
  relationships: Awaited<ReturnType<typeof seedOverlaps>>,
  cases: Map<string, DemoCaseState>,
  now: Date,
) {
  const oversight = demoOversightUsers(masters)
  for (const [index, relationship] of relationships.entries()) {
    const recipients = new Set(oversight)
    const officerA = demoBureauOfficer(masters, relationship.bureauA)
    const officerB = demoBureauOfficer(masters, relationship.bureauB)
    if (officerA) recipients.add(officerA)
    if (officerB) recipients.add(officerB)
    const readOn = index === 0 ? 1 : index + 1
    const mergeType =
      relationship.mergeStatus === OVERLAP_MERGE_STATUS.AUTO_MERGED ||
      relationship.mergeStatus === OVERLAP_MERGE_STATUS.MANUAL_MERGED
        ? 'merged'
        : relationship.mergeStatus === OVERLAP_MERGE_STATUS.REVERTED
          ? 'reverted'
          : undefined
    const referenceId = mergeType ? (relationship.mergeGroupId ?? relationship.id) : relationship.id
    for (const [recipientIndex, recipientId] of [...recipients].entries()) {
      await upsertNotification({
        recipientId,
        type:
          mergeType === 'merged'
            ? NOTIFICATION_TYPE.OVERLAP_MERGED
            : mergeType === 'reverted'
              ? NOTIFICATION_TYPE.OVERLAP_MERGE_REVERTED
              : NOTIFICATION_TYPE.OVERLAP_ALERT,
        referenceId,
        periodKey: mergeType ? mergeType.toUpperCase() : OVERLAP.NOTIFICATION_PERIOD_KEY,
        link: mergeType ? `/merge-groups/${referenceId}` : `/overlaps/${relationship.id}`,
        title:
          mergeType === 'merged'
            ? 'Overlap merge group updated'
            : mergeType === 'reverted'
              ? 'Overlap merge reverted'
              : OVERLAP.HEADING,
        message:
          mergeType === 'merged'
            ? `${relationship.caseANumber} and ${relationship.caseBNumber} are linked for coordinated handling. This is not a duplicate determination.`
            : mergeType === 'reverted'
              ? `${relationship.caseANumber} and ${relationship.caseBNumber} returned to human review. Original records are unchanged.`
              : `${relationship.caseANumber} and ${relationship.caseBNumber} concern the same institution but are handled by different Bureaus/Cells. Human review is required.`,
        ...(recipientIndex >= readOn ? { readAt: addDays(now, -1) } : {}),
      })
    }
  }

  for (const item of cases.values()) {
    if (item.status !== CASE_STATUS.ESCALATED) continue
    const recipients = new Set(oversight)
    const officer = demoBureauOfficer(masters, item.bureauId)
    if (officer) recipients.add(officer)
    for (const [index, recipientId] of [...recipients].entries()) {
      await upsertNotification({
        recipientId,
        type: NOTIFICATION_TYPE.ESCALATION,
        referenceId: item.id,
        periodKey: 'DEMO',
        link: `/cases/${item.id}`,
        title: 'Case escalated',
        message: `${item.caseNumber} has been escalated for senior coordination.`,
        ...(index === recipients.size - 1 ? {} : { readAt: addDays(now, -1) }),
      })
    }
  }
}
