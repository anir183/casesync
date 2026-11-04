import { useEffect, useRef } from 'react'

/**
 * Moves keyboard focus to the new page heading after client-side navigation.
 * The first render is skipped so the initial page load keeps normal focus, and
 * focus only follows navigation the user started (link, button, form submit).
 */
export function useRouteFocus(pathname: string) {
  const mainRef = useRef<HTMLElement>(null)
  const initialRender = useRef(true)
  const interacted = useRef(false)

  // Focus should follow deliberate navigation, not the initial load or the
  // guard's first redirect, so the skip link stays the first tab stop.
  useEffect(() => {
    const markInteracted = () => {
      interacted.current = true
    }
    window.addEventListener('pointerdown', markInteracted, true)
    window.addEventListener('keydown', markInteracted, true)
    return () => {
      window.removeEventListener('pointerdown', markInteracted, true)
      window.removeEventListener('keydown', markInteracted, true)
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus must follow route changes
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    if (!interacted.current) return

    let frame = 0
    let attempts = 0
    // React Router keeps the previous page mounted while a lazy route loads.
    // Wait for a heading that is actually laid out instead of focusing the
    // outgoing page's heading.
    const focusPage = () => {
      const heading = Array.from(mainRef.current?.querySelectorAll('h1') ?? []).find(
        (candidate) => candidate.getClientRects().length > 0,
      )
      if (heading) {
        heading.setAttribute('tabindex', '-1')
        heading.focus()
        return
      }
      if (attempts < 120) {
        attempts += 1
        frame = requestAnimationFrame(focusPage)
        return
      }
      mainRef.current?.focus()
    }

    frame = requestAnimationFrame(focusPage)
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return mainRef
}
