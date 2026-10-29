import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel } from '#/components/ui/textarea'
import { apiClient } from '#/lib/api-client'
import { signIn } from '#/lib/auth-client'
import { usePublicInstitutions } from '../api'

export function PortalSignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [aictePermanentId, setAictePermanentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { data: institutions, isFetching } = usePublicInstitutions(institutionQuery)

  function selectInstitution(id: string) {
    setInstitutionId(id)
    const selected = institutions?.find((item) => item.id === id)
    if (selected?.aictePermanentId) setAictePermanentId(selected.aictePermanentId)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await apiClient.post<{ verificationStatus: string }>(
        '/public/complainant/sign-up',
        {
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          institutionId: institutionId || undefined,
          aictePermanentId: aictePermanentId.trim() || undefined,
        },
      )
      const login = await signIn.email({ email: email.trim(), password })
      if (login.error) {
        setError('Account created, but sign in failed. Please sign in manually.')
        return
      }
      navigate(
        result.verificationStatus === 'VERIFIED' ? '/portal/dashboard' : '/portal/verification',
      )
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Account could not be created')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Create a complainant account</h1>
        <p className="text-sm text-muted-foreground">
          Use the email address you want associated with the complaint. Verification is required
          before filing.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-border bg-background p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
            <Input
              id="signup-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-phone">Phone (optional)</FieldLabel>
            <Input
              id="signup-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-confirm">Confirm password</FieldLabel>
            <Input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border p-4">
          <div>
            <p className="text-sm font-medium">Verify your institution</p>
            <p className="text-xs text-muted-foreground">
              Search by institution name or AICTE ID. An exact AICTE ID match verifies your account
              immediately.
            </p>
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-institution-search">Institution</FieldLabel>
            <Input
              id="signup-institution-search"
              placeholder="Start typing an institution name or AICTE ID"
              value={institutionQuery}
              onChange={(event) => {
                setInstitutionQuery(event.target.value)
                setInstitutionId('')
              }}
            />
          </div>
          {institutionQuery.trim().length >= 2 && (
            <Select
              aria-label="Matching institutions"
              value={institutionId}
              onChange={(event) => selectInstitution(event.target.value)}
            >
              <option value="">
                {isFetching ? 'Searching...' : 'Select an institution (optional)'}
              </option>
              {institutions?.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                  {institution.aictePermanentId ? ` · ${institution.aictePermanentId}` : ''}
                </option>
              ))}
            </Select>
          )}
          <div className="space-y-1">
            <FieldLabel htmlFor="signup-aicte">AICTE permanent ID (optional)</FieldLabel>
            <Input
              id="signup-aicte"
              placeholder="e.g. AICTE-1-999999"
              value={aictePermanentId}
              onChange={(event) => setAictePermanentId(event.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Already registered?{' '}
          <Link to="/portal/login" className="underline">
            Sign in
          </Link>
          .
        </p>
      </form>
    </div>
  )
}
