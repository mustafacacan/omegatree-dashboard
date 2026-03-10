import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge, Avatar,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody,
} from '@/components/ui'
import { FileText, Check, User, Calendar, Loader2, Eye, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getPendingResultsPage, getResultById, updateResult, type Result } from '@/services/results.service'

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
  const totalItems = pendingQuery.data?.totalItems ?? pendingItems.length

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

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100">
          <CardTitle>Rapor Onaylari</CardTitle>
          <CardDescription>
            Uzman tarafindan gonderilen raporlar burada listelenir. Onayladiginizda rapor yayina alinmis olur.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {pendingQuery.isLoading ? (
            <div className="py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
              <p className="text-sm text-surface-500">Raporlar yukleniyor...</p>
            </div>
          ) : pendingQuery.isError ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">Raporlar yuklenemedi</p>
              <p className="text-xs text-surface-500 mt-1">Lutfen tekrar deneyin</p>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
                  Yenile
                </Button>
              </div>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">Onay bekleyen rapor yok</p>
              <p className="text-xs text-surface-500 mt-1">Uzman rapor gonderdiginde burada gorunecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-surface-500 mb-1">{totalItems} rapor onay bekliyor</p>
              {pendingItems.map((r, idx) => (
                <div
                  key={String(r.id ?? `row-${idx}`)}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-200 bg-amber-50/50 p-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-white">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-900">
                        <span className="font-mono text-sm">#{r.id ?? '-'}</span>
                        <Badge variant="warning" className="ml-2">{getResultStatusLabel(r.status)}</Badge>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-500">
                       
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {r.createdAt ? formatDate(r.createdAt) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(r)}
                      disabled={r.id == null}
                    >
                      <Eye className="h-4 w-4" />
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
                </div>
              ))}

              <TablePagination
                totalItems={totalItems}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
                className="rounded-xl"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={viewId != null} onOpenChange={(open) => !open && setViewId(null)}>
        <ModalContent className={detailMediaUrl ? 'max-w-4xl w-full' : 'max-w-md'}>
          <ModalHeader>
            <ModalTitle>Rapor Detayi</ModalTitle>
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
