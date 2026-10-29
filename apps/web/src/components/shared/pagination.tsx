import { PAGINATION } from '@casesync/config'
import { Button } from '#/components/ui/button'
import { Select } from '#/components/ui/select'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
      <span className="text-muted-foreground">
        Showing {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Select
          aria-label="Rows per page"
          className="h-8 w-24"
          value={String(pageSize)}
          onChange={(event) => {
            onPageSizeChange?.(Number(event.target.value))
            onPageChange(PAGINATION.DEFAULT_PAGE)
          }}
        >
          {PAGINATION.PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
