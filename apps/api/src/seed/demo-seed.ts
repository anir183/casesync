// Public facade for the demo seed. The seed CLI imports only this module;
// fixture builders and persistence sections are internal to the seed feature.

import { Bureau } from '#/models/bureau.model'
import { Region } from '#/models/region.model'
import type { SeedMastersResult } from '#/seed/masters'
import { DEMO_CASES, DEMO_INSTITUTIONS, DEMO_OVERLAPS, DEMO_SLA_CONFIGS } from './demo-data'
import { startOfUtcDay } from './demo-fixtures'
import { seedCases } from './demo-seed-cases'
import {
  seedComplainant,
  seedInstitutions,
  seedRepresentatives,
  seedSlaConfigs,
} from './demo-seed-identity'
import { seedNotifications } from './demo-seed-notifications'
import { seedOverlaps } from './demo-seed-overlaps'

export async function seedDemoData(masters: SeedMastersResult, now = new Date()) {
  const anchor = startOfUtcDay(now)
  const institutions = await seedInstitutions(masters)
  const representatives = await seedRepresentatives(institutions, masters, now)
  await seedComplainant(institutions, now)
  await seedSlaConfigs(masters)
  const cases = await seedCases(masters, institutions, anchor)
  const relationships = await seedOverlaps(masters, cases, now)
  await seedNotifications(masters, relationships, cases, now)
  return {
    institutions: DEMO_INSTITUTIONS.length,
    cases: DEMO_CASES.length,
    relationships: DEMO_OVERLAPS.length,
    slaConfigs: DEMO_SLA_CONFIGS.length,
    complainants: 1,
    representatives,
    bureaus: await Bureau.countDocuments({ code: { $in: ['PGRC', 'RB', 'ACAD', 'FIN'] } }),
    regions: await Region.countDocuments({}),
  }
}

export { DEMO_REPRESENTATIVE_EMAILS } from './demo-fixtures'
