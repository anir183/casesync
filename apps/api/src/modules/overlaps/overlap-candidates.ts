// Cross-bureau overlap candidate discovery. Read-only queries only.

import { CASE_STATUS, OVERLAP, RELATIONSHIP_MATCH_TYPE } from '@casesync/config'
import { jaroWinkler } from '@casesync/utils'
import { env } from '#/config/env'
import { Bureau } from '#/models/bureau.model'
import { Case } from '#/models/case.model'
import { Institution } from '#/models/institution.model'
import type { Candidate, CaseDoc } from './overlap-shared'

export async function findCasesForInstitutions(
  source: CaseDoc,
  institutionIds: unknown[],
): Promise<CaseDoc[]> {
  const filter: Record<string, unknown> = {
    _id: { $ne: source._id },
    institutionId: { $in: institutionIds },
    status: { $ne: CASE_STATUS.DISPOSED },
  }
  if (source.bureauId) {
    filter.bureauId = { $ne: source.bureauId }
  }
  return (await Case.find(filter).lean()) as unknown as CaseDoc[]
}
export async function findSimilarInstitutions(source: CaseDoc) {
  const institution = await Institution.findById(source.institutionId).lean()
  if (!institution?.nameNormalized) return []

  const others = await Institution.find({
    _id: { $ne: source.institutionId },
    nameNormalized: { $type: 'string' },
  })
    .limit(OVERLAP.FUZZY_INSTITUTION_LIMIT)
    .lean()

  return others
    .map((other) => ({
      id: other._id,
      score: jaroWinkler(institution.nameNormalized, other.nameNormalized),
    }))
    .filter((match) => match.score >= env.INSTITUTION_FUZZY_THRESHOLD)
}
export async function findCrossBureauCandidates(source: CaseDoc): Promise<Candidate[]> {
  const candidates = new Map<string, Candidate>()

  const exactCases = await findCasesForInstitutions(source, [source.institutionId])
  for (const item of exactCases) {
    candidates.set(String(item._id), {
      case: item,
      matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_EXACT_ID,
    })
  }

  const similarInstitutions = await findSimilarInstitutions(source)
  if (similarInstitutions.length === 0) return [...candidates.values()]

  const scoreByInstitution = new Map(
    similarInstitutions.map((match) => [String(match.id), match.score]),
  )
  const fuzzyCases = await findCasesForInstitutions(
    source,
    similarInstitutions.map((match) => match.id),
  )

  for (const item of fuzzyCases) {
    const candidateId = String(item._id)
    if (candidates.has(candidateId)) continue
    candidates.set(candidateId, {
      case: item,
      matchType: RELATIONSHIP_MATCH_TYPE.INSTITUTION_NAME_FUZZY,
      confidence: scoreByInstitution.get(String(item.institutionId)),
    })
  }

  return [...candidates.values()]
}
export async function loadAssessmentContext(caseA: CaseDoc, caseB: CaseDoc) {
  const institution = await Institution.findById(caseA.institutionId).lean()
  const bureauIds = [caseA.bureauId, caseB.bureauId].filter(Boolean).map(String)
  const bureaus = await Bureau.find({ _id: { $in: bureauIds } }).lean()
  const bureauNames = new Map<string, string>(bureaus.map((b) => [String(b._id), b.name]))
  return {
    institutionRef:
      institution?.aictePermanentId || institution?.name || String(caseA.institutionId),
    bureauNames,
  }
}
