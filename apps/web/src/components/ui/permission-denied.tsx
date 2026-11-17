export interface PermissionDeniedProps {
  title?: string
  description?: string
}

export function PermissionDenied({
  title = 'Permission denied',
  description = 'You do not have access to this resource.',
}: PermissionDeniedProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-tight rounded-lg border border-border-subtle bg-surface-sunken px-6 py-8 text-center"
    >
      <p className="text-subhead font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-md text-compact text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
