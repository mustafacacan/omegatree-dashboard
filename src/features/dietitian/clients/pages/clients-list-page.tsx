import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, CardHeader, CardTitle, Button, Input, Badge, Avatar,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { 
  Search, Plus, MoreHorizontal, Eye, FlaskConical, FileText, Phone, 
  Mail, Calendar, Package, X, Edit3, Boxes, Download, Share2,
  Truck, User, Loader2,
} from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { TablePagination } from '@/components/shared/table-pagination'
import { useClientsStore } from '@/stores/clients.store'
import type { ClientRecord } from '@/stores/clients.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'
import { ROUTES, danisanDetayPath, danisanDuzenlePath } from '@/utils/routes'
import { toast } from 'sonner'
import { getDieticianClientKits, type DieticianClientKit } from '@/services/dietician-client-kits.service'

export function ClientsListPage() {
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [clientKits, setClientKits] = useState<DieticianClientKit[]>([])
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { clients, loading, fetchClients, fetchDieticianClients } = useClientsStore()

  useEffect(() => {
    if (currentUser?.id) {
      fetchDieticianClients(currentUser.id).catch(() => {
        fetchClients().catch(() => {})
      })
    } else {
      fetchClients().catch(() => {})
    }
    getDieticianClientKits().then(setClientKits).catch(() => {})
  }, [currentUser?.id])

  const filtered = useMemo(
    () =>
      clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
      ),
    [clients, search]
  )
  const paginatedClients = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filtered.length, page, pageSize])

  const openClientModal = (client: ClientRecord) => {
    setSelectedClient(client)
    setModalOpen(true)
  }

  const selectedClientKits = useMemo(
    () => selectedClient ? clientKits.filter((k) => String(k.clientId) === selectedClient.id) : [],
    [selectedClient, clientKits]
  )

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        <span className="ml-2 text-sm text-surface-500">Danışanlar yükleniyor...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200">
        <div className="p-6 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <Input
            placeholder="Ad veya ID ile ara..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80"
          />
          <div className="flex items-center gap-2">
            <p className="text-sm text-surface-500">{filtered.length} danisan</p>
            <Link to={ROUTES.DIYETISYEN_DANISANLAR_YENI}>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                Danisan Ekle
              </Button>
            </Link>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Danisan</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Iletisim</TableHead>
                <TableHead>Kit Sayisi</TableHead>
                <TableHead>Aktif Kit</TableHead>
                <TableHead>Kayit Tarihi</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="text-sm font-medium text-surface-700 mb-1">Eslesen danisan bulunamadi</p>
                      <p className="text-xs text-surface-500">Arama metnini degistirerek tekrar deneyin.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paginatedClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-surface-50/70 transition-colors"
                  onClick={() => openClientModal(client)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3 group/name">
                      <Avatar name={client.name} size="sm" />
                      <span className="font-medium text-surface-800 group-hover/name:text-primary-600 transition-colors">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-surface-50 px-2 py-0.5 rounded">{client.id}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-xs text-surface-500">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.kitCount} Kit</Badge>
                  </TableCell>
                  <TableCell>
                    {client.activeKit ? (
                      <StatusBadge status={client.activeKit} size="sm" />
                    ) : (
                      <span className="text-xs text-surface-400">Kit yok</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-surface-500">{formatDate(client.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openClientModal(client)}><Eye className="h-4 w-4 mr-2" /> Profil</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(danisanDetayPath(client.id))}><FlaskConical className="h-4 w-4 mr-2" /> Kit Ata</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(ROUTES.DIYETISYEN_RAPORLAR)}><FileText className="h-4 w-4 mr-2" /> Raporlar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      {/* ═══ DANISAN DETAY MODAL ═══ */}
      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedClient(null)
        }}
      >
        <ModalContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              <ModalHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={selectedClient.name} size="lg" />
                    <div>
                      <ModalTitle className="text-2xl">{selectedClient.name}</ModalTitle>
                      <ModalDescription>
                        <code className="font-mono text-sm font-semibold">{selectedClient.id}</code>
                        <Badge variant="success" size="sm" className="ml-2">Aktif</Badge>
                      </ModalDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(danisanDuzenlePath(selectedClient.id))}
                  >
                    <Edit3 className="h-4 w-4" /> Duzenle
                  </Button>
                </div>
              </ModalHeader>

              <ModalBody>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:bg-transparent">
                      Genel Bakis
                    </TabsTrigger>
                    <TabsTrigger value="kits" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:bg-transparent">
                      Kitler
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:bg-transparent">
                      Raporlar
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:bg-transparent">
                      Aktiviteler
                    </TabsTrigger>
                  </TabsList>

                  {/* ═══ GENEL BAKIS ═══ */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Iletisim Bilgileri</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                            <Phone className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs text-surface-500">Telefon</p>
                            <p className="text-sm font-semibold text-surface-900">{selectedClient.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-surface-500">E-posta</p>
                            <p className="text-sm font-semibold text-surface-900">{selectedClient.email || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-surface-500">Kayit Tarihi</p>
                            <p className="text-sm font-semibold text-surface-900">{formatDate(selectedClient.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Package className="h-5 w-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="text-xs text-surface-500">Toplam Kit</p>
                            <p className="text-sm font-semibold text-surface-900">{selectedClient.kitCount} Adet</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Aktif Kit Durumu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedClient.activeKit ? (
                          <div className="flex items-center justify-between p-4 rounded-lg bg-primary-50 border border-primary-200">
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-primary-600" />
                              <div>
                                <p className="text-sm font-semibold text-primary-900">Aktif Kit Mevcut</p>
                                <p className="text-xs text-primary-700">Durum izleniyor</p>
                              </div>
                            </div>
                            <StatusBadge status={selectedClient.activeKit} />
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Package className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-surface-600 mb-1">Aktif kit yok</p>
                            <p className="text-xs text-surface-400">Yeni kit atayabilirsiniz</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ═══ KITLER ═══ */}
                  <TabsContent value="kits" className="space-y-4 mt-4">
                    {selectedClientKits.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Package className="h-10 w-10 text-surface-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-surface-600 mb-1">Kit bulunamadi</p>
                          <p className="text-xs text-surface-400">Bu danisana henuz kit atanmamis</p>
                        </CardContent>
                      </Card>
                    ) : (
                      selectedClientKits.map((kit) => (
                        <Card key={kit.id}>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-sm font-semibold text-surface-900">{kit.kitName || 'Kit'}</h3>
                                  <Badge variant={kit.status === 'completed' ? 'success' : kit.status === 'cancelled' ? 'destructive' : 'primary'} size="sm">
                                    {kit.status ?? 'Bilinmiyor'}
                                  </Badge>
                                </div>
                                <code className="text-xs font-mono bg-surface-50 px-2 py-0.5 rounded">{kit.kitBarcode || `#${kit.kitId}`}</code>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-surface-500">Atanma</p>
                                <p className="font-medium text-surface-900">{kit.createdAt ? formatDate(kit.createdAt) : '—'}</p>
                              </div>
                              <div>
                                <p className="text-surface-500">Guncelleme</p>
                                <p className="font-medium text-surface-900">{kit.updatedAt ? formatDate(kit.updatedAt) : '—'}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* ═══ RAPORLAR ═══ */}
                  <TabsContent value="reports" className="space-y-4 mt-4">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <FileText className="h-10 w-10 text-surface-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-surface-600 mb-1">Raporlar API'den yuklenecek</p>
                        <p className="text-xs text-surface-400">Analiz tamamlandiginda raporlar burada gorunecek</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ═══ AKTIVITELER ═══ */}
                  <TabsContent value="activity" className="mt-4">
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Calendar className="h-10 w-10 text-surface-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-surface-600 mb-1">Aktivite gecmisi</p>
                        <p className="text-xs text-surface-400">Aktivite verileri API'den yuklenecek</p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </ModalBody>

              <ModalFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  <X className="h-4 w-4" /> Kapat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false)
                    if (selectedClient) navigate(danisanDetayPath(selectedClient.id))
                  }}
                >
                  <Boxes className="h-4 w-4" /> Kit Ata
                </Button>
                <Button variant="primary" onClick={() => navigate(danisanDuzenlePath(selectedClient.id))}>
                  <Edit3 className="h-4 w-4" /> Duzenle
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
