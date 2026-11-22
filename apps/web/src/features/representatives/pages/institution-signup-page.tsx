import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '#/components/shared/page-header'
import { Button } from '#/components/ui/button'
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { FormActions } from '#/components/ui/form-actions'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { usePublicInstitutions } from '#/features/portal/api'
import { signUpRepresentative, suggestInstitutionForEmail } from '#/features/representatives/api'
import { signIn } from '#/lib/auth-client'

export function InstitutionSignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [evidence, setEvidence] = useState('')
  const [suggestion, setSuggestion] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingDomain, setCheckingDomain] = useState(false)
  const { data: institutions, isFetching } = usePublicInstitutions(institutionQuery)

  async function checkEmailDomain() {
    const value = email.trim()
    if (!value.includes('@')) return
    setCheckingDomain(true)
    try {
      const result = await suggestInstitutionForEmail(value)
      if (!result.suggested || !result.institution) {
        setSuggestion(null)
        return
      }
      setSuggestion(result.institution)
      if (!institutionId) {
        setInstitutionId(result.institution.id)
        setInstitutionQuery(result.institution.name)
      }
    } catch {
      // A suggestion failing must never block manual institution selection.
      setSuggestion(null)
    } finally {
      setCheckingDomain(false)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!institutionId) {
      setError('Select the institution you represent.')
      return
    }
    setLoading(true)
    try {
      await signUpRepresentative({
        name: name.trim(),
        email: email.trim(),
        password,
        institutionId,
        evidence: evidence.trim() || undefined,
      })
      const login = await signIn.email({ email: email.trim(), password })
      if (login.error) {
        setError('Request submitted, but sign in failed. Please sign in manually.')
        return
      }
      window.location.assign('/institution/profile')
    } catch (signupError) {
      setError(
        signupError instanceof Error ? signupError.message : 'The request could not be submitted.',
      )
    } finally {
      setLoading(false)
    }
  }

  const passwordMismatchError =
    error === 'Passwords do not match.' ? 'Passwords do not match.' : undefined
  const institutionError =
    error === 'Select the institution you represent.'
      ? 'Select the institution you represent.'
      : undefined
  const formError = passwordMismatchError || institutionError ? null : error

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Request institution access"
        description="Representatives can read their institution's public complaint updates and reply with public evidence. An administrator reviews every request before access is granted."
      />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="representative-name">
                <Input
                  id="representative-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field label="Work email" htmlFor="representative-email">
                <Input
                  id="representative-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onBlur={() => void checkEmailDomain()}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Password" htmlFor="representative-password">
                <Input
                  id="representative-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field
                label="Confirm password"
                htmlFor="representative-confirm"
                error={passwordMismatchError}
              >
                <Input
                  id="representative-confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-3 rounded-md border border-border p-4">
              <div>
                <p className="text-sm font-medium">Institution</p>
                <p className="text-xs text-muted-foreground">
                  {checkingDomain
                    ? 'Checking the email domain against the allowlist...'
                    : 'Search by institution name. An email-domain match is only a suggestion and never grants access.'}
                </p>
              </div>
              {suggestion && (
                <p className="rounded-md bg-info-soft px-3 py-2 text-sm text-info-soft-foreground">
                  Matched from your email domain: <strong>{suggestion.name}</strong>. Confirm or
                  choose a different institution.
                </p>
              )}
              <Field
                label="Find institution"
                htmlFor="representative-institution-search"
                error={institutionError}
              >
                <Input
                  id="representative-institution-search"
                  placeholder="Start typing an institution name"
                  value={institutionQuery}
                  onChange={(event) => {
                    setInstitutionQuery(event.target.value)
                    setInstitutionId('')
                  }}
                />
              </Field>
              {institutionQuery.trim().length >= 2 && (
                <Select
                  aria-label="Matching institutions"
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                >
                  <option value="">{isFetching ? 'Searching...' : 'Select an institution'}</option>
                  {institutions?.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            <Field
              label="How can the administrator verify your role? (optional)"
              htmlFor="representative-evidence"
            >
              <Textarea
                id="representative-evidence"
                rows={3}
                maxLength={4000}
                placeholder="For example: your official email, employee ID, or a link to the institution directory."
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
              />
            </Field>

            {formError && <p className="text-sm text-danger">{formError}</p>}
            <FormActions>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting request...' : 'Submit request'}
              </Button>
            </FormActions>
            <p className="text-sm text-muted-foreground">
              Already approved?{' '}
              <Link to="/login" className="underline">
                Sign in
              </Link>
              . Complainants should use the{' '}
              <Link to="/portal/signup" className="underline">
                public portal
              </Link>
              .
            </p>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What representatives can see</CardTitle>
          <CardDescription>
            Only the public complaint record for your institution: the subject, description, public
            messages, and public documents. Internal notes, findings, staff identities, and
            assessment data stay hidden.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
