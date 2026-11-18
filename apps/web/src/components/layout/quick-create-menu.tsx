import { ROLE_GROUPS, hasAnyRole } from '@casesync/config'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DropdownMenu } from '#/components/ui/dropdown-menu'

interface QuickCreateMenuProps {
  role?: string
}

/** Create actions are derived from the same role groups the server enforces. */
export function QuickCreateMenu({ role }: QuickCreateMenuProps) {
  const navigate = useNavigate()
  const canCreateCase = hasAnyRole(role, ROLE_GROUPS.CASE_WRITE)
  const canCreateInstitution = hasAnyRole(role, ROLE_GROUPS.INSTITUTION_WRITE)

  if (!canCreateCase && !canCreateInstitution) return null

  const items = [
    ...(canCreateCase ? [{ label: 'New case', onSelect: () => navigate('/cases/new') }] : []),
    ...(canCreateInstitution
      ? [{ label: 'New institution', onSelect: () => navigate('/institutions/new') }]
      : []),
  ]

  return (
    <DropdownMenu
      ariaLabel="Quick create"
      align="end"
      trigger={
        <>
          <Plus aria-hidden className="h-4 w-4" />
          Create
        </>
      }
      items={items}
    />
  )
}
