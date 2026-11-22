import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  ariaLabel: string
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Popover({ trigger, children, ariaLabel }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    if (first) first.focus()
    else panel?.focus()

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

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center justify-center gap-tight rounded-lg border border-border bg-surface-card px-3 py-2 text-compact font-medium text-foreground transition-colors duration-fast ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {trigger}
      </button>
      {open ? (
        <dialog
          ref={panelRef}
          id={panelId}
          open
          aria-label={ariaLabel}
          tabIndex={-1}
          className="absolute left-0 top-full z-40 m-0 mt-2 w-auto min-w-56 right-auto rounded-lg border border-border-subtle bg-surface-raised p-control text-compact text-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {children}
        </dialog>
      ) : null}
    </div>
  )
}
