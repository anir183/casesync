import { CaseAction } from '#/models/case-action.model'
import { CaseAssignment } from '#/models/case-assignment.model'
import { CaseOverlapAssessment } from '#/models/case-overlap-assessment.model'
import { CaseRelationship } from '#/models/case-relationship.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import { Notification } from '#/models/notification.model'
import { SlaConfig } from '#/models/sla-config.model'
import { DEMO_CASE_NUMBERS, DEMO_INSTITUTION_IDS, DEMO_SLA_CONFIGS } from '#/seed/demo-data'
import type { SeedMastersResult } from '#/seed/masters'

function slaFilter(config: (typeof DEMO_SLA_CONFIGS)[number], masters: SeedMastersResult) {
  return {
    bureauId: (config.bureauCode ? masters.bureauByCode.get(config.bureauCode) : null) ?? null,
    category: config.category ?? null,
    regionId: (config.regionCode ? masters.regionByCode.get(config.regionCode) : null) ?? null,
  }
}

export async function resetDemoData(masters: SeedMastersResult) {
  const [cases, institutions] = await Promise.all([
    Case.find({ caseNumber: { $in: DEMO_CASE_NUMBERS } }, { _id: 1 }).lean(),
    Institution.find({ aictePermanentId: { $in: DEMO_INSTITUTION_IDS } }, { _id: 1 }).lean(),
  ])
  const caseIds = cases.map((item) => item._id)
  const institutionIds = institutions.map((item) => item._id)
  const relationships =
    caseIds.length > 0
      ? await CaseRelationship.find(
          { $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }] },
          { _id: 1 },
        ).lean()
      : []
  const referenceIds = [...caseIds.map(String), ...relationships.map((item) => String(item._id))]
  const notifications = await Notification.deleteMany({
    $or: [
      { caseId: { $in: caseIds } },
      ...(referenceIds.length > 0 ? [{ referenceId: { $in: referenceIds } }] : []),
    ],
  })
  if (caseIds.length > 0) {
    await Promise.all([
      CaseRelationship.deleteMany({
        $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }],
      }),
      CaseOverlapAssessment.deleteMany({
        $or: [{ caseAId: { $in: caseIds } }, { caseBId: { $in: caseIds } }],
      }),
      CaseAction.deleteMany({ caseId: { $in: caseIds } }),
      CaseAssignment.deleteMany({ caseId: { $in: caseIds } }),
    ])
    await Case.deleteMany({ _id: { $in: caseIds } })
  }

  for (const institutionId of institutionIds) {
    const remaining = await Case.countDocuments({ institutionId })
    if (remaining === 0) await Institution.deleteOne({ _id: institutionId })
  }

  await SlaConfig.deleteMany({
    $or: DEMO_SLA_CONFIGS.map((config) => slaFilter(config, masters)),
  })

  return {
    cases: caseIds.length,
    institutions: institutionIds.length,
    notifications: notifications.deletedCount,
  }
}
