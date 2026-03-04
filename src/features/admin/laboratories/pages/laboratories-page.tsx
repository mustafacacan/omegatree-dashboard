import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Badge,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Users, MapPin, Phone, Mail,
  Download, X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { Laboratory } from '@/types/laboratory.types'
import { toast } from 'sonner'
import { useLaboratoriesStore } from '@/stores/laboratories.store'
import { useUsersStore } from '@/stores/users.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

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

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Laboratuvarlar</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Kayitli laboratuvarlar ({filteredLaboratories.length} adet)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                <input
                  type="text"
                  placeholder="Laboratuvar ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="primary" size="sm" onClick={() => setNewLabOpen(true)}>
                <Plus className="h-4 w-4" />
                Yeni Laboratuvar
              </Button>
            </div>
          </div>
          <LaboratoryTable
            laboratories={filteredLaboratories}
            users={users}
            onEdit={openEditLab}
            onDelete={openDeleteLab}
            onAssignDietitian={openAssignDietitian}
            W={W}
          />
        </div>
      </motion.div>

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
  W,
}: {
  laboratories: Laboratory[]
  users: any[]
  onEdit: (lab: Laboratory) => void
  onDelete: (lab: Laboratory) => void
  onAssignDietitian: (lab: Laboratory) => void
  W: typeof W
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: W.cream }}>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Laboratuvar</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Adres</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Iletisim</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Atanan Diyetisyenler</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Olusturulma</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20" style={{ color: W.textLight }} />
            </tr>
          </thead>
          <tbody>
            {laboratories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[12px]" style={{ color: W.textLight }}>
                  Laboratuvar bulunamadi.
                </td>
              </tr>
            ) : (
              paginatedLabs.map((lab) => {
                const assignedDietitians = lab.assignedDietitians
                  .map((id) => users.find((u) => u.id === id))
                  .filter(Boolean)
                return (
                  <tr
                    key={lab.id}
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-[12px] block font-medium" style={{ color: W.text }}>{lab.name}</span>
                        <span className="text-[11px]" style={{ color: W.textLight }}>
                          {lab.city}
                          {lab.district && `, ${lab.district}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: W.warmGrayLight }} />
                        <div className="min-w-0">
                          <span className="text-[12px] block" style={{ color: W.text }}>{lab.address}</span>
                          {lab.postalCode && (
                            <span className="text-[11px]" style={{ color: W.textLight }}>PK: {lab.postalCode}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        {lab.phone && (
                          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: W.text }}>
                            <Phone className="h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                            <span>{lab.phone}</span>
                          </div>
                        )}
                        {lab.email && (
                          <div className="flex items-center gap-1.5 text-[12px] truncate" style={{ color: W.text }}>
                            <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: W.warmGrayLight }} />
                            <span className="truncate">{lab.email}</span>
                          </div>
                        )}
                        {!lab.phone && !lab.email && (
                          <span className="text-[11px]" style={{ color: W.textLight }}>-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {assignedDietitians.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedDietitians.slice(0, 2).map((dietitian: any) => (
                            <span
                              key={dietitian.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                              style={{ background: W.creamDark, color: W.text }}
                            >
                              {dietitian.firstName} {dietitian.lastName}
                            </span>
                          ))}
                          {assignedDietitians.length > 2 && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                              style={{ background: W.creamDark, color: W.text }}
                            >
                              +{assignedDietitians.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px]" style={{ color: W.textLight }}>Atanmamis</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px]" style={{ color: W.textLight }}>{formatDate(lab.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5">
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
                            <Edit className="h-4 w-4 mr-2" /> Duzenle
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
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
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

