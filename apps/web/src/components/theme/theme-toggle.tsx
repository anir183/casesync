import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '#/lib/utils'
import { type Theme, useTheme } from './theme-provider'

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'System theme', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-card p-0.5',
        className,
      )}
    >
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </fieldset>
  )
}
