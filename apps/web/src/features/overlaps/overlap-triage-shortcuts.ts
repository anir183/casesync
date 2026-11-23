import { useEffect } from 'react'

export interface OverlapTriageShortcutOptions {
  itemCount: number
  activeIndex: number
  canDecide: boolean
  dialogOpen: boolean
  onActiveChange: (index: number) => void
  onActiveScroll?: (index: number) => void
  onConfirm: () => void
  onDismiss: () => void
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useOverlapTriageShortcuts({
  itemCount,
  activeIndex,
  canDecide,
  dialogOpen,
  onActiveChange,
  onActiveScroll,
  onConfirm,
  onDismiss,
}: OverlapTriageShortcutOptions) {
  useEffect(() => {
    if (itemCount === 0) return

    function moveActive(index: number) {
      onActiveChange(index)
      onActiveScroll?.(index)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target
      if (target instanceof HTMLElement) {
        if (target.isContentEditable || TYPING_TAGS.has(target.tagName)) return
      }
      if (dialogOpen || document.querySelector('dialog[open]')) return

      const key = event.key.toLowerCase()
      if (key === 'arrowdown' || key === 'j') {
        event.preventDefault()
        moveActive((activeIndex + 1) % itemCount)
        return
      }
      if (key === 'arrowup' || key === 'k') {
        event.preventDefault()
        moveActive((activeIndex - 1 + itemCount) % itemCount)
        return
      }
      if (!canDecide) return
      if (key === 'c') {
        event.preventDefault()
        onConfirm()
      } else if (key === 'd') {
        event.preventDefault()
        onDismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeIndex,
    canDecide,
    dialogOpen,
    itemCount,
    onActiveChange,
    onActiveScroll,
    onConfirm,
    onDismiss,
  ])
}
