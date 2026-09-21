import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MessageSquareText,
  Plus,
  HeadphonesIcon,
  Clock,
  ChevronRight,
  ArrowLeft,
  Search,
  Inbox,
  LoaderCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/utils/routes'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCurrentRole, useCurrentUser } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import {
  addSupportTicketMessage,
  createSupportTicket,
  escalateSupportTicket,
  getSupportTicket,
  listSupportTickets,
  updateSupportTicket,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketStatus,
  type SupportTicketType,
} from '@/services/support-tickets.service'
import { SupportTicketChat } from '@/features/support/components/support-ticket-chat'
import { SupportTicketDetailPanel } from '@/features/support/components/support-ticket-detail-panel'

const STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Açık',
  in_progress: 'İşlemde',
  waiting: 'Danışandan Bilgi Bekleniyor',
  waiting_for_staff: 'Personel Bekleniyor',
  escalated: 'Yönetime Yükseltildi',
  resolved: 'Çözüldü',
  closed: 'Kapalı',
}

const TYPE_LABEL: Record<SupportTicketType, string> = {
  request: 'Talep',
  support: 'Destek',
  complaint: 'Şikâyet',
}

const CATEGORY_LABEL: Record<SupportTicketCategory, string> = {
  technical: 'Teknik',
  diet: 'Diyetisyen',
  expert: 'Uzman',
  laboratory: 'Laboratuvar',
  general: 'Genel',
  other: 'Diğer',
}

const ALL_STATUSES = Object.keys(STATUS_LABEL) as SupportTicketStatus[]
const ALL_TYPES = Object.keys(TYPE_LABEL) as SupportTicketType[]
const ALL_CATEGORIES = Object.keys(CATEGORY_LABEL) as SupportTicketCategory[]

const CLIENT_CATEGORIES: SupportTicketCategory[] = [
  'general',
  'technical',
  'diet',
  'laboratory',
  'other',
]

const CLIENT_STATUS_FILTER: SupportTicketStatus[] = [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
]

const STATUS_VARIANT: Record<
  SupportTicketStatus,
  'primary' | 'warning' | 'info' | 'success' | 'default' | 'danger'
> = {
  open: 'primary',
  in_progress: 'info',
  waiting: 'warning',
  waiting_for_staff: 'warning',
  escalated: 'danger',
  resolved: 'success',
  closed: 'default',
}

const STAFF_ROLES: UserRole[] = [UserRole.DIETITIAN, UserRole.LAB, UserRole.SPECIALIST]

function StatusBadge({ status }: { status: SupportTicketStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'} size="sm">
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function ticketList(raw: Awaited<ReturnType<typeof listSupportTickets>>): SupportTicket[] {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.items)) return raw.items
  return []
}

function formatPersonName(
  person?: { firstName?: string; lastName?: string } | null,
  fallback?: string,
) {
  if (!person) return fallback ?? '—'
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return name || fallback || '—'
}

