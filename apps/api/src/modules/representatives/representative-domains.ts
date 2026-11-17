// Email-domain suggestions and the admin allowlist for institution domains.

import { AUDIT_ACTION, AUDIT_ENTITY, recordAudit } from '#/lib/audit'
import { AppError, HTTP_STATUS } from '#/lib/errors'
import { domainFromEmail, isValidEmailDomain, normalizeEmailDomain } from '#/lib/institution-domain'
import { InstitutionEmailDomain } from '#/models/institution-email-domain.model'
import { Institution } from '#/models/institution.model'
import { loadInstitutionNames } from '#/modules/complaints/complaint.service'
import type { DomainInput } from './representative-shared'
import { requireDomainInstitution } from './representative-shared'

export async function suggestInstitutionForEmail(email: string) {
  const domain = domainFromEmail(email)
  if (!domain || !isValidEmailDomain(domain)) return { suggested: false as const }
  const entry = await InstitutionEmailDomain.findOne({
    domainNormalized: domain,
    active: true,
    verified: true,
  }).lean()
  if (!entry) return { suggested: false as const }
  const institution = await Institution.findById(entry.institutionId, { name: 1 }).lean()
  if (!institution) return { suggested: false as const }
  return {
    suggested: true as const,
    domain,
    institution: { id: String(institution._id), name: institution.name },
  }
}

export async function listInstitutionDomains(query: { q?: string; institutionId?: string } = {}) {
  const filter: Record<string, unknown> = {}
  if (query.institutionId) filter.institutionId = query.institutionId
  if (query.q) {
    filter.domainNormalized = {
      $regex: normalizeEmailDomain(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    }
  }
  const items = await InstitutionEmailDomain.find(filter)
    .sort({ domainNormalized: 1 })
    .limit(500)
    .lean()
  const institutions = await loadInstitutionNames(items.map((item) => item.institutionId))
  return {
    items: items.map((item) => ({
      id: String(item._id),
      domain: item.domain,
      domainNormalized: item.domainNormalized,
      institutionId: String(item.institutionId),
      institutionName: institutions.get(String(item.institutionId)),
      verified: item.verified,
      active: item.active,
      notes: item.notes,
      addedAt: item.addedAt,
      ...(item.addedBy ? { addedBy: item.addedBy } : {}),
    })),
  }
}

export async function createInstitutionDomain(input: DomainInput, actorId: string) {
  const domainNormalized = normalizeEmailDomain(input.domain)
  if (!isValidEmailDomain(domainNormalized)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a valid email domain', 'INVALID_DOMAIN')
  }
  const institution = await requireDomainInstitution(input.institutionId)
  const existing = await InstitutionEmailDomain.findOne({ domainNormalized }).lean()
  if (existing) {
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'That domain is already on the allowlist',
      'DUPLICATE_DOMAIN',
    )
  }
  const item = await InstitutionEmailDomain.create({
    domain: domainNormalized,
    domainNormalized,
    institutionId: input.institutionId,
    verified: input.verified ?? false,
    active: input.active ?? true,
    addedBy: actorId,
    addedAt: new Date(),
    notes: input.notes?.trim() || undefined,
  })
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.CREATE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: String(item._id),
    after: {
      domain: domainNormalized,
      institutionId: input.institutionId,
      verified: item.verified,
      active: item.active,
    },
    metadata: { institutionEmailDomain: true, institutionName: institution.name },
  })
  return {
    id: String(item._id),
    domain: item.domain,
    domainNormalized: item.domainNormalized,
    institutionId: String(item.institutionId),
    institutionName: institution.name,
    verified: item.verified,
    active: item.active,
    notes: item.notes,
    addedAt: item.addedAt,
  }
}

export async function updateInstitutionDomain(
  id: string,
  input: Partial<Pick<DomainInput, 'domain' | 'institutionId' | 'verified' | 'active' | 'notes'>>,
  actorId: string,
) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const existing = await InstitutionEmailDomain.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const update: Record<string, unknown> = {}
  if (input.domain !== undefined) {
    const domainNormalized = normalizeEmailDomain(input.domain)
    if (!isValidEmailDomain(domainNormalized)) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Enter a valid email domain', 'INVALID_DOMAIN')
    }
    const duplicate = await InstitutionEmailDomain.findOne({
      domainNormalized,
      _id: { $ne: id },
    }).lean()
    if (duplicate) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'That domain is already on the allowlist',
        'DUPLICATE_DOMAIN',
      )
    }
    update.domain = domainNormalized
    update.domainNormalized = domainNormalized
  }
  if (input.institutionId !== undefined) {
    await requireDomainInstitution(input.institutionId)
    update.institutionId = input.institutionId
  }
  if (input.verified !== undefined) update.verified = input.verified
  if (input.active !== undefined) update.active = input.active
  if (input.notes !== undefined) update.notes = input.notes.trim() || null

  await InstitutionEmailDomain.updateOne({ _id: id }, { $set: update })
  const item = await InstitutionEmailDomain.findById(id).lean()
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.UPDATE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: id,
    before: {
      domain: existing.domainNormalized,
      verified: existing.verified,
      active: existing.active,
    },
    after: {
      domain: item?.domainNormalized,
      verified: item?.verified,
      active: item?.active,
    },
    metadata: { institutionEmailDomain: true },
  })
  if (!item) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const institutions = await loadInstitutionNames([item.institutionId])
  return {
    id: String(item._id),
    domain: item.domain,
    domainNormalized: item.domainNormalized,
    institutionId: String(item.institutionId),
    institutionName: institutions.get(String(item.institutionId)),
    verified: item.verified,
    active: item.active,
    notes: item.notes,
    addedAt: item.addedAt,
  }
}

export async function deleteInstitutionDomain(id: string, actorId: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  const existing = await InstitutionEmailDomain.findById(id).lean()
  if (!existing) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Domain not found', 'DOMAIN_NOT_FOUND')
  }
  await InstitutionEmailDomain.deleteOne({ _id: id })
  await recordAudit({
    actorId,
    action: AUDIT_ACTION.DELETE,
    entityType: AUDIT_ENTITY.INSTITUTION,
    entityId: id,
    before: {
      domain: existing.domainNormalized,
      institutionId: String(existing.institutionId),
      verified: existing.verified,
      active: existing.active,
    },
    metadata: { institutionEmailDomain: true },
  })
  return { ok: true }
}
