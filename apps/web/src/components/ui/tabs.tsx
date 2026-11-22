import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '#/lib/utils'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  ariaLabel?: string
}

export function Tabs({ items, value, defaultValue, onValueChange, ariaLabel }: TabsProps) {
  const generatedId = useId()
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items.find((item) => !item.disabled)?.id ?? '',
  )
  const selectedId = value ?? internalValue
  const enabledItems = items.filter((item) => !item.disabled)
  const activeId = enabledItems.some((item) => item.id === selectedId)
    ? selectedId
    : enabledItems[0]?.id
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function select(id: string) {
    if (value === undefined) setInternalValue(id)
    onValueChange?.(id)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (enabledItems.length === 0) return

    let targetIndex: number | undefined
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const currentId = items[index]?.id
      const position = enabledItems.findIndex((item) => item.id === currentId)
      const delta = event.key === 'ArrowRight' ? 1 : -1
      targetIndex =
        ((position < 0 ? 0 : position) + delta + enabledItems.length) % enabledItems.length
    } else if (event.key === 'Home') {
      targetIndex = 0
    } else if (event.key === 'End') {
      targetIndex = enabledItems.length - 1
    }
    if (targetIndex === undefined) return

    event.preventDefault()
    const target = enabledItems[targetIndex]
    if (!target) return
    select(target.id)
    tabRefs.current[target.id]?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-tight border-b border-border-subtle"
      >
        {items.map((item, index) => {
          const tabId = `${generatedId}-tab-${item.id}`
          const panelId = `${generatedId}-panel-${item.id}`
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node
              }}
              type="button"
              role="tab"
              id={tabId}
              aria-controls={panelId}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                '-mb-px border-b-2 border-transparent px-3 py-2 text-compact font-medium text-muted-foreground transition-colors duration-fast ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
                isActive && 'border-primary text-foreground',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${generatedId}-panel-${item.id}`}
          aria-labelledby={`${generatedId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          className="pt-section"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