export function SupportTicketsPage() {
  const queryClient = useQueryClient()
  const role = useCurrentRole()
  const currentUser = useCurrentUser()

  const isAdmin = role === UserRole.ADMIN
  const isStaff = role != null && STAFF_ROLES.includes(role)
  const isClient = role === UserRole.DANISAN

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [escalateOpen, setEscalateOpen] = useState(false)
  const [escalateReason, setEscalateReason] = useState('')

  const [createForm, setCreateForm] = useState({
    type: 'support' as SupportTicketType,
    category: 'general' as SupportTicketCategory,
    subject: '',
    description: '',
  })

  const listQuery = useQuery({
    queryKey: ['support-tickets', statusFilter, typeFilter, categoryFilter, search],
    queryFn: () =>
      listSupportTickets({
        page: 1,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        search: search.trim() || undefined,
      }),
  })

  const detailQuery = useQuery({
    queryKey: ['support-ticket', selectedId],
    queryFn: () => getSupportTicket(selectedId!),
    enabled: selectedId != null,
  })

  const invalidateTickets = () => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    if (selectedId != null) {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedId] })
    }
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createSupportTicket({
        type: createForm.type,
        category: createForm.category,
        subject: createForm.subject.trim(),
        description: createForm.description.trim(),
      }),
    onSuccess: (ticket) => {
      toast.success('Talep oluşturuldu.')
      setCreateOpen(false)
      setCreateForm({ type: 'support', category: 'general', subject: '', description: '' })
      setSelectedId(ticket.id)
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: {
      status?: SupportTicketStatus
      assignedToUserId?: number | null
    }) => updateSupportTicket(selectedId!, payload),
    onSuccess: () => {
      toast.success('Talep güncellendi.')
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (userId: number) =>
      updateSupportTicket(selectedId!, { assignedToUserId: userId }),
    onSuccess: () => {
      toast.success('Personel ataması yapıldı.')
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const unassignMutation = useMutation({
    mutationFn: () => updateSupportTicket(selectedId!, { assignedToUserId: null }),
    onSuccess: () => {
      toast.success('Atama kaldırıldı.')
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const escalateMutation = useMutation({
    mutationFn: () =>
      escalateSupportTicket(selectedId!, {
        reason: escalateReason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Talep yöneticiye yükseltildi.')
      setEscalateOpen(false)
      setEscalateReason('')
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const replyMutation = useMutation({
    mutationFn: (payload: { body: string; isInternal?: boolean; file?: File | null }) =>
      addSupportTicketMessage(selectedId!, payload),
    onSuccess: () => {
      toast.success('Yanıt gönderildi.')
      invalidateTickets()
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const tickets = useMemo(() => ticketList(listQuery.data ?? {}), [listQuery.data])
  const selected = detailQuery.data

  const ticketStats = useMemo(() => {
    const active = tickets.filter((t) =>
      ['open', 'in_progress', 'waiting', 'waiting_for_staff', 'escalated'].includes(t.status),
    ).length
    const waiting = tickets.filter((t) => t.status === 'waiting').length
    const resolved = tickets.filter((t) =>
      ['resolved', 'closed'].includes(t.status),
    ).length
    return { total: tickets.length, active, waiting, resolved }
  }, [tickets])

  const availableStatuses = useMemo(() => {
    if (isAdmin) return ALL_STATUSES
    if (isStaff) {
      return ALL_STATUSES.filter((s) =>
        ['in_progress', 'waiting', 'waiting_for_staff', 'escalated', 'resolved', 'closed'].includes(s),
      )
    }
    return []
  }, [isAdmin, isStaff])

  const canEscalate = useMemo(() => {
    if (!selected || !currentUser) return false
    if (isAdmin) return true
    if (!isStaff) return false
    return selected.assignedToUserId === Number(currentUser.id)
  }, [selected, currentUser, isAdmin, isStaff])

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    assignMutation.isPending ||
    unassignMutation.isPending ||
    escalateMutation.isPending ||
    replyMutation.isPending

  const submitCreate = () => {
    if (createForm.subject.trim().length < 3) {
      toast.error('Konu en az 3 karakter olmalıdır.')
      return
    }
    if (createForm.description.trim().length < 5) {
      toast.error('Açıklama en az 5 karakter olmalıdır.')
      return
    }
    createMutation.mutate()
  }

  const pageTitle = isClient ? 'Destek Merkezi' : 'Talep / Destek / Şikâyet'
  const pageDescription = isAdmin
    ? 'Kullanıcı taleplerini görüntüleyin, atayın, durum güncelleyin ve yanıtlayın.'
    : isStaff
      ? 'Size atanan veya oluşturduğunuz talepleri yönetin.'
      : 'Sorularınız ve talepleriniz için bize yazın; yanıtları buradan takip edin.'

  const statusOptions = isClient ? CLIENT_STATUS_FILTER : ALL_STATUSES
  const categoryOptions = isClient ? CLIENT_CATEGORIES : ALL_CATEGORIES

  return (
    <div className="animate-fade-in space-y-6 lg:grid lg:h-[calc(100dvh-9rem)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden lg:space-y-0">
      <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={
          isClient
            ? [{ label: 'Panelim', href: ROUTES.DANISAN }, { label: 'Destek' }]
            : undefined
        }
        actions={
          isStaff || isClient ? (
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {isClient ? 'Yeni Destek Talebi' : 'Yeni Talep'}
            </Button>
          ) : undefined
        }
      />

      {isClient && (
        <Card className="overflow-hidden border-primary-100 bg-gradient-to-br from-primary-50/90 via-white to-panel">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100">
                <HeadphonesIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-surface-900">
                  Size nasıl yardımcı olabiliriz?
                </h2>
                <p className="mt-1 text-sm text-surface-600">
                  Teknik sorun, diyetisyen, laboratuvar veya genel konularda talep oluşturun.
                  Yanıtlar genellikle 1–2 iş günü içinde gelir.
                </p>
              </div>
              <Button variant="primary" className="shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Talep Oluştur
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!listQuery.isLoading && tickets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Toplam', value: ticketStats.total, tone: 'text-surface-900' },
            { label: 'Aktif', value: ticketStats.active, tone: 'text-primary-700' },
            { label: 'Bekleyen', value: ticketStats.waiting, tone: 'text-amber-700' },
            { label: 'Kapalı', value: ticketStats.resolved, tone: 'text-green-700' },
          ].map((stat) => (
            <Card key={stat.label} className="border-surface-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
                  {stat.label}
                </p>
                <p className={cn('mt-1 text-2xl font-semibold tabular-nums', stat.tone)}>
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-surface-200 shadow-sm">
        <CardHeader className="border-b border-surface-100 pb-4">
          <CardTitle className="text-sm font-semibold text-surface-800">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
              <Input
                label="Ara"
                placeholder={isClient ? 'Konu ara...' : 'Konu veya açıklama'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {statusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isClient && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Kategori</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {categoryOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {CATEGORY_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Tür</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {ALL_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {TYPE_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {listQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(listQuery.error, { fallback: 'Talepler yüklenemedi.' })}
        </div>
      )}
      </div>

      <div className="grid min-h-[420px] gap-4 overflow-hidden lg:min-h-0 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
        <Card
          className={cn(
            'flex h-full min-h-0 flex-col overflow-hidden border-surface-200 shadow-sm',
            selectedId != null && 'hidden lg:flex',
          )}
        >
          <CardHeader className="shrink-0 border-b border-surface-100 bg-surface-50/60 py-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-surface-800">
                <Inbox className="h-4 w-4 text-surface-500" />
                {isClient ? 'Taleplerim' : 'Talep Listesi'}
              </CardTitle>
              {!listQuery.isLoading && (
                <Badge variant="outline" size="sm">
                  {tickets.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {listQuery.isLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-sm text-surface-500">
                <LoaderCircle className="h-5 w-5 animate-spin text-primary-500" />
                Yükleniyor...
              </div>
            )}
            {!listQuery.isLoading && !listQuery.isError && tickets.length === 0 && (
              <div className="flex flex-1 items-center justify-center p-4">
                <EmptyState
                  icon={MessageSquareText}
                  title={isClient ? 'Henüz talebiniz yok' : 'Kayıt yok'}
                  description={
                    isClient
                      ? 'Bir sorunuz veya talebiniz varsa yeni destek talebi oluşturabilirsiniz.'
                      : 'Filtrelere uygun talep bulunamadı.'
                  }
                  action={
                    isStaff || isClient
                      ? {
                          label: isClient ? 'İlk Talebi Oluştur' : 'Yeni Talep Oluştur',
                          onClick: () => setCreateOpen(true),
                        }
                      : undefined
                  }
                />
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={cn(
                    'group w-full rounded-xl border p-3.5 text-left transition-all',
                    selectedId === ticket.id
                      ? 'border-primary-300 bg-primary-50/60 shadow-sm ring-1 ring-primary-200'
                      : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={ticket.status} />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-surface-500">
                          {CATEGORY_LABEL[ticket.category] ?? CATEGORY_LABEL.general}
                        </span>
                      </div>
                      <p className="truncate font-medium text-surface-900">{ticket.subject}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                        <Clock className="h-3 w-3 shrink-0" />
                        {new Date(ticket.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {!isClient && (
                          <>
                            <span className="text-surface-300">·</span>
                            <span className="truncate">
                              {formatPersonName(ticket.createdBy, `#${ticket.createdByUserId}`)}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 transition-transform',
                        selectedId === ticket.id
                          ? 'translate-x-0.5 text-primary-600'
                          : 'text-surface-400 group-hover:text-surface-600',
                      )}
                    />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div
          className={cn(
            'flex h-full min-h-0 flex-col gap-4 overflow-hidden',
            selectedId == null && 'hidden lg:flex',
          )}
        >
          {!selectedId && (
            <Card className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden border-dashed border-surface-200 bg-surface-50/40 shadow-none">
              <EmptyState
                icon={MessageSquareText}
                title="Detay seçin"
                description="Soldan bir talep seçerek detayını ve mesajlaşmayı görüntüleyin."
              />
            </Card>
          )}

          {selectedId != null && (
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="h-4 w-4" />
                Listeye dön
              </Button>
            </div>
          )}

          {selectedId && detailQuery.isLoading && (
            <Card className="flex flex-1 items-center justify-center border-surface-200">
              <div className="flex items-center gap-2 text-sm text-surface-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Detay yükleniyor...
              </div>
            </Card>
          )}

          {selectedId && detailQuery.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {getApiErrorMessage(detailQuery.error, { fallback: 'Talep detayı yüklenemedi.' })}
            </div>
          )}

          {selected && (
            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <SupportTicketDetailPanel
                  ticket={selected}
                  isClient={isClient}
                  isAdmin={isAdmin}
                  isBusy={isBusy}
                  canEscalate={canEscalate}
                  availableStatuses={availableStatuses}
                  statusLabel={STATUS_LABEL}
                  categoryLabel={CATEGORY_LABEL}
                  typeLabel={TYPE_LABEL}
                  statusVariant={STATUS_VARIANT}
                  formatPersonName={formatPersonName}
                  onStatusChange={(status) => updateMutation.mutate({ status })}
                  onAssign={(userId) => assignMutation.mutate(userId)}
                  onUnassign={() => unassignMutation.mutate()}
                  onRequestInfo={() => updateMutation.mutate({ status: 'waiting' })}
                  onEscalate={() => setEscalateOpen(true)}
                  assignLoading={assignMutation.isPending || unassignMutation.isPending}
                  updateLoading={updateMutation.isPending}
                />
              </div>

              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <SupportTicketChat
                  messages={selected.messages ?? []}
                  currentUserId={currentUser?.id}
                  isClient={isClient}
                  isAdmin={isAdmin}
                  disabled={isBusy}
                  loading={replyMutation.isPending}
                  closed={selected.status === 'resolved' || selected.status === 'closed'}
                  fillHeight
                  className="h-full min-h-0"
                  onSend={(payload) => replyMutation.mutate(payload)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>{isClient ? 'Yeni Destek Talebi' : 'Yeni Talep Oluştur'}</ModalTitle>
            <ModalDescription>
              {isClient
                ? 'Konunuzu kısaca yazın; ilgili ekibe yönlendirilecektir.'
                : 'Talep türü, kategori ve açıklama bilgilerini doldurun.'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {!isClient && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700">Tür</label>
                <Select
                  value={createForm.type}
                  onValueChange={(v) =>
                    setCreateForm((s) => ({ ...s, type: v as SupportTicketType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {TYPE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Konu alanı</label>
              <Select
                value={createForm.category}
                onValueChange={(v) =>
                  setCreateForm((s) => ({ ...s, category: v as SupportTicketCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isClient ? CLIENT_CATEGORIES : ALL_CATEGORIES).map((value) => (
                    <SelectItem key={value} value={value}>
                      {CATEGORY_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Konu *"
              value={createForm.subject}
              onChange={(e) => setCreateForm((s) => ({ ...s, subject: e.target.value }))}
              placeholder="Kısa özet"
            />
            <Textarea
              label="Açıklama *"
              value={createForm.description}
              onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Detaylı açıklama"
              rows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              İptal
            </Button>
            <Button loading={createMutation.isPending} disabled={isBusy} onClick={submitCreate}>
              Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={escalateOpen} onOpenChange={setEscalateOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Yöneticiye Yükselt</ModalTitle>
            <ModalDescription>
              Talep yönetici kuyruğuna alınır. İsteğe bağlı olarak neden belirtebilirsiniz.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <Textarea
              label="Yükseltme nedeni (opsiyonel)"
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              placeholder="Kısa açıklama..."
              rows={4}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)} disabled={escalateMutation.isPending}>
              İptal
            </Button>
            <Button loading={escalateMutation.isPending} disabled={isBusy} onClick={() => escalateMutation.mutate()}>
              Yükselt
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
