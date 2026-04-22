import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PanelHeader } from '@/components/shared/panel-header'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import {
  Button, Badge, Avatar,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody,
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui'
import { FileText, Check, Loader2, Eye, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { formatDate, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getPendingResultsPage, getResultById, getResultsPage, updateResult, type Result } from '@/services/results.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

type ResultDecisionStatus = 'approved' | 'rejected'

type ApiUser = {
  id?: number
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
}

type ApiParty = {
  id?: number
  userId?: number
  createdAt?: string
  updatedAt?: string
  user?: ApiUser | null
}

type ResultDetail = Result & {
  dietician?: unknown
  dietitian?: unknown
  client?: unknown
  dieticianClient?: {
    dietician?: unknown
    dietitian?: unknown
    client?: unknown
  } | null
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function hasValue(v?: string | null) {
  return typeof v === 'string' && v.trim() !== ''
}

function toText(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function pickText(rec: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = rec[key]
    const t = toText(v)
    if (t) return t
  }
  return null
}

function normalizeUser(input: unknown): ApiUser | null {
  const rec = asRecord(input)
  if (!rec) return null
  const firstName = pickText(rec, ['firstName', 'first_name', 'firstname', 'nameFirst'])
  const lastName = pickText(rec, ['lastName', 'last_name', 'lastname', 'nameLast'])
  const phone = pickText(rec, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'mobilePhone'])
  const email = pickText(rec, ['email', 'mail', 'eMail'])
  const id = toNumber(rec.id ?? rec.userId ?? rec.user_id) ?? undefined
  if (!firstName && !lastName && !phone && !email && id == null) return null
  return { id, firstName: firstName ?? undefined, lastName: lastName ?? undefined, phone: phone ?? undefined, email: email ?? undefined }
}

function fullNameFromUnknownUser(input: unknown): string {
  const user = normalizeUser(input)
  const first = user?.firstName?.trim() ?? ''
  const last = user?.lastName?.trim() ?? ''
  const name = [first, last].filter(Boolean).join(' ').trim()
  return name || '—'
}

function normalizeParty(input: unknown): ApiParty | null {
  const rec = asRecord(input)
  if (!rec) return null

  // Prefer nested `user` shape
  const nestedUser = normalizeUser(rec.user)
  if (nestedUser) {
    return {
      id: toNumber(rec.id) ?? undefined,
      userId: toNumber(rec.userId) ?? nestedUser.id ?? undefined,
      createdAt: toText(rec.createdAt) ?? undefined,
      updatedAt: toText(rec.updatedAt) ?? undefined,
      user: nestedUser,
    }
  }

  // Fallback: some APIs return party as a flat user-like object (firstName/lastName/email/phone)
  const flatUser = normalizeUser(rec)
  if (flatUser) {
    return {
      id: toNumber(rec.id) ?? flatUser.id ?? undefined,
      userId: toNumber(rec.userId) ?? flatUser.id ?? undefined,
      createdAt: toText(rec.createdAt) ?? undefined,
      updatedAt: toText(rec.updatedAt) ?? undefined,
      user: flatUser,
    }
  }

  // Last resort: at least keep ids so we can render something
  const id = toNumber(rec.id)
  const userId = toNumber(rec.userId)
  if (id == null && userId == null) return null
  return { id: id ?? undefined, userId: userId ?? undefined }
}

function isProbablyPdf(url?: string | null) {
  if (!url) return false
  return /\.pdf($|\?|#)/i.test(url)
}

function getResultMediaUrl(result: Result): string | null {
  return result.mediaResult?.url ?? result.resultMedia ?? null
}

function getResultStatusLabel(status?: string): string {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'completed') return 'Sonuclandi'
  if (status === 'approved') return 'Onaylandi'
  if (status === 'rejected') return 'Reddedildi'
  return status || '—'
}

export function ReportApprovalsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [viewId, setViewId] = useState<number | null>(null)
  const [decisionInFlight, setDecisionInFlight] = useState<{ id: number; status: ResultDecisionStatus } | null>(null)
  const [confirmDecision, setConfirmDecision] = useState<{ id: number; status: ResultDecisionStatus } | null>(null)

  const pendingQuery = useQuery({
    queryKey: ['admin', 'results', 'pending', page, pageSize],
    queryFn: () => getPendingResultsPage({ page, limit: pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })

  const pendingItems = pendingQuery.data?.items ?? []
  const pendingTotal = pendingQuery.data?.totalItems ?? pendingItems.length

  const approvedQuery = useQuery({
    queryKey: ['admin', 'results', 'approved', page, pageSize],
    queryFn: () => getResultsPage({ page, limit: pageSize, status: 'approved' }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    enabled: activeTab === 'approved',
  })

  const approvedItems = approvedQuery.data?.items ?? []
  const approvedTotal = approvedQuery.data?.totalItems ?? approvedItems.length

  const detailQuery = useQuery({
    queryKey: ['admin', 'results', 'detail', viewId],
    queryFn: async () => (await getResultById(viewId as number)) as unknown as ResultDetail,
    enabled: viewId != null,
    retry: 1,
  })

  const detailResult = (detailQuery.data as ResultDetail | undefined) ?? null
  const detailTitle = useMemo(() => {
    if (detailResult?.id != null) return `#${detailResult.id}`
    if (viewId == null) return '—'
    return `#${viewId}`
  }, [detailResult?.id, viewId])

  const detailMediaUrl = useMemo(() => {
    if (!detailResult) return null
    const url = getResultMediaUrl(detailResult)
    return typeof url === 'string' && url.trim() ? url : null
  }, [detailResult])

  const dieticianParty = useMemo(() => {
    if (!detailResult) return null
    const root = asRecord(detailResult)
    const nestedFromCamel = asRecord(root?.dieticianClient)
    const nestedFromSnake = asRecord(root?.dietician_client)
    const nestedFromAlt = asRecord(root?.dieticianClientRelation) ?? asRecord(root?.dieticianClientRelationship)
    const nested = (nestedFromCamel ?? nestedFromSnake ?? nestedFromAlt) as Record<string, unknown> | null
    return (
      normalizeParty(detailResult.dietician) ??
      normalizeParty(detailResult.dietitian) ??
      normalizeParty(nested?.dietician) ??
      normalizeParty(nested?.dietitian) ??
      null
    )
  }, [detailResult])

  const clientParty = useMemo(() => {
    if (!detailResult) return null
    const root = asRecord(detailResult)
    const nestedFromCamel = asRecord(root?.dieticianClient)
    const nestedFromSnake = asRecord(root?.dietician_client)
    const nestedFromAlt = asRecord(root?.dieticianClientRelation) ?? asRecord(root?.dieticianClientRelationship)
    const nested = (nestedFromCamel ?? nestedFromSnake ?? nestedFromAlt) as Record<string, unknown> | null
    return normalizeParty(detailResult.client) ?? normalizeParty(nested?.client) ?? null
  }, [detailResult])

  const hasParties = Boolean(dieticianParty || clientParty)

  const decisionMutation = useMutation({
    mutationFn: async (vars: { id: number; status: ResultDecisionStatus }) => updateResult(vars.id, { status: vars.status }),
    onMutate: (vars) => {
      setDecisionInFlight(vars)
    },
    onSuccess: async (_data, vars) => {
      toast.success(vars.status === 'approved' ? 'Rapor onaylandi' : 'Rapor iptal edildi')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'results', 'pending'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'results', 'approved'] })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'results', 'detail', vars.id] })
      setConfirmDecision(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
    },
    onSettled: () => {
      setDecisionInFlight(null)
    },
  })

  const openConfirmFor = (result: Result, status: ResultDecisionStatus) => {
    const id = Number(result.id)
    if (!Number.isFinite(id)) {
      toast.error('Result ID bulunamadi')
      return
    }
    setConfirmDecision({ id, status })
  }

  const handleView = (result: Result) => {
    const id = Number(result.id)
    if (!Number.isFinite(id)) {
      toast.error('Result ID bulunamadi')
      return
    }
    setViewId(id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <PanelHeader
            title="Rapor Onayları"
            description="Uzman tarafından gönderilen raporlar burada listelenir. Onayladığınızda rapor yayına alınmış olur."
          />

          <div className="px-5 pt-2">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as 'pending' | 'approved')
                setPage(1)
                setViewId(null)
              }}
            >
              <TabsList>
                <TabsTrigger value="pending">Onay Bekleyen</TabsTrigger>
                <TabsTrigger value="approved">Onaylanan</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeTab === 'pending' && pendingQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : activeTab === 'pending' && pendingQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-700">Raporlar yüklenemedi</p>
              <p className="text-xs text-surface-500">Lütfen tekrar deneyin</p>
              <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
                Yenile
              </Button>
            </div>
          ) : activeTab === 'pending' && pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-700">Onay bekleyen rapor yok</p>
              <p className="text-xs text-surface-500">Uzman rapor gönderdiğinde burada görünecek</p>
            </div>
          ) : activeTab === 'pending' ? (
            <>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Rapor</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tarih</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map((r, idx) => (
                        <tr
                          key={String(r.id ?? `row-${idx}`)}
                          className="border-b border-surface-200 last:border-0 hover:bg-surface-50"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
                                <FileText className="h-5 w-5 text-warning" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-[13px] font-semibold text-surface-900">#{r.id ?? '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[12px] text-surface-600">
                            {r.createdAt ? formatDate(r.createdAt) : '-'}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="warning">{getResultStatusLabel(r.status)}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(r)}
                                disabled={r.id == null}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Görüntüle
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={decisionMutation.isPending}
                                loading={decisionInFlight?.id === Number(r.id) && decisionInFlight.status === 'rejected'}
                                onClick={() => openConfirmFor(r, 'rejected')}
                              >
                                İptal
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={decisionMutation.isPending}
                                loading={decisionInFlight?.id === Number(r.id) && decisionInFlight.status === 'approved'}
                                onClick={() => openConfirmFor(r, 'approved')}
                                leftIcon={<Check className="h-4 w-4" />}
                              >
                                Onayla
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-surface-200 px-5 py-4">
                <TablePagination
                  totalItems={pendingTotal}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next)
                    setPage(1)
                  }}
                />
              </div>
            </>
          ) : approvedQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : approvedQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-700">Raporlar yüklenemedi</p>
              <p className="text-xs text-surface-500">Lütfen tekrar deneyin</p>
              <Button variant="outline" size="sm" onClick={() => approvedQuery.refetch()}>
                Yenile
              </Button>
            </div>
          ) : approvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-700">Onaylanan rapor yok</p>
              <p className="text-xs text-surface-500">Onaylanan raporlar burada listelenir</p>
            </div>
          ) : (
            <>
              <div className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Rapor</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tarih</th>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedItems.map((r, idx) => (
                        <tr
                          key={String(r.id ?? `row-${idx}`)}
                          className="border-b border-surface-200 last:border-0 hover:bg-surface-50"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
                                <FileText className="h-5 w-5 text-success" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-[13px] font-semibold text-surface-900">#{r.id ?? '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[12px] text-surface-600">
                            {r.updatedAt ? formatDate(r.updatedAt) : (r.createdAt ? formatDate(r.createdAt) : '-')}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="success">{getResultStatusLabel(r.status)}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleView(r)}
                                disabled={r.id == null}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Görüntüle
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-surface-200 px-5 py-4">
                <TablePagination
                  totalItems={approvedTotal}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next)
                    setPage(1)
                  }}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>

      <Modal open={viewId != null} onOpenChange={(open) => !open && setViewId(null)}>
        <ModalContent className={detailMediaUrl ? 'max-w-4xl w-full' : 'max-w-lg'}>
          <ModalHeader>
            <ModalTitle>Rapor Detayı</ModalTitle>
            <ModalDescription>
              {detailTitle}
              {hasParties ? (
                <>
                  {' '}·{' '}
                  {dieticianParty?.user ? fullNameFromUnknownUser(dieticianParty.user) : '—'}
                  {' '}→{' '}
                  {clientParty?.user ? fullNameFromUnknownUser(clientParty.user) : '—'}
                </>
              ) : null}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {detailQuery.isLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                <p className="text-sm text-surface-500">Detay yukleniyor...</p>
              </div>
            ) : detailQuery.isError ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                {getApiErrorMessage(detailQuery.error, { fallback: 'Detay yuklenemedi.' })}
              </div>
            ) : detailResult ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 text-xs">Durum</p>
                    <p>{getResultStatusLabel(detailResult.status)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Olusturma</p>
                    <p>{detailResult.createdAt ? formatDateTime(detailResult.createdAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Guncelleme</p>
                    <p>{detailResult.updatedAt ? formatDateTime(detailResult.updatedAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Eslesme</p>
                    <p className="font-mono font-semibold">{detailResult.dieticianClientId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Degerlendirme</p>
                    <p>{detailResult.overall_evaluation ?? '—'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!hasParties ? (
                    <div className="sm:col-span-2 rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                      Bu sonuç için diyetisyen/danışan bilgisi API’den gelmedi.
                    </div>
                  ) : null}

                  {hasParties ? (
                    <>
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Diyetisyen</p>
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={dieticianParty?.user ? fullNameFromUnknownUser(dieticianParty.user) : '—'}
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-surface-900 truncate">{dieticianParty?.user ? fullNameFromUnknownUser(dieticianParty.user) : '—'}</p>
                            <div className="mt-1 space-y-1 text-xs text-surface-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-surface-400" />
                                <span className="truncate">{hasValue(dieticianParty?.user?.email) ? dieticianParty!.user!.email : '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-surface-400" />
                                <span>{hasValue(dieticianParty?.user?.phone) ? dieticianParty!.user!.phone : '—'}</span>
                              </div>
                            </div>

                           
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Danışan</p>
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={clientParty?.user ? fullNameFromUnknownUser(clientParty.user) : '—'}
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-surface-900 truncate">{clientParty?.user ? fullNameFromUnknownUser(clientParty.user) : '—'}</p>
                            <div className="mt-1 space-y-1 text-xs text-surface-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-surface-400" />
                                <span className="truncate">{hasValue(clientParty?.user?.email) ? clientParty!.user!.email : '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-surface-400" />
                                <span>{hasValue(clientParty?.user?.phone) ? clientParty!.user!.phone : '—'}</span>
                              </div>
                            </div>

                         
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                {(detailResult.nutrition_suggestions || detailResult.reinforcement_suggestions) ? (
                  <div className="space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
                    {detailResult.nutrition_suggestions ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Beslenme Onerileri</p>
                        <p className="text-sm text-surface-800 whitespace-pre-wrap">{detailResult.nutrition_suggestions}</p>
                      </div>
                    ) : null}
                    {detailResult.reinforcement_suggestions ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Takviye Onerileri</p>
                        <p className="text-sm text-surface-800 whitespace-pre-wrap">{detailResult.reinforcement_suggestions}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {detailMediaUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>
                      <Button
                        variant="link"
                        onClick={() => window.open(detailMediaUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Linkten Ac
                      </Button>
                    </div>
                    {isProbablyPdf(detailMediaUrl) ? (
                      <PdfViewer file={detailMediaUrl} maxHeight="55vh" className="flex-1" />
                    ) : (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                        <p className="text-sm text-surface-600">Dosya onizlemesi sadece PDF icin destekleniyor.</p>
                        <p className="text-xs text-surface-500 mt-1">Linkten acarak goruntuleyebilirsiniz.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <p className="text-sm text-surface-600">Sonuc dosyasi bulunamadi.</p>
                    <p className="text-xs text-surface-500 mt-1">Bu kayit icin medya yuklenmemis olabilir.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                Detay bulunamadi.
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={confirmDecision != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDecision(null)
        }}
        title={confirmDecision?.status === 'rejected' ? 'Raporu reddet' : 'Raporu yayınla'}
        description={
          confirmDecision
            ? (confirmDecision.status === 'rejected'
              ? `Raporu reddetmek istiyor musunuz? Bu islemden sonra rapor yayinlanmaz.`
              : `Raporu onaylamak istiyor musunuz? Bu işlemden sonra rapor yayınlanır ilgili diyetisyen ve danışan erişebilir.`)
            : 'Devam etmek istiyor musunuz?'
        }
        confirmLabel={confirmDecision?.status === 'rejected' ? 'Reddet' : 'Yayınla'}
        cancelLabel="Vazgeç"
        variant={confirmDecision?.status === 'rejected' ? 'danger' : 'default'}
        loading={decisionMutation.isPending}
        onConfirm={() => {
          if (!confirmDecision) return
          decisionMutation.mutate({ id: confirmDecision.id, status: confirmDecision.status })
        }}
      />
    </div>
  )
}
