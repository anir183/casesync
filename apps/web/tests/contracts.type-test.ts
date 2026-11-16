/**
 * Compile-time contract checks. This file emits no runtime tests; it is checked by
 * `typecheck:web:tests`. A drift in the shared pagination envelope, or a feature that
 * reintroduces a local envelope, fails the typecheck instead of escaping into runtime.
 */
import type { Page } from '@casesync/types'
import type { CaseListItem } from '#/features/cases/api'
import type { fetchCases } from '#/features/cases/api'
import type { Institution } from '#/features/institutions/api'
import type { fetchInstitutions } from '#/features/institutions/api'
import type { Overlap } from '#/features/overlaps/api'
import type { fetchOverlaps } from '#/features/overlaps/api'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false
type Expect<T extends true> = T

/** The shared envelope is exactly the wire shape: no extra or optional fields. */
export type PageIsExactWireShape = Expect<
  Equal<Page<string>, { items: string[]; total: number; page: number; pageSize: number }>
>
export type PageKeysAreExact = Expect<
  Equal<keyof Page<string>, 'items' | 'total' | 'page' | 'pageSize'>
>

/** Every paginated fetcher returns the shared envelope, not a feature-local copy. */
export type CasesUseSharedPage = Expect<
  Equal<Awaited<ReturnType<typeof fetchCases>>, Page<CaseListItem>>
>
export type InstitutionsUseSharedPage = Expect<
  Equal<Awaited<ReturnType<typeof fetchInstitutions>>, Page<Institution>>
>
export type OverlapsUseSharedPage = Expect<
  Equal<Awaited<ReturnType<typeof fetchOverlaps>>, Page<Overlap>>
>
