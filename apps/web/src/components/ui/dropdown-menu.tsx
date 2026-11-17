import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { cn } from '#/lib/utils'

export interface DropdownMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
}

export interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownMenuItem[]
  align?: 'start' | 'end'
  ariaLabel: string
}

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled])'

export function DropdownMenu({ trigger, items, align = 'start', ariaLabel }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus()

    function close() {
      setOpen(false)
      triggerRef.current?.focus()
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const entries = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])
    if (entries.length === 0) return

    const index = entries.indexOf(document.activeElement as HTMLElement)
    let nextIndex: number | undefined
    if (event.key === 'ArrowDown') {
      nextIndex = index < 0 ? 0 : (index + 1) % entries.length
    } else if (event.key === 'ArrowUp') {
      nextIndex = index <= 0 ? entries.length - 1 : index - 1
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = entries.length - 1
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (nextIndex === undefined) return

    event.preventDefault()
    entries[nextIndex]?.focus()
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setOpen(true)
  }

  function select(item: DropdownMenuItem) {
    setOpen(false)
    triggerRef.current?.focus()
    item.onSelect()
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center justify-center gap-tight rounded-lg border border-border bg-surface-card px-3 py-2 text-compact font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute z-40 mt-1 min-w-56 rounded-lg border border-border-subtle bg-surface-raised p-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => select(item)}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-compact text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
