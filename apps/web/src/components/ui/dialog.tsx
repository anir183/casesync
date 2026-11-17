import { useCallback, useEffect, useId, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { cn } from '#/lib/utils'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  overlayClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  overlayClassName,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const closeRequested = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleId = useId()
  const descriptionId = useId()

  const requestClose = useCallback(() => {
    if (closeRequested.current) return
    closeRequested.current = true
    onCloseRef.current()
  }, [])

  useEffect(() => {
    if (!open) return
    closeRequested.current = false
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const dialog = dialogRef.current
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal()
    else if (dialog) dialog.setAttribute('open', '')
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (dialog?.open && typeof dialog.close === 'function') dialog.close()
      if (previousFocus.current?.isConnected) previousFocus.current.focus()
    }
  }, [open, requestClose])

  if (!open) return null

  function handleBackdropClick(event: ReactMouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) requestClose()
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        overlayClassName,
      )}
    >
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={handleBackdropClick}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          requestClose()
        }}
        onCancel={(event) => {
          event.preventDefault()
          requestClose()
        }}
        className="m-0 w-full max-w-lg border-0 bg-transparent p-0 text-foreground shadow-none"
      >
        <div
          className={cn(
            'space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg',
            className,
          )}
        >
          <div className="space-y-tight">
            <h2 id={titleId} className="text-subhead font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-compact text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
          {footer ? <div className="flex justify-end gap-control pt-2">{footer}</div> : null}
        </div>
      </dialog>
    </div>
  )
}
