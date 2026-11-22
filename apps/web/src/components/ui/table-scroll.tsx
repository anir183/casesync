import { type HTMLAttributes, useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/utils'

export function TableScroll({
  label,
  className,
  children,
  hint,
  ...props
}: HTMLAttributes<HTMLElement> & { label: string; hint?: string }) {
  const regionRef = useRef<HTMLElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const region = regionRef.current
    if (!region) return

    const update = () => setOverflows(region.scrollWidth > region.clientWidth + 1)
    update()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update)
      observer.observe(region)
      const child = region.firstElementChild
      if (child) observer.observe(child)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <>
      <section
        ref={regionRef}
        aria-label={label}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard focusable
        tabIndex={0}
        className={cn(
          'overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
        {...props}
      >
        {children}
      </section>
      {hint && overflows ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  )
}
