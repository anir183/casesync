import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '#/lib/utils'

interface NavDropdownProps {
  /** Accessible name for the trigger when the visible label is an icon. */
  ariaLabel: string
  label: React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
  showChevron?: boolean
  triggerClassName?: string
  panelClassName?: string
  panelLabel?: string
}

/**
 * Small disclosure menu for the top bar. It intentionally does not implement
 * menu/menuitem roles: the panel contains ordinary links, so native link
 * semantics and keyboard behaviour are the correct contract.
 */
export function NavDropdown({
  ariaLabel,
  label,
  children,
  align = 'left',
  showChevron = false,
  triggerClassName,
  panelClassName,
  panelLabel,
}: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const location = useLocation()

  // Route changes should never leave a menu floating over the next page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu when the route changes
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
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

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open
            ? 'bg-muted font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          triggerClassName,
        )}
      >
        {label}
        {showChevron && <ChevronDown aria-hidden className="h-4 w-4" />}
      </button>
      {open && (
        <div
          id={panelId}
          aria-label={panelLabel ?? ariaLabel}
          className={cn(
            'absolute z-50 mt-2 min-w-56 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-elevated',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
