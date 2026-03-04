import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Users, MapPin, Phone, Mail,
  Download, X,
} from 'lucide-react'
import type { Laboratory } from '@/types/laboratory.types'
import { toast } from 'sonner'
import { useLaboratoriesStore } from '@/stores/laboratories.store'
import { useUsersStore } from '@/stores/users.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'

export function LaboratoriesPage() {
  const [search, setSearch] = useState('')
  const [newLabOpen, setNewLabOpen] = useState(false)
  const [editLabOpen, setEditLabOpen] = useState(false)
  const [assignDietitianOpen, setAssignDietitianOpen] = useState(false)
  const [deleteLabOpen, setDeleteLabOpen] = useState(false)
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null)
  const [newLabForm, setNewLabForm] = useState({
    name: '',
    address: '',
    city: '',
    district: '',
    postalCode: '',
    phone: '',
    email: '',
  })
  const [selectedDietitianId, setSelectedDietitianId] = useState<string>('')
  const {
    laboratories,
    createLaboratory,
    updateLaboratory,
    deleteLaboratory,
    assignDietitian,
    unassignDietitian,
  } = useLaboratoriesStore()
  const { users } = useUsersStore()

  const dietitians = useMemo(
    () => users.filter((u) => u.role === UserRole.DIETITIAN),
    [users]
  )

  const filteredLaboratories = useMemo(
    () =>
      laboratories.filter((lab) => {
        const q = search.toLowerCase()
        return (
          lab.name.toLowerCase().includes(q) ||
          lab.address.toLowerCase().includes(q) ||
          lab.city.toLowerCase().includes(q) ||
          lab.district?.toLowerCase().includes(q)
        )
      }),
    [laboratories, search]
  )

  const handleExportCsv = () => {
    const headers = ['Ad', 'Adres', 'Şehir', 'İlçe', 'Posta Kodu', 'Telefon', 'E-posta', 'Atanan Diyetisyenler', 'Oluşturulma Tarihi']
    const rows = filteredLaboratories.map((lab) => {
      const assignedNames = lab.assignedDietitians
        .map((id) => {
          const user = users.find((u) => u.id === id)
          return user ? `${user.firstName} ${user.lastName}` : ''
        })
        .filter(Boolean)
        .join('; ')
      return [
        lab.name,
        lab.address,
        lab.city,
        lab.district || '-',
        lab.postalCode || '-',
        lab.phone || '-',
        lab.email || '-',
        assignedNames || '-',
        formatDate(lab.createdAt),
      ]
    })
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `laboratuvarlar-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Laboratuvar listesi indirildi')
  }

  const resetNewLabForm = () => {
    setNewLabForm({
      name: '',
      address: '',
      city: '',
      district: '',
      postalCode: '',
      phone: '',
      email: '',
    })
  }

  const submitNewLab = () => {
    if (!newLabForm.name || !newLabForm.address || !newLabForm.city) {
      toast.error('Laboratuvar adı, adres ve şehir zorunludur.')
      return
    }
    const result = createLaboratory(newLabForm)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setNewLabOpen(false)
    resetNewLabForm()
  }

  const openEditLab = (lab: Laboratory) => {
    setSelectedLab(lab)
    setNewLabForm({
      name: lab.name,
      address: lab.address,
      city: lab.city,
      district: lab.district || '',
      postalCode: lab.postalCode || '',
      phone: lab.phone || '',
      email: lab.email || '',
    })
    setEditLabOpen(true)
  }

  const submitEditLab = () => {
    if (!selectedLab) return
    if (!newLabForm.name || !newLabForm.address || !newLabForm.city) {
      toast.error('Laboratuvar adı, adres ve şehir zorunludur.')
      return
    }
    const result = updateLaboratory(selectedLab.id, newLabForm)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setEditLabOpen(false)
    setSelectedLab(null)
    resetNewLabForm()
  }

  const openAssignDietitian = (lab: Laboratory) => {
    setSelectedLab(lab)
    setSelectedDietitianId('')
    setAssignDietitianOpen(true)
  }

  const submitAssignDietitian = () => {
    if (!selectedLab || !selectedDietitianId) {
      toast.error('Lütfen bir diyetisyen seçin.')
      return
    }
    const result = assignDietitian(selectedLab.id, selectedDietitianId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setAssignDietitianOpen(false)
    setSelectedLab(null)
    setSelectedDietitianId('')
  }

  const handleUnassignDietitian = (labId: string, dietitianId: string) => {
    const result = unassignDietitian(labId, dietitianId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
  }

  const openDeleteLab = (lab: Laboratory) => {
    setSelectedLab(lab)
    setDeleteLabOpen(true)
  }

  const submitDeleteLab = () => {
    if (!selectedLab) return
    const result = deleteLaboratory(selectedLab.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setDeleteLabOpen(false)
    setSelectedLab(null)
  }

  const availableDietitians = useMemo(() => {
    if (!selectedLab) return dietitians
    return dietitians.filter((d) => !selectedLab.assignedDietitians.includes(d.id))
  }, [dietitians, selectedLab])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Laboratuvarlar</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Laboratuvar ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="icon" onClick={handleExportCsv}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="primary" onClick={() => setNewLabOpen(true)}>
                <Plus className="h-4 w-4" />
                Yeni Laboratuvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LaboratoryTable
            laboratories={filteredLaboratories}
            users={users}
            onEdit={openEditLab}
            onDelete={openDeleteLab}
            onAssignDietitian={openAssignDietitian}
          />
        </CardContent>
      </Card>

      {/* Create Laboratory Modal */}
      <Modal open={newLabOpen} onOpenChange={setNewLabOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Laboratuvar Ekle</ModalTitle>
            <ModalDescription>Yeni laboratuvar bilgilerini girin. Adres bilgisi çok önemlidir.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="Laboratuvar Adı *"
              value={newLabForm.name}
              onChange={(e) => setNewLabForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Örn: OmegaTree Merkez Laboratuvar"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Şehir *"
                value={newLabForm.city}
                onChange={(e) => setNewLabForm((s) => ({ ...s, city: e.target.value }))}
                placeholder="Örn: Ankara"
              />
              <Input
                label="İlçe"
                value={newLabForm.district}
                onChange={(e) => setNewLabForm((s) => ({ ...s, district: e.target.value }))}
                placeholder="Örn: Çankaya"
              />
            </div>
            <Input
              label="Adres *"
              value={newLabForm.address}
              onChange={(e) => setNewLabForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Örn: Atatürk Bulvarı No:123"
              className="font-medium"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Posta Kodu"
                value={newLabForm.postalCode}
                onChange={(e) => setNewLabForm((s) => ({ ...s, postalCode: e.target.value }))}
                placeholder="Örn: 06100"
              />
              <Input
                label="Telefon"
                value={newLabForm.phone}
                onChange={(e) => setNewLabForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="Örn: 03121234567"
              />
            </div>
            <Input
              label="E-posta"
              type="email"
              value={newLabForm.email}
              onChange={(e) => setNewLabForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="Örn: lab@omegatree.com"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewLabOpen(false); resetNewLabForm() }}>
              İptal
            </Button>
            <Button onClick={submitNewLab}>Laboratuvar Oluştur</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Laboratory Modal */}
      <Modal open={editLabOpen} onOpenChange={setEditLabOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Laboratuvar Düzenle</ModalTitle>
            <ModalDescription>Laboratuvar bilgilerini güncelleyin. Adres bilgisi çok önemlidir.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="Laboratuvar Adı *"
              value={newLabForm.name}
              onChange={(e) => setNewLabForm((s) => ({ ...s, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Şehir *"
                value={newLabForm.city}
                onChange={(e) => setNewLabForm((s) => ({ ...s, city: e.target.value }))}
              />
              <Input
                label="İlçe"
                value={newLabForm.district}
                onChange={(e) => setNewLabForm((s) => ({ ...s, district: e.target.value }))}
              />
            </div>
            <Input
              label="Adres *"
              value={newLabForm.address}
              onChange={(e) => setNewLabForm((s) => ({ ...s, address: e.target.value }))}
              className="font-medium"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Posta Kodu"
                value={newLabForm.postalCode}
                onChange={(e) => setNewLabForm((s) => ({ ...s, postalCode: e.target.value }))}
              />
              <Input
                label="Telefon"
                value={newLabForm.phone}
                onChange={(e) => setNewLabForm((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <Input
              label="E-posta"
              type="email"
              value={newLabForm.email}
              onChange={(e) => setNewLabForm((s) => ({ ...s, email: e.target.value }))}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setEditLabOpen(false); setSelectedLab(null); resetNewLabForm() }}>
              İptal
            </Button>
            <Button onClick={submitEditLab}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign Dietitian Modal */}
      <Modal open={assignDietitianOpen} onOpenChange={setAssignDietitianOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Diyetisyen Ata</ModalTitle>
            <ModalDescription>
              {selectedLab && `${selectedLab.name} laboratuvarına diyetisyen atayın`}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Select value={selectedDietitianId} onValueChange={setSelectedDietitianId}>
              <SelectTrigger>
                <SelectValue placeholder="Diyetisyen seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableDietitians.length === 0 ? (
                  <div className="p-2 text-sm text-surface-500">Tüm diyetisyenler atanmış</div>
                ) : (
                  availableDietitians.map((dietitian) => (
                    <SelectItem key={dietitian.id} value={dietitian.id}>
                      {dietitian.firstName} {dietitian.lastName} ({dietitian.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedLab && selectedLab.assignedDietitians.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-surface-700 mb-2">Atanan Diyetisyenler:</p>
                <div className="space-y-2">
                  {selectedLab.assignedDietitians.map((dietitianId) => {
                    const dietitian = users.find((u) => u.id === dietitianId)
                    if (!dietitian) return null
                    return (
                      <div
                        key={dietitianId}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-50"
                      >
                        <span className="text-sm">
                          {dietitian.firstName} {dietitian.lastName}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleUnassignDietitian(selectedLab.id, dietitianId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setAssignDietitianOpen(false); setSelectedLab(null); setSelectedDietitianId('') }}>
              İptal
            </Button>
            <Button onClick={submitAssignDietitian} disabled={!selectedDietitianId || availableDietitians.length === 0}>
              Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Laboratory Modal */}
      <Modal open={deleteLabOpen} onOpenChange={setDeleteLabOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Laboratuvar Sil</ModalTitle>
            <ModalDescription>
              {selectedLab && `"${selectedLab.name}" laboratuvarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDeleteLabOpen(false); setSelectedLab(null) }}>
              İptal
            </Button>
            <Button variant="destructive" onClick={submitDeleteLab}>
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function LaboratoryTable({
  laboratories,
  users,
  onEdit,
  onDelete,
  onAssignDietitian,
}: {
  laboratories: Laboratory[]
  users: any[]
  onEdit: (lab: Laboratory) => void
  onDelete: (lab: Laboratory) => void
  onAssignDietitian: (lab: Laboratory) => void
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginatedLabs = useMemo(
    () => laboratories.slice((page - 1) * pageSize, page * pageSize),
    [laboratories, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [laboratories.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(laboratories.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [laboratories.length, page, pageSize])

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Laboratuvar</TableHead>
            <TableHead>Adres</TableHead>
            <TableHead>İletişim</TableHead>
            <TableHead>Atanan Diyetisyenler</TableHead>
            <TableHead>Oluşturulma</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {laboratories.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                Laboratuvar bulunamadı.
              </TableCell>
            </TableRow>
          )}
          {paginatedLabs.map((lab) => {
              const assignedDietitians = lab.assignedDietitians
                .map((id) => users.find((u) => u.id === id))
                .filter(Boolean)
              return (
                <TableRow key={lab.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-surface-800">{lab.name}</p>
                      <p className="text-xs text-surface-400">
                        {lab.city}
                        {lab.district && `, ${lab.district}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-surface-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-surface-700">{lab.address}</p>
                        {lab.postalCode && (
                          <p className="text-xs text-surface-400">PK: {lab.postalCode}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lab.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-surface-600">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{lab.phone}</span>
                        </div>
                      )}
                      {lab.email && (
                        <div className="flex items-center gap-1.5 text-sm text-surface-600">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{lab.email}</span>
                        </div>
                      )}
                      {!lab.phone && !lab.email && (
                        <span className="text-xs text-surface-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {assignedDietitians.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedDietitians.slice(0, 2).map((dietitian: any) => (
                          <Badge key={dietitian.id} variant="outline" className="text-xs">
                            {dietitian.firstName} {dietitian.lastName}
                          </Badge>
                        ))}
                        {assignedDietitians.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{assignedDietitians.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-surface-400">Atanmamış</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-surface-500">{formatDate(lab.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAssignDietitian(lab)}>
                          <Users className="h-4 w-4 mr-2" /> Diyetisyen Ata
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(lab)}>
                          <Edit className="h-4 w-4 mr-2" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-danger"
                          onClick={() => onDelete(lab)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
      <TablePagination
        totalItems={laboratories.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next)
          setPage(1)
        }}
      />
    </>
  )
}

