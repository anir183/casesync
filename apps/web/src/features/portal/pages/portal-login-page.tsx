import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FieldLabel } from '#/components/ui/textarea'
import { signIn } from '#/lib/auth-client'

export function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError('Email or password is incorrect.')
        return
      }
      const role = (result.data?.user as { role?: string } | undefined)?.role
      window.location.assign(role === 'COMPLAINANT' ? '/portal/dashboard' : '/dashboard')
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Complainant sign in</h1>
        <p className="text-sm text-muted-foreground">
          Access your complaints and verification status.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-background p-6"
      >
        <div className="space-y-1">
          <FieldLabel htmlFor="portal-email">Email</FieldLabel>
          <Input
            id="portal-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel htmlFor="portal-password">Password</FieldLabel>
          <Input
            id="portal-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/portal/signup" className="underline">
            Create an account
          </Link>
          . Forgot your password? Contact support through the AICTE office.
        </p>
      </form>
    </div>
  )
}
