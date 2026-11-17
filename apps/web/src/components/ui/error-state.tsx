import { Button } from '#/components/ui/button'

export interface ErrorStateProps {
  title: string
  description?: string
  retry?: {
    label?: string
    onClick: () => void
  }
}

export function ErrorState({ title, description, retry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-tight rounded-lg border border-danger/25 bg-danger-soft px-6 py-8 text-center"
    >
      <p className="text-subhead font-semibold text-danger-soft-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-compact text-muted-foreground">{description}</p>
      ) : null}
      {retry ? (
        <Button variant="outline" size="sm" onClick={retry.onClick} className="mt-2">
          {retry.label ?? 'Try again'}
        </Button>
      ) : null}
    </div>
  )
}
