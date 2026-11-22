// Presentational admin hub. Each link carries a live signal; the query wrapper
// supplies the values so this component stays easy to test in isolation.

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

export interface AdminHubLink {
  label: string
  to: string
  value: string | number
  hint?: string
}

export interface AdminHubGroup {
  title: string
  description?: string
  links: AdminHubLink[]
}

export function AdminHub({ groups }: { groups: AdminHubGroup[] }) {
  return (
    <div className="grid gap-control lg:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-subhead">{group.title}</CardTitle>
            {group.description ? (
              <p className="text-compact text-muted-foreground">{group.description}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-tight">
            {group.links.map((link) => (
              <Link
                key={`${group.title}-${link.label}`}
                to={link.to}
                className="flex flex-wrap items-center justify-between gap-tight rounded-lg border border-border-subtle p-control transition-colors duration-fast ease-out hover:bg-muted/40"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-compact font-medium text-foreground">
                    {link.label}
                  </span>
                  {link.hint ? (
                    <span className="block text-meta text-muted-foreground">{link.hint}</span>
                  ) : null}
                </span>
                <span className="text-title font-semibold tabular-nums text-foreground">
                  {link.value}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
