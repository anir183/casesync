import { Dialog } from '#/components/ui/dialog'
import type { DialogProps } from '#/components/ui/dialog'
import { cn } from '#/lib/utils'

export interface SheetProps extends DialogProps {
  side?: 'right' | 'left'
}

export function Sheet({ side = 'right', overlayClassName, className, ...props }: SheetProps) {
  return (
    <Dialog
      {...props}
      overlayClassName={cn(
        'items-stretch p-0',
        side === 'right' ? 'justify-end' : 'justify-start',
        overlayClassName,
      )}
      className={cn(
        'h-full max-h-none w-full max-w-md rounded-none border-y-0',
        side === 'right' ? 'border-r-0' : 'border-l-0',
        className,
      )}
    />
  )
}
