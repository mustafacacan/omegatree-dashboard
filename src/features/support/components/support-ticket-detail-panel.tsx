import type { ComponentType, ReactNode } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MessageCircleQuestion,
  Settings2,
  User,
  UserCheck,
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { SupportTicketAssigneeSelect } from '@/features/support/components/support-ticket-assignee-select'
import type {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketStatus,
  SupportTicketType,
} from '@/services/support-tickets.service'

type DetailPanelProps = {
  ticket: SupportTicket
  isClient: boolean
  isAdmin: boolean
  isBusy: boolean
  canEscalate: boolean
  availableStatuses: SupportTicketStatus[]
  statusLabel: Record<SupportTicketStatus, string>
  categoryLabel: Record<SupportTicketCategory, string>
  typeLabel: Record<SupportTicketType, string>
  statusVariant: Record<
    SupportTicketStatus,
    'primary' | 'warning' | 'info' | 'success' | 'default' | 'danger'
  >
  formatPersonName: (
    person?: { firstName?: string; lastName?: string } | null,
    fallback?: string,
  ) => string
  onStatusChange: (status: SupportTicketStatus) => void
  onAssign: (userId: number) => void
  onUnassign: () => void
  onRequestInfo: () => void
  onEscalate: () => void
  assignLoading: boolean
  updateLoading: boolean
}

function StatusBadge({
  status,
  statusLabel,
  statusVariant,
}: {
  status: SupportTicketStatus
  statusLabel: Record<SupportTicketStatus, string>
  statusVariant: DetailPanelProps['statusVariant']
}) {
  return (
    <Badge variant={statusVariant[status] ?? 'default'} size="sm">
      {statusLabel[status]}
    </Badge>
  )
}

function SectionBlock({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-surface-200 bg-white', className)}>
      <div className="flex items-center gap-2 border-b border-surface-100 px-4 py-3">
        <Icon className="h-4 w-4 text-primary-600" />
        <h4 className="text-sm font-semibold text-surface-800">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export function SupportTicketDetailPanel({
  ticket,
  isClient,
  isAdmin,
  isBusy,
  canEscalate,
  availableStatuses,
  statusLabel,
  categoryLabel,
  typeLabel,
  statusVariant,
  formatPersonName,
  onStatusChange,
  onAssign,
  onUnassign,
  onRequestInfo,
  onEscalate,
  assignLoading,
  updateLoading,
}: DetailPanelProps) {
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'
  const showActions = availableStatuses.length > 0 || isAdmin || canEscalate

  const quickStatuses = availableStatuses.filter((s) =>
    ['in_progress', 'waiting', 'resolved', 'closed'].includes(s),
  )

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden border-surface-200 shadow-sm">
      <CardHeader className="shrink-0 space-y-3 border-b border-surface-100 bg-surface-50/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={ticket.status}
            statusLabel={statusLabel}
            statusVariant={statusVariant}
          />
          <Badge variant="outline" size="sm">
            {categoryLabel[ticket.category] ?? categoryLabel.general}
          </Badge>
          {!isClient && (
            <Badge variant="default" size="sm">
              {typeLabel[ticket.type]}
            </Badge>
          )}
          {isClosed && (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Kapalı
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg font-semibold leading-snug text-surface-900">
          {ticket.subject}
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
            İlk mesaj
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-surface-700">
            {ticket.description}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {!isClient && (
            <div className="flex items-start gap-2.5 rounded-lg border border-surface-100 bg-white p-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-surface-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-surface-500">
                  Oluşturan
                </p>
                <p className="mt-0.5 truncate text-sm text-surface-800">
                  {formatPersonName(ticket.createdBy, `#${ticket.createdByUserId}`)}
                </p>
              </div>
            </div>
          )}
          {!isClient && (
            <div className="flex items-start gap-2.5 rounded-lg border border-surface-100 bg-white p-3">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-surface-400" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-surface-500">
                  Atanan
                </p>
                <p className="mt-0.5 truncate text-sm text-surface-800">
                  {ticket.assignee
                    ? formatPersonName(ticket.assignee, `#${ticket.assignedToUserId}`)
                    : 'Atanmadı'}
                </p>
              </div>
            </div>
          )}
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border border-surface-100 bg-white p-3',
              isClient && 'sm:col-span-2',
            )}
          >
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-surface-400" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-surface-500">
                Oluşturulma
              </p>
              <p className="mt-0.5 text-sm text-surface-800">
                {new Date(ticket.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        </div>

        {ticket.escalationReason && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-800">
            <span className="font-medium">Yükseltme nedeni:</span> {ticket.escalationReason}
          </div>
        )}

        {showActions && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Settings2 className="h-4 w-4 text-surface-500" />
              <p className="text-sm font-semibold text-surface-800">İşlemler</p>
            </div>

            {availableStatuses.length > 0 && (
              <SectionBlock icon={CheckCircle2} title="Durum">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-surface-500">Mevcut:</span>
                    <StatusBadge
                      status={ticket.status}
                      statusLabel={statusLabel}
                      statusVariant={statusVariant}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-surface-600">Durum değiştir</label>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => onStatusChange(v as SupportTicketStatus)}
                      disabled={isBusy || updateLoading}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStatuses.map((s) => (
                          <SelectItem key={s} value={s} disabled={ticket.status === s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {quickStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {quickStatuses.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isBusy || updateLoading || ticket.status === s}
                          onClick={() => onStatusChange(s)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            ticket.status === s
                              ? 'border-primary-300 bg-primary-100 text-primary-800'
                              : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300 hover:bg-white',
                            (isBusy || updateLoading || ticket.status === s) &&
                              'cursor-not-allowed opacity-60',
                          )}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SectionBlock>
            )}

            {isAdmin && (
              <SectionBlock icon={UserCheck} title="Personel Ataması">
                <SupportTicketAssigneeSelect
                  ticket={ticket}
                  loading={assignLoading}
                  disabled={isBusy}
                  onAssign={onAssign}
                  onUnassign={onUnassign}
                />
              </SectionBlock>
            )}

            {(isAdmin || canEscalate) && (
              <SectionBlock icon={MessageCircleQuestion} title="Hızlı İşlemler">
                <div className="flex flex-col gap-2">
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 w-full justify-start"
                      loading={updateLoading}
                      disabled={isBusy || ticket.status === 'waiting'}
                      onClick={onRequestInfo}
                    >
                      <MessageCircleQuestion className="h-4 w-4" />
                      Danışandan Bilgi İste
                    </Button>
                  )}
                  {canEscalate && ticket.status !== 'escalated' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 w-full justify-start border-amber-200 text-amber-800 hover:bg-amber-50"
                      disabled={isBusy}
                      onClick={onEscalate}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Yöneticiye Yükselt
                    </Button>
                  )}
                </div>
              </SectionBlock>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
