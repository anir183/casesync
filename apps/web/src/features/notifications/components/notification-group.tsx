import { Link } from 'react-router-dom'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import type { NotificationGroup } from '#/features/notifications/groups'
import { notificationHref, notificationTypeLabel } from '#/features/notifications/links'
import { cn, formatDate } from '#/lib/utils'

export interface NotificationGroupCardProps {
  group: NotificationGroup
  isMarkingRead: boolean
  onMarkRead: (id: string) => void
}

export function NotificationGroupCard({
  group,
  isMarkingRead,
  onMarkRead,
}: NotificationGroupCardProps) {
  return (
    <section aria-label={`${group.label} notifications`} className="scroll-mt-32">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-5 py-2">
          <h2 className="text-meta font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h2>
          <Badge variant="muted">{group.items.length}</Badge>
        </div>
        <ul className="divide-y divide-border">
          {group.items.map((item) => {
            const link = notificationHref(item)
            const unread = !item.readAt
            return (
              <li
                key={item.id}
                className={cn(
                  'group px-5 py-4 transition-colors hover:bg-muted/40',
                  unread && 'bg-primary/[0.04]',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      unread ? 'bg-primary' : 'bg-transparent',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'text-sm',
                            unread ? 'font-semibold text-foreground' : 'font-medium',
                          )}
                        >
                          {item.title ?? 'Notification'}
                        </p>
                        <Badge variant="muted">{notificationTypeLabel(item.type)}</Badge>
                        {unread ? <Badge variant="warning">Unread</Badge> : null}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </time>
                    </div>
                    {item.message ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {item.message}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 pt-0.5 text-sm">
                      {link ? (
                        <Link to={link} className="underline underline-offset-4">
                          Open record
                        </Link>
                      ) : null}
                      {unread ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={isMarkingRead}
                          onClick={() => onMarkRead(item.id)}
                        >
                          Mark as read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}
