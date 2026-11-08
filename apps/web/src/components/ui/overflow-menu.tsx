import { MoreHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export interface OverflowMenuItem {
  label: string
  onSelect: () => void
  description?: string
  destructive?: boolean
  disabled?: boolean
}

export function OverflowMenu({
  label = 'More actions',
  items,
  align = 'right',
  className,
}: {
  label?: string
  items: OverflowMenuItem[]
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    )
    firstItem?.focus()

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const entries = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    )
    if (entries.length === 0) return
    const index = entries.indexOf(document.activeElement as HTMLElement)
    const nextIndex =
      event.key === 'ArrowDown'
        ? (index + 1) % entries.length
        : (index - 1 + entries.length) % entries.length
    entries[nextIndex]?.focus()
  }

  function select(item: OverflowMenuItem) {
    setOpen(false)
    triggerRef.current?.focus()
    item.onSelect()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute z-40 mt-1 max-w-[calc(100vw-2rem)] min-w-56 rounded-lg border border-border bg-card p-1 text-sm shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                item.destructive && 'text-danger',
              )}
              onClick={() => select(item)}
            >
              <span className="font-medium">{item.label}</span>
              {item.description ? (
                <span className="text-xs font-normal text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
