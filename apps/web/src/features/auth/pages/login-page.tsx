import { useState } from 'react'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { signIn } from '#/lib/auth-client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await signIn.email({ email, password })
      if (res.error) {
        setError(res.error.message || 'Login failed')
        return
      }
      const role = (res.data?.user as { role?: string } | undefined)?.role
      window.location.assign(role === 'COMPLAINANT' ? '/portal/dashboard' : '/')
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.14),transparent_34rem),radial-gradient(circle_at_85%_90%,hsl(var(--accent)/0.14),transparent_30rem)]"
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <Card className="relative z-0 w-full max-w-sm shadow-card">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Staff console
          </p>
          <CardTitle className="text-2xl">CaseSync</CardTitle>
          <CardDescription>Sign in to the complaint coordination console.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-danger-soft-foreground">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Filing a complaint?{' '}
            <a href="/portal" className="font-medium text-primary underline underline-offset-4">
              Use the public portal
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
