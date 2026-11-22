import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  FileText,
  MessageCircle,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { buttonVariants } from '#/components/ui/button'
import type { ComplaintDetail } from '#/features/portal/api'
import { ComplaintStatusBadge } from '#/features/portal/components/complaint-status-badge'
import { TrackComplaintForm } from '#/features/portal/components/track-complaint-form'
import { useSession } from '#/lib/auth-client'
import { throwIfForcedRouteError } from '#/lib/route-error-probe'

const STEP_ICONS = [BadgeCheck, FileText, MessageCircle]

const STEPS = [
  {
    title: 'Verify',
    description: 'Link your account to your institution with its AICTE ID or supporting documents.',
  },
  {
    title: 'File',
    description: 'Describe the issue, choose the outcome you want, and add public evidence.',
  },
  {
    title: 'Follow',
    description: 'Read public updates, reply to the review team, and respond to the resolution.',
  },
]

function FaqRow({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group border-b border-border last:border-b-0 open:bg-muted/30">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-none group-open:rotate-180"
        />
      </summary>
      <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  )
}

/** Presentational landing content, exported for focused component coverage. */
export function PortalLandingContent({ isComplainant }: { isComplainant: boolean }) {
  const [tracked, setTracked] = useState<ComplaintDetail | null>(null)

  return (
    <div className="space-y-8 md:space-y-10">
      <section
        aria-labelledby="portal-hero-title"
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-card sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            AICTE public complaints
          </p>
          <h1
            id="portal-hero-title"
            className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Raise a concern. Follow it to resolution.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Create a verified account, file your complaint, and see every public update in one
            place.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to={isComplainant ? '/portal/dashboard' : '/portal/signup'}
              className={buttonVariants({ size: 'lg' })}
            >
              {isComplainant ? 'Go to my complaints' : 'File a complaint'}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <a
              href="#track-complaint"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              Track a complaint
            </a>
            {isComplainant ? null : (
              <Link to="/portal/login" className="px-1 text-sm underline underline-offset-4">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      <section
        id="track-complaint"
        aria-labelledby="inline-track-title"
        className="scroll-mt-20 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="inline-track-title" className="text-lg font-semibold tracking-tight">
              Track a complaint
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your complaint number and filing email. No account needed.
            </p>
          </div>
          <Link to="/portal/track" className="text-sm font-medium underline underline-offset-4">
            Open full tracker
          </Link>
        </div>
        <TrackComplaintForm idPrefix="landing-track" inline onTracked={setTracked} />
        {tracked ? (
          <output className="mt-4 block rounded-lg border border-success/30 bg-success-soft/50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {tracked.caseNumber} · {tracked.subject ?? 'Complaint'}
              </p>
              <ComplaintStatusBadge status={tracked.status} label={tracked.statusLabel} />
            </div>
            <p className="mt-1 text-muted-foreground">
              Public updates are available in the full tracker.
            </p>
          </output>
        ) : null}
      </section>

      <section aria-labelledby="portal-steps-title" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="portal-steps-title" className="text-xl font-semibold tracking-tight">
            Three steps, start to finish
          </h2>
          <p className="text-xs text-muted-foreground">For your AICTE institution</p>
        </div>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? FileText
            return (
              <li
                key={step.title}
                className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {index + 1}. {step.title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section
        aria-label="Privacy and safety"
        className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:gap-5"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck aria-hidden className="h-5 w-5" />
        </span>
        <div className="space-y-1 text-sm">
          <h2 className="font-semibold">Privacy comes first</h2>
          <p className="leading-relaxed text-muted-foreground">
            Only public messages and documents are shown. Internal notes, staff identities, and
            assessment data stay private. Tracking requires both the complaint number and the filing
            email.
          </p>
        </div>
      </section>

      <section aria-labelledby="portal-faq-title" className="space-y-3">
        <div className="flex items-center gap-2">
          <SearchCheck aria-hidden className="h-4 w-4 text-primary" />
          <h2 id="portal-faq-title" className="text-xl font-semibold tracking-tight">
            Good to know
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <FaqRow question="What happens after I file?">
            The case team acknowledges your complaint, reviews it with the institution, and records
            a public resolution. You can reply and add documents while the conversation is open.
          </FaqRow>
          <FaqRow question="How do I know if I’m verified?">
            Your dashboard shows your current verification status and the exact next step. An exact
            AICTE permanent ID match verifies you immediately; otherwise an administrator reviews
            your documents.
          </FaqRow>
          <FaqRow question="Can I track without an account?">
            Yes. Use the form above with the complaint number and the email address used to file it.
            Public tracking shows status updates and public messages only.
          </FaqRow>
        </div>
      </section>
    </div>
  )
}

export function PortalLandingPage() {
  const [searchParams] = useSearchParams()
  throwIfForcedRouteError(searchParams)
  const { data: session } = useSession()
  const isComplainant = (session?.user as { role?: string } | undefined)?.role === 'COMPLAINANT'

  return <PortalLandingContent isComplainant={isComplainant} />
}
