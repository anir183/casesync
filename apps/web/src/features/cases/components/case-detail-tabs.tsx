import type { ReactNode } from 'react'
import { Tabs } from '#/components/ui/tabs'

export type CaseDetailTab = 'overview' | 'conversation' | 'documents' | 'timeline' | 'related'

export const CASE_DETAIL_TABS: Array<{ id: CaseDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'related', label: 'Related' },
]

export function CaseDetailTabs({
  value,
  onValueChange,
  content,
}: {
  value: CaseDetailTab
  onValueChange: (tab: CaseDetailTab) => void
  content: Record<CaseDetailTab, ReactNode>
}) {
  return (
    <Tabs
      ariaLabel="Case sections"
      value={value}
      onValueChange={(id) => onValueChange(id as CaseDetailTab)}
      items={CASE_DETAIL_TABS.map((entry) => ({
        id: entry.id,
        label: entry.label,
        content: content[entry.id],
      }))}
    />
  )
}
