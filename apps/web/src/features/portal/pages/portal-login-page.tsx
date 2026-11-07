import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Button } from '#/components/ui/button'
import { Card, CardBody } from '#/components/ui/card'
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
      const representativeStatus = (
        result.data?.user as { representativeStatus?: string } | undefined
      )?.representativeStatus
      if (role === 'INSTITUTION_REPRESENTATIVE') {
        window.location.assign(
          representativeStatus === 'APPROVED' ? '/institution/dashboard' : '/institution/profile',
        )
        return
      }
      window.location.assign(role === 'COMPLAINANT' ? '/portal/dashboard' : '/dashboard')
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader
        title="Complainant sign in"
        description="Access your complaints and verification status."
      />
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            {error && <p className="text-sm text-danger">{error}</p>}
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
        </CardBody>
      </Card>
    </div>
  )
}
