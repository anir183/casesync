/**
 * Shared paginated response envelope. The API pagination helper and every
 * paginated web feature import this definition so the wire shape cannot drift.
 */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
