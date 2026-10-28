import { Elysia, t } from 'elysia'
import { Institution } from '#/models/institution.model'
import { normalizeInstitutionName } from '@casesync/utils'

export const institutionsRoutes = new Elysia({ prefix: '/institutions' })
  .get('/', async ({ query }) => {
    const q = (query.q as string) || ''
    const filter: any = {}
    if (q) {
      filter.nameNormalized = { $regex: normalizeInstitutionName(q), $options: 'i' }
    }
    const items = await Institution.find(filter).limit(50).lean()
    return { items }
  })
  .post('/', async ({ body }) => {
    const b: any = body
    const nameNormalized = normalizeInstitutionName(b.name || '')
    const item = await Institution.create({ ...b, nameNormalized })
    return item
  })
  .get('/:id', async ({ params }) => {
    const item = await Institution.findById(params.id).lean()
    return item
  })
