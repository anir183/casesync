import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: 'comfortable' | 'compact'
  scroll?: boolean
}

export function Table({
  density = 'comfortable',
  scroll = false,
  className,
  children,
  ...props
}: TableProps) {
  return (
    <div
      data-density={density}
      tabIndex={scroll ? 0 : undefined}
      className={cn(
        scroll &&
          'overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <table className={cn('w-full caption-bottom text-left', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-surface-sunken', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('transition-colors duration-fast ease-out hover:bg-muted/40', className)}
      {...props}
    />
  )
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border-subtle px-3 py-[var(--density-row-y)] text-left text-meta font-medium leading-[var(--density-row-leading)] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'border-b border-border-subtle px-3 py-[var(--density-row-y)] text-left text-compact leading-[var(--density-row-leading)]',
        className,
      )}
      {...props}
    />
  )
}
