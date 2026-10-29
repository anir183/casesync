import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import { FieldLabel, Textarea } from '#/components/ui/textarea'
import { usePortalProfile, usePublicCategories, useSubmitComplaint } from '../api'

export function PortalComplaintNewPage() {
  const navigate = useNavigate()
  const profile = usePortalProfile()
  const categories = usePublicCategories()
  const submit = useSubmitComplaint()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [desiredResolution, setDesiredResolution] = useState('')
  const [contactPreference, setContactPreference] = useState('EMAIL')
  const [consentGiven, setConsentGiven] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profile.isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>
  if (profile.data && profile.data.verificationStatus !== 'VERIFIED') {
    return (
      <div className="mx-auto max-w-2xl space-y-3 rounded-lg border border-border bg-background p-6">
        <h1 className="text-xl font-semibold">Verification required</h1>
        <p className="text-sm text-muted-foreground">
          Your institution must be verified before you can file a complaint.
        </p>
        <Link to="/portal/verification" className="text-sm underline underline-offset-4">
          Continue verification
        </Link>
      </div>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!profile.data?.institutionId) {
      setError('Your account does not have a verified institution. Update verification first.')
      return
    }
    if (!consentGiven) {
      setError('Confirm that the information is accurate and may be shared for review.')
      return
    }
    try {
      const result = await submit.mutateAsync({
        institutionId: profile.data.institutionId,
        category: category || undefined,
        subject: subject.trim(),
        description: description.trim(),
        incidentDate: incidentDate || undefined,
        desiredResolution: desiredResolution.trim() || undefined,
        contactPreference,
        consentGiven,
      })
      navigate(`/portal/complaints/${result.id}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Complaint could not be filed.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">File a complaint</h1>
        <p className="text-sm text-muted-foreground">
          Institution: {profile.data?.institutionName} · {profile.data?.email}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Complaint details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <FieldLabel htmlFor="complaint-subject">Subject</FieldLabel>
              <Input
                id="complaint-subject"
                required
                maxLength={200}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="complaint-category">Category</FieldLabel>
                <Select
                  id="complaint-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">Select a category (optional)</option>
                  {categories.data?.map((item) => (
                    <option key={item.id} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="complaint-date">Incident date</FieldLabel>
                <Input
                  id="complaint-date"
                  type="date"
                  value={incidentDate}
                  onChange={(event) => setIncidentDate(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="complaint-description">What happened?</FieldLabel>
              <Textarea
                id="complaint-description"
                rows={8}
                required
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Include dates, people involved (roles are enough), and any steps already taken.
              </p>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="complaint-outcome">Desired resolution</FieldLabel>
              <Textarea
                id="complaint-outcome"
                rows={3}
                maxLength={2000}
                value={desiredResolution}
                onChange={(event) => setDesiredResolution(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="complaint-contact">Preferred contact method</FieldLabel>
              <Select
                id="complaint-contact"
                value={contactPreference}
                onChange={(event) => setContactPreference(event.target.value)}
              >
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
                <option value="PORTAL">Portal messages</option>
              </Select>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentGiven}
                onChange={(event) => setConsentGiven(event.target.checked)}
              />
              <span>
                I confirm the information is accurate and consent to it being shared with the review
                team for handling this complaint.
              </span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Filing...' : 'File complaint'}
              </Button>
              <Link
                to="/portal/dashboard"
                className="self-center text-sm underline underline-offset-4"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
