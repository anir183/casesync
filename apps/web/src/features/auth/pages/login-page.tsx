import { useState } from 'react'
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 border border-border rounded-lg p-6"
      >
        <div>
          <h1 className="text-xl font-semibold">CaseSync</h1>
          <p className="text-sm text-muted-foreground">Sign in</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 bg-background"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 bg-background"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border border-border rounded-md px-3 py-2 hover:bg-muted"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
