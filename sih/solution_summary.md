# Summary
CaseSync is a unified dashboard for monitoring and tracking institution-related complaint cases across AICTE Bureaus/Cells (for example PGRC, RB, and others).

# Problem
AICTE receives institution-related complaints through different Bureaus/Cells independently. This leads to:
  - No consolidated view of an institution's complaint history
  - Unclear ownership (which bureau/cell/officer is handling what)
  - Overlapping or duplicate work across bureaus
  - Delayed disposal and poor coordination
  - Difficulty tracking timelines and SLAs

# Solution Goal
Our solution creates a single source of truth to centralize, track, and coordinate institution-related complaints:
  - Institution-centric view — every complaint links to an institution; see full history across all bureaus
  - Case lifecycle and ownership — status, assignments, transfers, actions, audit
  - Cross-bureau overlap detection — same institution across bureaus; rules first, Jev classification and advisory
  - Alerts and notifications — overlap review, deadlines/SLA, escalations
  - Search, filters, reports — institution, AICTE Permanent ID, case ID, bureau, region, category, status, date range
  - Auditability — append-only action history; AI assessments separate from human decisions

# Prototype
A single-window dashboard for authorized AICTE officials to:
  - View institution-related cases across Bureaus/Cells
  - See the current bureau/officer and full case movement
  - Identify same-institution cross-bureau overlaps
  - Coordinate via a human-reviewed queue
  - Monitor pending, disposed, under-process, transferred, escalated, and overdue cases
  - Generate institution/region/bureau/status reports
  - Receive overlap, escalation, pending, and SLA alerts
