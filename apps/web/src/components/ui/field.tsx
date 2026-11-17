import { cloneElement, useId } from 'react'
import type { ReactElement } from 'react'

export interface FieldProps {
  label: string
  htmlFor: string
  help?: string
  error?: string
  required?: boolean
  children: ReactElement
}

export function Field({ label, htmlFor, help, error, required, children }: FieldProps) {
  const generatedId = useId()
  const helpId = `${generatedId}-help`
  const errorId = `${generatedId}-error`
  const existingDescribedBy = (children.props as { 'aria-describedby'?: unknown })[
    'aria-describedby'
  ]
  const describedBy = [
    typeof existingDescribedBy === 'string' ? existingDescribedBy : null,
    help ? helpId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-tight">
      <label htmlFor={htmlFor} className="text-compact font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-danger">
            *
          </span>
        ) : null}
      </label>
      {cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {help ? (
        <p id={helpId} className="text-meta text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-meta text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
