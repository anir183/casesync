import { Link } from 'react-router-dom'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useSession } from '#/lib/auth-client'

export function PortalLandingPage() {
  const { data: session } = useSession()
  const isComplainant = (session?.user as { role?: string } | undefined)?.role === 'COMPLAINANT'

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-background p-6 md:p-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            AICTE public complaints
          </p>
          <h1 className="text-3xl font-semibold md:text-4xl">
            Raise a concern about your institution and follow every update.
          </h1>
          <p className="text-base text-muted-foreground">
            Create a verified account, file a complaint against your AICTE institution, exchange
            messages with the review team, and track the outcome from submission to closure.
          </p>
          <div className="flex flex-wrap gap-2">
            {isComplainant ? (
              <Link to="/portal/dashboard" className={buttonVariants()}>
                Go to my complaints
              </Link>
            ) : (
              <>
                <Link to="/portal/signup" className={buttonVariants()}>
                  Create a complainant account
                </Link>
                <Link to="/portal/login" className={buttonVariants({ variant: 'outline' })}>
                  Sign in
                </Link>
              </>
            )}
            <Link to="/portal/track" className={buttonVariants({ variant: 'outline' })}>
              Track without signing in
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Verify your institution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Enter your institution's AICTE permanent ID for automatic verification. If it cannot be
            matched, upload supporting documents for administrator review.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. File and track</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Submit the complaint with the incident date, desired outcome, and supporting documents.
            Follow the public status and conversation in your portal.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Resolve or reopen</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Review the published resolution. Accept it to close the complaint, or reopen it within
            the allowed window if the issue is unresolved.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacy and safety</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Internal notes, staff identities, assessment data, and internal-only documents are never
            shown on the public portal. Only messages and documents marked public are visible to you
            and in authenticated tracking.
          </p>
          <p>
            Public tracking requires the complaint number and the email address used to file it.
            This prevents other people from opening your complaint by guessing a number.
          </p>
          <p>
            If you are a staff member, use the{' '}
            <Link to="/login" className="underline">
              staff sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
