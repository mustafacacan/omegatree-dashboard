import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PanelHeader } from '@/components/shared/panel-header'
import { ToolbarSearch } from '@/components/shared/toolbar-search'
import {
  Card, CardContent, Button, Avatar, Badge,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Search, Plus, MoreHorizontal, Eye, Mail, Loader2, Phone, PackagePlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { TablePagination } from '@/components/shared/table-pagination'
import { ROUTES, danisanDetayPath } from '@/utils/routes'
import { getApiErrorMessage } from '@/lib/api-error'
import { getClientsByDietician } from '@/services/dietician-clients.service'
import { assignDieticianClientKitToClient, getDieticianClientKitById, getDieticianClientKits, sendKitToLaboratory } from '@/services/dietician-client-kits.service'
import { getClientDetail } from '@/services/clients.service'
import { getMyStockList } from '@/services/stocks.service'

type ActiveTab = 'clients' | 'kits'

export function ClientsListPage() {
  const [tab, setTab] = useState<ActiveTab>('clients')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailClientId, setDetailClientId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignClient, setAssignClient] = useState<{ id: number; name?: string } | null>(null)
  const [selectedKitId, setSelectedKitId] = useState('')
  const [kitDetailOpen, setKitDetailOpen] = useState(false)
  const [kitDetailId, setKitDetailId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{
    assignmentId: number
    clientName?: string
    kitName?: string
    kitBarcode?: string
    status?: 'in_client' | 'in_laboratory' | 'in_expert' | 'delivered' | 'cancelled' | 'completed'
  } | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const openKitDetail = (id: number | undefined | null) => {
    if (!id) return
    setKitDetailId(id)
    setKitDetailOpen(true)
  }

  const openEdit = (t: {
    assignmentId?: number
    clientName?: string
    kitName?: string
    kitBarcode?: string
    status?: 'in_client' | 'in_laboratory' | 'in_expert' | 'delivered' | 'cancelled' | 'completed'
  }) => {
    if (!t.assignmentId) return
    setEditTarget({
      assignmentId: t.assignmentId,
      clientName: t.clientName,
      kitName: t.kitName,
      kitBarcode: t.kitBarcode,
      status: t.status,
    })
    setEditOpen(true)
  }

  const {
    data: clientsData,
    isLoading: clientsLoading,
  } = useQuery({
    queryKey: ['dieticians', 'get-clients-by-dietician', { page, limit: pageSize, search }],
    enabled: tab === 'clients',
    queryFn: () =>
      getClientsByDietician({
        page,
        limit: pageSize,
        search: search.trim() ? search.trim() : undefined,
      }),
  })

  const {
    data: kitsData,
    isLoading: kitsLoading,
  } = useQuery({
    queryKey: ['dietician-client-kits', { page: 1 }],
    enabled: tab === 'kits',
    queryFn: () => getDieticianClientKits(1),
  })

  const kitAssignments = useMemo(() => {
    const kits = kitsData ?? []
    return kits
      .filter((k) => !!k.clientId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }, [kitsData])

  const filteredKitAssignments = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return kitAssignments
    return kitAssignments.filter((k) =>
      (k.clientName ?? '').toLowerCase().includes(q) ||
      String(k.clientId ?? '').includes(q) ||
      (k.kitBarcode ?? '').toLowerCase().includes(q) ||
      (k.kitName ?? '').toLowerCase().includes(q)
    )
  }, [kitAssignments, search])

  const paginatedKitAssignments = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredKitAssignments.slice(start, end)
  }, [filteredKitAssignments, page, pageSize])

  const clientsItems = clientsData?.items ?? []
  const clientsTotalItems = clientsData?.totalItems ?? 0

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ['clients', 'detail', detailClientId],
    enabled: detailOpen && typeof detailClientId === 'number',
    queryFn: () => getClientDetail(detailClientId as number),
  })

  const {
    data: kitDetail,
    isLoading: kitDetailLoading,
  } = useQuery({
    queryKey: ['dietician-client-kits', 'detail', kitDetailId],
    enabled: kitDetailOpen && typeof kitDetailId === 'number',
    queryFn: () => getDieticianClientKitById(kitDetailId as number),
  })

  const openDetail = (clientId: number | undefined | null) => {
    if (!clientId) return
    setDetailClientId(clientId)
    setDetailOpen(true)
  }

  const openAssign = (clientId: number | undefined | null, clientName?: string) => {
    if (!clientId) return
    setAssignClient({ id: clientId, name: clientName })
    setSelectedKitId('')
    setAssignOpen(true)
  }

  const { data: myStock, isLoading: myStockLoading } = useQuery({
    queryKey: ['stocks', 'my-stock'],
    enabled: assignOpen,
    queryFn: () => getMyStockList(),
  })

  const availableKits = useMemo(() => {
    const list = myStock ?? []
    const items = list
      .filter((s) => s.status === 'available' && s.kitId?.id != null && s.kitId?.barcode)
      .map((s) => ({
        kitId: String(s.kitId!.id),
        barcode: s.kitId!.barcode,
        name: s.kitId!.name,
      }))
    items.sort((a, b) => a.barcode.localeCompare(b.barcode, 'tr'))
    return items
  }, [myStock])

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignClient?.id) throw new Error('Danışan seçilmedi')
      const kitId = Number(selectedKitId)
      if (!Number.isFinite(kitId) || kitId <= 0) throw new Error('Kit seçin')
      return assignDieticianClientKitToClient(assignClient.id, kitId)
    },
    onSuccess: () => {
      toast.success('Kit atandi')
      queryClient.invalidateQueries({ queryKey: ['dietician-client-kits'] })
      queryClient.invalidateQueries({ queryKey: ['stocks', 'my-stock'] })
      setAssignOpen(false)
      setAssignClient(null)
      setSelectedKitId('')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : getApiErrorMessage(err, { fallback: 'Kit atamasi yapilamadi' })
      toast.error(message)
    },
  })

  const sendToLabMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget?.assignmentId) throw new Error('Atama bulunamadi')
      await sendKitToLaboratory(editTarget.assignmentId)
    },
    onSuccess: () => {
      toast.success('Laboratuvara gonderildi')
      queryClient.invalidateQueries({ queryKey: ['dietician-client-kits'] })
      if (kitDetailOpen && kitDetailId) {
        queryClient.invalidateQueries({ queryKey: ['dietician-client-kits', 'detail', kitDetailId] })
      }
      setEditOpen(false)
      setEditTarget(null)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Laboratuvara gonderilemedi' }))
    },
  })

  const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as ActiveTab)
          setPage(1)
        }}
      >
        <motion.div
          className="panel border-b border-surface-200"
          {...fadeUp}
        >
          <PanelHeader
            title="Danışanlarım"
            description={
              tab === 'clients'
                ? `Kayıtlı danışanlar (${clientsTotalItems} kişi)`
                : `Kit atanan danışanlar (${filteredKitAssignments.length} kişi)`
            }
            actions={
              <>
                <TabsList className="bg-surface-100 dark:bg-surface-200/60 p-0.5 rounded-lg">
                  <TabsTrigger value="clients" className="rounded-md text-[12px] data-[state=active]:bg-white dark:data-[state=active]:bg-surface-100">
                    Danışanlarım
                  </TabsTrigger>
                  <TabsTrigger value="kits" className="rounded-md text-[12px] data-[state=active]:bg-white dark:data-[state=active]:bg-surface-100">
                    Kit atananlar
                  </TabsTrigger>
                </TabsList>
                <ToolbarSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v)
                    setPage(1)
                  }}
                  placeholder="Ad veya ID ile ara..."
                  inputClassName="h-9 text-sm w-48"
                />
                <Link to={ROUTES.DIYETISYEN_DANISANLAR_YENI}>
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    Danışan Ekle
                  </Button>
                </Link>
              </>
            }
          />

          <TabsContent value="clients" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Danışan</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Client ID</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">User ID</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kayıt Tarihi</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading && !clientsData ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                        <p className="text-[12px] text-surface-500">Danışan listesi yükleniyor...</p>
                      </td>
                    </tr>
                  ) : clientsItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-surface-500">
                        Filtreye uygun danışan bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    clientsItems.map((client) => (
                      <tr
                        key={client.id}
                        className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40 cursor-pointer"
                        onClick={() => client.clientId && navigate(danisanDetayPath(String(client.clientId)))}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={client.clientName ?? '—'} size="sm" />
                            <span className="text-[12px] text-surface-700">{client.clientName ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{client.clientId ?? '—'}</code>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{client.clientUserId ?? '—'}</code>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-700">{client.clientEmail ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-500">{client.createdAt ? formatDate(client.createdAt) : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(client.clientId)}>
                                <Eye className="h-4 w-4 mr-2" /> Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAssign(client.clientId ?? null, client.clientName)}>
                                <PackagePlus className="h-4 w-4 mr-2" /> Kit Ata
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              totalItems={clientsTotalItems}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
            />
          </TabsContent>

          <TabsContent value="kits" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Danışan</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Client ID</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kit</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Aktif</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Son Atama</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
                  </tr>
                </thead>
                <tbody>
                  {kitsLoading && !kitsData ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                        <p className="text-[12px] text-surface-500">Kit atanan danışanlar yükleniyor...</p>
                      </td>
                    </tr>
                  ) : paginatedKitAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-[12px] text-surface-500">
                        Kit atanmış danışan bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    paginatedKitAssignments.map((k) => (
                      <tr
                        key={k.id}
                        className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40 cursor-pointer"
                        onClick={() => k.clientId && navigate(danisanDetayPath(String(k.clientId)))}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={k.clientName ?? '—'} size="sm" />
                            <span className="text-[12px] text-surface-700">{k.clientName ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{k.clientId ?? '—'}</code>
                        </td>
                        <td className="px-5 py-3.5">
                          {k.status ? (
                            <Badge
                              variant={
                                k.status === 'completed' || k.status === 'delivered'
                                  ? 'success'
                                  : k.status === 'cancelled'
                                    ? 'danger'
                                    : k.status === 'in_laboratory'
                                      ? 'warning'
                                      : k.status === 'in_expert'
                                        ? 'info'
                                        : 'primary'
                              }
                              size="sm"
                            >
                              {k.status === 'in_client'
                                ? 'Danışanda'
                                : k.status === 'in_laboratory'
                                  ? 'Laboratuvarda'
                                  : k.status === 'in_expert'
                                    ? 'Uzmanda'
                                    : k.status === 'delivered'
                                      ? 'Teslim'
                                      : k.status === 'cancelled'
                                        ? 'İptal'
                                        : k.status === 'completed'
                                          ? 'Tamamlandı'
                                          : k.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-surface-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="outline">{k.kitName ?? 'Kit'}</Badge>
                          {k.kitBarcode ? (
                            <div className="mt-1 text-[11px] text-surface-500">{k.kitBarcode}</div>
                          ) : (
                            <div className="mt-1 text-[11px] text-surface-400">—</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {k.isActive ? (
                            <Badge variant="success" size="sm">Aktif</Badge>
                          ) : (
                            <Badge variant="outline" size="sm">Pasif</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-500">{k.createdAt ? formatDate(k.createdAt) : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openKitDetail(k.id)}>
                                <Eye className="h-4 w-4 mr-2" /> Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openEdit({
                                    assignmentId: k.id,
                                    clientName: k.clientName,
                                    kitName: k.kitName,
                                    kitBarcode: k.kitBarcode,
                                    status: k.status,
                                  })
                                }
                              >
                                Düzenle
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              totalItems={filteredKitAssignments.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
            />
          </TabsContent>
        </motion.div>
      </Tabs>

      <Modal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailClientId(null)
        }}
      >
        <ModalContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>Danisan Detayi</ModalTitle>
          </ModalHeader>

          <ModalBody className="space-y-4 overflow-y-auto flex-1">
            {detailLoading && !detail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-surface-500">Detay yukleniyor...</span>
              </div>
            ) : detail ? (
              <>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${detail.user?.firstName ?? ''} ${detail.user?.lastName ?? ''}`.trim() || '—'} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-surface-900 truncate">
                              {`${detail.user?.firstName ?? ''} ${detail.user?.lastName ?? ''}`.trim() || '—'}
                            </p>
                            
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {detail.anamnezForm ? (
                          <Badge variant="success" size="sm">Anamnez Var</Badge>
                        ) : (
                          <Badge variant="outline" size="sm">Anamnez Yok</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <div className="flex items-center gap-2 text-sm text-surface-700">
                        <Phone className="h-4 w-4 text-surface-400" />
                        <span>{detail.user?.phone ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-surface-700">
                        <Mail className="h-4 w-4 text-surface-400" />
                        <span className="truncate">{detail.user?.email ?? '—'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs text-surface-500">
                      <div>
                        Kayit: {detail.createdAt ? formatDateTime(detail.createdAt) : '—'}
                      </div>
                      <div>
                        Adres sayisi: {detail.user?.addresses?.length ?? 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {detail.anamnezForm && (
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm font-semibold text-surface-900 mb-3">Anamnez</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-surface-500">Kronik:</span> {detail.anamnezForm.chronicIllness ?? '—'}</div>
                        <div><span className="text-surface-500">Ilac:</span> {detail.anamnezForm.medicationUsed ?? '—'}</div>
                        <div><span className="text-surface-500">Alerji:</span> {detail.anamnezForm.foodAllergy ?? '—'}</div>
                        <div><span className="text-surface-500">Meslek:</span> {detail.anamnezForm.profession ?? '—'}</div>
                        <div><span className="text-surface-500">Egitim:</span> {detail.anamnezForm.education ?? '—'}</div>
                        <div><span className="text-surface-500">Boy:</span> {detail.anamnezForm.bodyHeight ?? '—'}</div>
                        <div><span className="text-surface-500">Kilo:</span> {detail.anamnezForm.bodyWeight ?? '—'}</div>
                        <div><span className="text-surface-500">Bel:</span> {detail.anamnezForm.waistCircumference ?? '—'}</div>
                        <div><span className="text-surface-500">Kalca:</span> {detail.anamnezForm.hipCircumference ?? '—'}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {detail.dietician && (
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm font-semibold text-surface-900 mb-3">Diyetisyen</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-surface-500">Ad Soyad:</span> {`${detail.dietician.firstName ?? ''} ${detail.dietician.lastName ?? ''}`.trim() || '—'}
                        </div>
                        <div>
                          <span className="text-surface-500">E-posta:</span> {detail.dietician.email ?? '—'}
                        </div>
                        <div>
                          <span className="text-surface-500">Telefon:</span> {detail.dietician.phone ?? '—'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-sm text-surface-500">Detay bulunamadi.</div>
            )}
          </ModalBody>

          
        </ModalContent>
      </Modal>

      <Modal
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open)
          if (!open) {
            setAssignClient(null)
            setSelectedKitId('')
          }
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Kit Ata</ModalTitle>
            <ModalDescription>
              {assignClient?.name ? `${assignClient.name} icin stoktan kit secin.` : 'Stoktan kit secin.'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {myStockLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-surface-500">Stok yukleniyor...</span>
              </div>
            ) : availableKits.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-surface-700">Uygun kit bulunamadi</p>
                <p className="text-xs text-surface-500 mt-1">Stogunuzda atanabilir kit yok.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-surface-800">Kit</p>
                <Select value={selectedKitId} onValueChange={setSelectedKitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kit secin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKits.map((k) => (
                      <SelectItem key={k.kitId} value={k.kitId}>
                        {k.name ? `${k.name} • ${k.barcode}` : k.barcode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={assignMutation.isPending}
            >
              Vazgec
            </Button>
            <Button
              variant="primary"
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending || !selectedKitId || availableKits.length === 0}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ataniyor...
                </>
              ) : (
                'Kit Ata'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        open={kitDetailOpen}
        onOpenChange={(open) => {
          setKitDetailOpen(open)
          if (!open) setKitDetailId(null)
        }}
      >
        <ModalContent className="max-w-xl">
          <ModalHeader>
            <ModalTitle>Kit Atama Detayi</ModalTitle>
            <ModalDescription>
              {kitDetailId ? `Atama ID: ${kitDetailId}` : ''}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {kitDetailLoading && !kitDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-surface-500">Detay yukleniyor...</span>
              </div>
            ) : kitDetail ? (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-surface-900 truncate">Durum</p>
                        <p className="text-xs text-surface-500 truncate">
                          {kitDetail.createdAt ? formatDateTime(kitDetail.createdAt) : '—'}
                          {kitDetail.updatedAt ? ` • Guncelleme: ${formatDateTime(kitDetail.updatedAt)}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {kitDetail.status === 'completed' ? (
                          <Badge variant="success" size="sm">Tamamlandi</Badge>
                        ) : kitDetail.status === 'delivered' ? (
                          <Badge variant="success" size="sm">Teslim</Badge>
                        ) : kitDetail.status === 'cancelled' ? (
                          <Badge variant="danger" size="sm">Iptal Edildi</Badge>
                        ) : kitDetail.status === 'in_laboratory' ? (
                          <Badge variant="warning" size="sm">Laboratuvarda</Badge>
                        ) : kitDetail.status === 'in_expert' ? (
                          <Badge variant="info" size="sm">Uzmanda</Badge>
                        ) : kitDetail.status === 'in_client' ? (
                          <Badge variant="primary" size="sm">Danisanda</Badge>
                        ) : (
                          <Badge variant="outline" size="sm">Durum yok</Badge>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const steps = [
                        { key: 'in_client', label: 'Danisanda' },
                        { key: 'in_laboratory', label: 'Laboratuvarda' },
                        { key: 'in_expert', label: 'Uzmanda' },
                      ] as const

                      const status = kitDetail.status
                      const activeIndex = steps.findIndex((s) => s.key === status)
                      const isCancelled = status === 'cancelled'
                      const isDone = status === 'completed' || status === 'delivered'

                      const resolvedIndex = isDone ? steps.length - 1 : activeIndex

                      return (
                        <div className="mt-2">
                          <div className="flex items-center">
                            {steps.map((s, idx) => {
                              const isCompleted = !isCancelled && (isDone || resolvedIndex > idx)
                              const isCurrent = !isCancelled && !isDone && resolvedIndex === idx
                              const dotClass = isCancelled
                                ? 'bg-surface-200'
                                : isCompleted
                                  ? 'bg-primary-600'
                                  : isCurrent
                                    ? 'bg-primary-600'
                                    : 'bg-surface-200'
                              const ringClass = isCurrent ? 'ring-2 ring-primary-100' : ''
                              const textClass = isCancelled
                                ? 'text-surface-400'
                                : isCompleted || isCurrent
                                  ? 'text-surface-800'
                                  : 'text-surface-400'
                              const lineClass = isCancelled
                                ? 'bg-surface-200'
                                : isCompleted
                                  ? 'bg-primary-600'
                                  : 'bg-surface-200'

                              return (
                                <div key={s.key} className="flex-1 min-w-0">
                                  <div className="flex items-center">
                                    <div className={`h-2.5 w-2.5 rounded-full ${dotClass} ${ringClass}`} />
                                    {idx < steps.length - 1 ? (
                                      <div className={`h-[2px] flex-1 mx-2 ${lineClass}`} />
                                    ) : null}
                                  </div>
                                  <div className={`mt-2 text-[11px] font-medium truncate ${textClass}`}>{s.label}</div>
                                </div>
                              )
                            })}
                          </div>

                          {isCancelled ? (
                            <div className="mt-3 text-xs text-surface-500">
                              Bu atama iptal edildi.
                            </div>
                          ) : null}
                        </div>
                      )
                    })()}

                    <div className="text-xs text-surface-500">
                      Aktif: {kitDetail.isActive ? 'Evet' : 'Hayir'}
                    </div>

                    {kitDetail.description && kitDetail.description.trim() ? (
                      <div className="pt-3 border-t border-surface-200">
                        <p className="text-[11px] font-semibold text-surface-500">Aciklama</p>
                        <p className="text-[13px] mt-1 text-surface-700 leading-snug">{kitDetail.description}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 space-y-2">
                    <p className="text-sm font-semibold text-surface-900">Kit</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-surface-500">Barkod:</span> {kitDetail.kitBarcode ?? '—'}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-surface-500">Ad:</span> {kitDetail.kitName ?? '—'}
                      </div>
                      <div>
                        <span className="text-surface-500">Kit Aktif:</span>{' '}
                        {kitDetail.kitIsActive == null ? '—' : kitDetail.kitIsActive ? 'Evet' : 'Hayir'}
                      </div>
                      <div>
                        <span className="text-surface-500">Olusturma:</span>{' '}
                        {kitDetail.kitCreatedAt ? formatDateTime(kitDetail.kitCreatedAt) : '—'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 space-y-2">
                    <p className="text-sm font-semibold text-surface-900">Danisan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="sm:col-span-2">
                        <span className="text-surface-500">Ad Soyad:</span> {kitDetail.clientName ?? '—'}
                      </div>
                      <div>
                        <span className="text-surface-500">Telefon:</span> {kitDetail.clientPhone ?? '—'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-surface-500">E-posta:</span>{' '}
                        <span className="truncate inline-block max-w-full align-bottom">{kitDetail.clientEmail ?? '—'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-surface-500">Detay bulunamadi.</div>
            )}
          </ModalBody>

          <ModalFooter className="gap-2">
            <Button variant="outline" onClick={() => setKitDetailOpen(false)}>Kapat</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditTarget(null)
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Duzenle</ModalTitle>
            <ModalDescription>
              {editTarget?.clientName ? `${editTarget.clientName} icin kit islemleri` : 'Kit islemleri'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-surface-900">Kit</p>
                  <p className="text-xs text-surface-500">
                    {editTarget?.kitName
                      ? `${editTarget.kitName} • ${editTarget.kitBarcode ?? ''}`.trim()
                      : editTarget?.kitBarcode ?? '—'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-surface-800">Laboratuvara Gonder</p>
                  {editTarget?.status ? (
                    <Badge
                      variant={
                        editTarget.status === 'completed' || editTarget.status === 'delivered'
                          ? 'success'
                          : editTarget.status === 'cancelled'
                            ? 'danger'
                            : editTarget.status === 'in_laboratory'
                              ? 'warning'
                              : editTarget.status === 'in_expert'
                                ? 'info'
                                : 'primary'
                      }
                      size="sm"
                    >
                      {editTarget.status === 'in_client'
                        ? 'Danisanda'
                        : editTarget.status === 'in_laboratory'
                          ? 'Laboratuvarda'
                          : editTarget.status === 'in_expert'
                            ? 'Uzmanda'
                            : editTarget.status === 'delivered'
                              ? 'Teslim'
                              : editTarget.status === 'cancelled'
                                ? 'Iptal'
                                : editTarget.status === 'completed'
                                  ? 'Tamamlandi'
                                  : editTarget.status}
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">Durum yok</Badge>
                  )}
                </div>

                <div className="text-xs text-surface-500">
                  Bu islem, status'u <span className="font-medium">in_client</span> olan kitleri laboratuvar surecine tasir.
                </div>
              </CardContent>
            </Card>
          </ModalBody>

          <ModalFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={sendToLabMutation.isPending}>
              Vazgec
            </Button>
            <Button
              variant="primary"
              onClick={() => sendToLabMutation.mutate()}
              disabled={
                sendToLabMutation.isPending ||
                !editTarget?.assignmentId ||
                (editTarget?.status != null && editTarget.status !== 'in_client')
              }
            >
              {sendToLabMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gonderiliyor...
                </>
              ) : (
                'Laboratuvara Gonder'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
