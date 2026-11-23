import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

export function PasswordInput({
  className,
  disabled,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  const toggleLabel = visible ? 'Hide password' : 'Show password'
  const VisibleIcon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        aria-label={toggleLabel}
        aria-controls={props.id}
        title={toggleLabel}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-fast ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        <VisibleIcon aria-hidden className="h-4 w-4" />
      </button>
    </div>
  )
}
