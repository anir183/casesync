import { BadgeCheck, FileText, MessageCircle } from 'lucide-react'

const STEP_ICONS = [BadgeCheck, FileText, MessageCircle]

/**
 * Quiet brand/context panel for public auth screens. It is decorative context
 * only: it never exposes staff navigation or internal data.
 */
export function PortalAuthContext({
  idPrefix,
  eyebrow,
  title,
  description,
  steps,
}: {
  idPrefix: string
  eyebrow: string
  title: string
  description: string
  steps: Array<{ title: string; description: string }>
}) {
  return (
    <aside
      aria-labelledby={`${idPrefix}-context-title`}
      className="hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-card lg:block"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2
        id={`${idPrefix}-context-title`}
        className="mt-3 text-balance text-2xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[index] ?? FileText
          return (
            <li key={step.title} className="flex gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
        Public portal only. Staff navigation and internal records are never shown here.
      </p>
    </aside>
  )
}
