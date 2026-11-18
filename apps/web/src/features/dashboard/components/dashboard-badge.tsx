// Compact badge scale for the dashboard only. The shared Badge stays unchanged
// so other screens and visual baselines are not affected.

import { type VariantProps, cva } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

const dashboardBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0 text-xs font-medium leading-4',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-foreground',
        primary: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-success-soft text-success-soft-foreground',
        warning: 'border-transparent bg-warning-soft text-warning-soft-foreground',
        danger: 'border-transparent bg-danger-soft text-danger-soft-foreground',
        info: 'border-transparent bg-info-soft text-info-soft-foreground',
        muted: 'border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface DashboardBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof dashboardBadgeVariants> {}

export function DashboardBadge({ className, variant, ...props }: DashboardBadgeProps) {
  return <span className={cn(dashboardBadgeVariants({ variant }), className)} {...props} />
}
