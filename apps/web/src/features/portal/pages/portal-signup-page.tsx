import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Button } from '#/components/ui/button'
import { Card, CardBody } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { PasswordInput } from '#/components/ui/password-input'
import { Select } from '#/components/ui/select'
import { FieldLabel } from '#/components/ui/textarea'
import { usePublicInstitutions } from '#/features/portal/api'
import { PortalAuthContext } from '#/features/portal/components/portal-auth-context'
import { apiClient } from '#/lib/api-client'
import { signIn } from '#/lib/auth-client'

export function PortalSignupPage() {
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
      window.location.assign(
        result.verificationStatus === 'VERIFIED' ? '/portal/dashboard' : '/portal/verification',
      )
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Account could not be created')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
        <PortalAuthContext
          idPrefix="portal-signup"
          eyebrow="Public complaint portal"
          title="Start with one account for every update."
          description="Create your complainant account, verify your institution, and keep the whole conversation in one place."
          steps={[
            {
              title: 'Create account',
              description: 'Use the email address tied to your complaint.',
            },
            {
              title: 'Verify institution',
              description: 'Match the AICTE ID or upload supporting proof.',
            },
            {
              title: 'File and follow',
              description: 'Submit once, then track public replies and the outcome.',
            },
          ]}
        />
        <div className="space-y-4">
          <PageHeader
            title="Create a complainant account"
            description="Use the email address you want associated with the complaint. Verification is required before filing."
          />
          <Card>
            <CardBody className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <PasswordInput
                      id="signup-password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="signup-confirm">Confirm password</FieldLabel>
                    <PasswordInput
                      id="signup-confirm"
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
                      Search by institution name or AICTE ID. An exact AICTE ID match verifies your
                      account immediately.
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

                {error && <p className="text-sm text-danger">{error}</p>}
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
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
