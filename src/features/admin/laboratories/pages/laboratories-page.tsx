import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Users, MapPin, Phone, Mail,
  Download, Loader2, Eye, TestTubes,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { Laboratory } from '@/types/laboratory.types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  getLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  getLabDietitianAssignments,
  assignDietitianToLab,
} from '@/services/laboratories.service'
import { getDieticians } from '@/services/kits.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const LABS_QUERY_KEY = ['laboratories'] as const
const LAB_DIETITIANS_KEY = ['laboratory-dietitians'] as const
const DIETICIANS_KEY = ['dieticians'] as const
const labDetailQueryKey = (id: string) => ['laboratories', id, 'detail'] as const

export function LaboratoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [newLabOpen, setNewLabOpen] = useState(false)
  const [editLabOpen, setEditLabOpen] = useState(false)
  const [assignDietitianOpen, setAssignDietitianOpen] = useState(false)
  const [deleteLabOpen, setDeleteLabOpen] = useState(false)
  const [viewLabOpen, setViewLabOpen] = useState(false)
  const [viewLabId, setViewLabId] = useState<string>('')
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null)
  const [selectedDietitianId, setSelectedDietitianId] = useState<string>('')

  const [newLabForm, setNewLabForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    gender: 'male' as 'male' | 'female',
    cargofirm: '',
    cargoNumber: '',
    city: '',
    district: '',
    street: '',
    neighborhood: '',
    no: '',
    fullAddress: '',
    postalCode: '',
    country: 'Turkiye',
    addressTitle: 'work' as string,
  })

  const { data: laboratories = [], isLoading, isError: labsError } = useQuery({
    queryKey: LABS_QUERY_KEY,
    queryFn: () => getLaboratories(),
    retry: 1,
  })

  const { data: labDietitianAssignments = [] } = useQuery({
    queryKey: LAB_DIETITIANS_KEY,
    queryFn: getLabDietitianAssignments,
    retry: 1,
  })

  const { data: dieticians = [] } = useQuery({
    queryKey: DIETICIANS_KEY,
    queryFn: getDieticians,
  })

  const labDetailQuery = useQuery({
    queryKey: labDetailQueryKey(viewLabId || '0'),
    queryFn: () => getLaboratoryById(viewLabId),
    enabled: viewLabOpen && !!viewLabId,
    retry: 1,
  })

  const labsWithDietitians = useMemo(() => {
    const assignmentsByLabId = new Map<string, { dieticianId: number; name: string }[]>()
    for (const assignment of labDietitianAssignments) {
      const labId = String(assignment.laboratory?.id ?? '')
      if (!labId) continue
      const dietician = assignment.dietician
      const dieticianUser = dietician?.user
      const name = [dieticianUser?.firstName, dieticianUser?.lastName].filter(Boolean).join(' ') || `Diyetisyen #${dietician?.id ?? ''}`
      const list = assignmentsByLabId.get(labId) ?? []
      list.push({ dieticianId: dietician?.id ?? 0, name })
      assignmentsByLabId.set(labId, list)
    }
    return laboratories.map((lab) => ({
      ...lab,
      assignedDietitianDetails: assignmentsByLabId.get(lab.id) ?? [],
    }))
  }, [laboratories, labDietitianAssignments])

  const viewedLabDietitians = useMemo(() => {
    const id = String(viewLabId || '')
    if (!id) return [] as { dieticianId: number; name: string }[]
    const list: { dieticianId: number; name: string }[] = []
    for (const assignment of labDietitianAssignments) {
      const labId = String(assignment.laboratory?.id ?? '')
      if (!labId || labId !== id) continue
      const dietician = assignment.dietician
      const dieticianUser = dietician?.user
      const name = [dieticianUser?.firstName, dieticianUser?.lastName].filter(Boolean).join(' ') || `Diyetisyen #${dietician?.id ?? ''}`
      list.push({ dieticianId: dietician?.id ?? 0, name })
    }
    return list
  }, [labDietitianAssignments, viewLabId])

  const filteredLaboratories = useMemo(
    () =>
      labsWithDietitians.filter((lab) => {
        const q = search.toLowerCase()
        return (
          lab.name.toLowerCase().includes(q) ||
          lab.address.toLowerCase().includes(q) ||
          lab.city.toLowerCase().includes(q) ||
          lab.district?.toLowerCase().includes(q)
        )
      }),
    [labsWithDietitians, search]
  )

  const createMutation = useMutation({
    mutationFn: createLaboratory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABS_QUERY_KEY })
      toast.success('Laboratuvar başarıyla oluşturuldu')
      setNewLabOpen(false)
      resetNewLabForm()
    },
    onError: (err: unknown) => {
      console.error('[createLaboratory] error:', err)
      const axErr = err as { response?: { status?: number; data?: unknown }; message?: string }
      if (axErr.response) {
        console.error('[createLaboratory] status:', axErr.response.status, 'data:', axErr.response.data)
      }
      toast.error(getApiErrorMessage(err, { fallback: 'Laboratuvar oluşturulamadı' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { cargofirm?: string; cargoNumber?: string } }) =>
      updateLaboratory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABS_QUERY_KEY })
      toast.success('Laboratuvar güncellendi')
      setEditLabOpen(false)
      setSelectedLab(null)
      resetNewLabForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Laboratuvar güncellenemedi' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLaboratory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABS_QUERY_KEY })
      toast.success('Laboratuvar silindi')
      setDeleteLabOpen(false)
      setSelectedLab(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Laboratuvar silinemedi' }))
    },
  })

  const assignDietitianMutation = useMutation({
    mutationFn: ({ laboratoryId, dieticianId }: { laboratoryId: number; dieticianId: number }) =>
      assignDietitianToLab(laboratoryId, dieticianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LAB_DIETITIANS_KEY })
      toast.success('Diyetisyen laboratuvara atandı')
      setAssignDietitianOpen(false)
      setSelectedLab(null)
      setSelectedDietitianId('')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Diyetisyen ataması başarısız' }))
    },
  })

  const resetNewLabForm = () => {
    setNewLabForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      gender: 'male',
      cargofirm: '',
      cargoNumber: '',
      city: '',
      district: '',
      street: '',
      neighborhood: '',
      no: '',
      fullAddress: '',
      postalCode: '',
      country: 'Turkiye',
      addressTitle: 'work',
    })
  }

  const submitNewLab = () => {
    if (!newLabForm.firstName.trim() || !newLabForm.lastName.trim()) {
      toast.error('Lab sorumlusu adı ve soyadı zorunludur')
      return
    }
    const phoneDigits = newLabForm.phone.replace(/\D/g, '')
    if (!phoneDigits) {
      toast.error('Telefon numarası zorunludur')
      return
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error('Telefon numarası 10 veya 11 haneli olmalıdır (örn: 05551234567)')
      return
    }
    if (!newLabForm.city.trim() || !newLabForm.district.trim()) {
      toast.error('Şehir ve ilçe zorunludur')
      return
    }
    if (!newLabForm.cargofirm.trim() || !newLabForm.cargoNumber.trim()) {
      toast.error('Kargo firması ve kargo numarası zorunludur')
      return
    }

    const streetVal = newLabForm.street.trim() || '-'
    const neighborhoodVal = newLabForm.neighborhood.trim() || '-'
    const noVal = newLabForm.no.trim()
    const cityVal = newLabForm.city.trim()
    const districtVal = newLabForm.district.trim()
    const countryVal = newLabForm.country.trim() || 'Turkiye'
    const autoFull = newLabForm.fullAddress.trim() ||
      [streetVal !== '-' ? streetVal : null, noVal ? `No:${noVal}` : null, neighborhoodVal !== '-' ? neighborhoodVal : null, districtVal, cityVal, countryVal]
        .filter(Boolean)
        .join(', ')

    createMutation.mutate({
      firstName: newLabForm.firstName.trim(),
      lastName: newLabForm.lastName.trim(),
      phone: phoneDigits,
      gender: newLabForm.gender,
      email: newLabForm.email.trim() || undefined,
      cargofirm: newLabForm.cargofirm.trim(),
      cargoNumber: newLabForm.cargoNumber.trim(),
      address: {
        title: newLabForm.addressTitle || 'work',
        country: countryVal,
        city: cityVal,
        district: districtVal,
        street: streetVal,
        neighborhood: neighborhoodVal,
        no: noVal || undefined,
        fullAddress: autoFull || undefined,
        postalCode: newLabForm.postalCode.trim() || '00000',
      },
    })
  }

  const openEditLab = (lab: Laboratory) => {
    setSelectedLab(lab)
    setNewLabForm((prev) => ({
      ...prev,
      cargofirm: lab.cargofirm ?? '',
      cargoNumber: lab.cargoNumber ?? '',
    }))
    setEditLabOpen(true)
  }

  const submitEditLab = () => {
    if (!selectedLab) return
    updateMutation.mutate({
      id: selectedLab.id,
      payload: {
        cargofirm: newLabForm.cargofirm.trim() || undefined,
        cargoNumber: newLabForm.cargoNumber.trim() || undefined,
      },
    })
  }

  const openAssignDietitian = (lab: Laboratory) => {
    setSelectedLab(lab)
    setSelectedDietitianId('')
    setAssignDietitianOpen(true)
  }

  const submitAssignDietitian = () => {
    if (!selectedLab || !selectedDietitianId) {
      toast.error('Lütfen bir diyetisyen seçin')
      return
    }
    assignDietitianMutation.mutate({
      laboratoryId: Number(selectedLab.id),
      dieticianId: Number(selectedDietitianId),
    })
  }

  const openDeleteLab = (lab: Laboratory) => {
    setSelectedLab(lab)
    setDeleteLabOpen(true)
  }

  const openViewLab = (lab: Laboratory) => {
    setViewLabId(lab.id)
    setViewLabOpen(true)
  }

  const submitDeleteLab = () => {
    if (!selectedLab) return
    deleteMutation.mutate(selectedLab.id)
  }

  const selectedLabDietitians = useMemo(() => {
    if (!selectedLab) return []
    const labData = labsWithDietitians.find((l) => l.id === selectedLab.id)
    return labData?.assignedDietitianDetails ?? []
  }, [selectedLab, labsWithDietitians])

  const availableDietitians = useMemo(() => {
    const assignedIds = new Set(selectedLabDietitians.map((d) => d.dieticianId))
    return dieticians.filter((d) => !assignedIds.has(d.id))
  }, [dieticians, selectedLabDietitians])

  const handleExportCsv = () => {
    const headers = ['Ad', 'Adres', 'Şehir', 'İlçe', 'Telefon', 'E-posta', 'Kargo Firması', 'Atanan Diyetisyenler', 'Oluşturulma Tarihi']
    const rows = filteredLaboratories.map((lab) => {
      const assignedNames = lab.assignedDietitianDetails.map((d) => d.name).join('; ')
      return [
        lab.name,
        lab.address,
        lab.city,
        lab.district || '-',
        lab.phone || '-',
        lab.email || '-',
        lab.cargofirm || '-',
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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Laboratuvarlar</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                {isLoading ? 'Yükleniyor...' : `Kayıtlı laboratuvarlar (${filteredLaboratories.length} adet)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Laboratuvar ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
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

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : labsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-surface-700">Laboratuvarlar yüklenirken sunucu hatası oluştu (500).</p>
              <p className="text-xs text-surface-500">Backend servisi kontrol edin. Veritabanı bağlantısı veya tablo şeması sorunu olabilir.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: LABS_QUERY_KEY })}>
                Tekrar Dene
              </Button>
            </div>
          ) : (
            <LaboratoryTable
              laboratories={filteredLaboratories}
              onView={openViewLab}
              onEdit={openEditLab}
              onDelete={openDeleteLab}
              onAssignDietitian={openAssignDietitian}
            />
          )}
        </div>
      </motion.div>

      {/* ── View Laboratory Modal ── */}
      <Modal
        open={viewLabOpen}
        onOpenChange={(open) => {
          setViewLabOpen(open)
          if (!open) setViewLabId('')
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Laboratuvar Detayı</ModalTitle>
            <ModalDescription>
              {labDetailQuery.data?.name || 'Laboratuvar bilgileri görüntüleniyor.'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {labDetailQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : labDetailQuery.isError ? (
              <div className="space-y-3 py-4">
                <p className="text-sm text-surface-700">
                  {getApiErrorMessage(labDetailQuery.error, { fallback: 'Laboratuvar detayı yüklenemedi' })}
                </p>
                <Button variant="outline" size="sm" onClick={() => labDetailQuery.refetch()}>
                  Tekrar Dene
                </Button>
              </div>
            ) : labDetailQuery.data ? (
              <div className="space-y-5">
                {/* Hero kart: Avatar + isim + il/ilçe */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-200/40 border border-surface-200">
                  <Avatar
                    name={labDetailQuery.data.name || 'Laboratuvar'}
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900 dark:text-surface-100">
                      {labDetailQuery.data.name || 'Laboratuvar'}
                    </p>
                    <p className="text-sm text-surface-500 mt-0.5">
                      {[labDetailQuery.data.city, labDetailQuery.data.district].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>

                {/* İletişim */}
                <div>
                  <p className="form-section-title mb-2">İletişim</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-surface-200 dark:border-surface-300/50 p-3 bg-surface-50/50 dark:bg-surface-200/20">
                      <p className="text-surface-500 text-xs font-medium mb-1">Telefon</p>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                        {labDetailQuery.data.phone || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-300/50 p-3 bg-surface-50/50 dark:bg-surface-200/20">
                      <p className="text-surface-500 text-xs font-medium mb-1">E-posta</p>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate" title={labDetailQuery.data.email || undefined}>
                        {labDetailQuery.data.email || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Kargo */}
                <div>
                  <p className="form-section-title mb-2">Kargo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-surface-200 dark:border-surface-300/50 p-3 bg-surface-50/50 dark:bg-surface-200/20">
                      <p className="text-surface-500 text-xs font-medium mb-1">Kargo Firması</p>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {labDetailQuery.data.cargofirm || '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-300/50 p-3 bg-surface-50/50 dark:bg-surface-200/20">
                      <p className="text-surface-500 text-xs font-medium mb-1">Kargo No</p>
                      <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {labDetailQuery.data.cargoNumber || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Adres */}
                <div>
                  <p className="form-section-title mb-2">Adres</p>
                  <div className="rounded-lg border border-surface-200 dark:border-surface-300/50 p-3 bg-surface-50/50 dark:bg-surface-200/20 flex gap-2">
                    <MapPin className="h-4 w-4 text-surface-400 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 leading-relaxed">
                      {labDetailQuery.data.fullAddress || labDetailQuery.data.address || [
                        labDetailQuery.data.street,
                        labDetailQuery.data.neighborhood,
                        labDetailQuery.data.no,
                        labDetailQuery.data.district,
                        labDetailQuery.data.city,
                      ].filter(Boolean).join(', ') || '—'}
                    </p>
                  </div>
                </div>

                {/* Bağlı Diyetisyenler */}
                <div>
                  <p className="form-section-title mb-2">Bağlı Diyetisyenler</p>
                  {viewedLabDietitians.length > 0 ? (
                    <ul className="space-y-2">
                      {viewedLabDietitians.map((d) => (
                        <li
                          key={d.dieticianId}
                          className="flex items-center gap-3 rounded-lg border border-surface-200 dark:border-surface-300/50 p-2.5 bg-surface-50/50 dark:bg-surface-200/20"
                        >
                          <Avatar name={d.name} size="sm" className="shrink-0" />
                          <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{d.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg border border-dashed border-surface-200 dark:border-surface-300/50 p-4 text-center">
                      <Users className="h-8 w-8 text-surface-300 dark:text-surface-500 mx-auto mb-1.5" />
                      <p className="text-sm text-surface-500">Atanmış diyetisyen yok</p>
                    </div>
                  )}
                </div>

                {/* Footer bilgi */}
                <div className="pt-1 border-t border-surface-200 dark:border-surface-300/50">
                  <p className="text-xs text-surface-500">
                    Sorumlu: {[labDetailQuery.data.firstName, labDetailQuery.data.lastName].filter(Boolean).join(' ') || '—'}
                    {labDetailQuery.data.createdAt && ` · Kayıt: ${formatDate(labDetailQuery.data.createdAt)}`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-500 py-4">Detay bulunamadı.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setViewLabOpen(false); setViewLabId('') }}>
              Kapat
            </Button>
            {labDetailQuery.data && (
              <Button
                variant="primary"
                onClick={() => {
                  const lab = labsWithDietitians.find((l) => l.id === viewLabId)
                  if (lab) {
                    setViewLabOpen(false)
                    setViewLabId('')
                    openEditLab(lab)
                  }
                }}
              >
                Düzenle
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Create Laboratory Modal ── */}
      <Modal open={newLabOpen} onOpenChange={setNewLabOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Laboratuvar Ekle</ModalTitle>
            <ModalDescription>Lab sorumlusu, kargo ve adres bilgilerini girin.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Lab Sorumlusu</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad"
                value={newLabForm.firstName}
                onChange={(e) => setNewLabForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="Lab sorumlusu adı"
              />
              <Input
                label="Soyad"
                value={newLabForm.lastName}
                onChange={(e) => setNewLabForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Lab sorumlusu soyadı"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefon"
                value={newLabForm.phone}
                onChange={(e) => setNewLabForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta"
                type="email"
                value={newLabForm.email}
                onChange={(e) => setNewLabForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="lab@ornek.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Cinsiyet</label>
              <Select value={newLabForm.gender} onValueChange={(v) => setNewLabForm((s) => ({ ...s, gender: v as 'male' | 'female' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkek</SelectItem>
                  <SelectItem value="female">Kadın</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="panel-section">
              <p className="form-section-title">Kargo Bilgileri</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Kargo Firması *"
                  value={newLabForm.cargofirm}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, cargofirm: e.target.value }))}
                  placeholder="Örn: Yurtiçi Kargo"
                />
                <Input
                  label="Kargo Numarası *"
                  value={newLabForm.cargoNumber}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, cargoNumber: e.target.value }))}
                  placeholder="Anlaşma numarası"
                />
              </div>
            </div>

            <div className="panel-section">
              <p className="form-section-title">Adres Bilgileri</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Şehir *"
                  value={newLabForm.city}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, city: e.target.value }))}
                  placeholder="Örn: İstanbul"
                />
                <Input
                  label="İlçe *"
                  value={newLabForm.district}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, district: e.target.value }))}
                  placeholder="Örn: Kadıköy"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  label="Sokak"
                  value={newLabForm.street}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, street: e.target.value }))}
                  placeholder="Sokak adı"
                />
                <Input
                  label="Mahalle"
                  value={newLabForm.neighborhood}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, neighborhood: e.target.value }))}
                  placeholder="Mahalle"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Input
                  label="Kapı No"
                  value={newLabForm.no}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, no: e.target.value }))}
                  placeholder="Örn: 10"
                />
                <Input
                  label="Posta Kodu"
                  value={newLabForm.postalCode}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, postalCode: e.target.value }))}
                  placeholder="Örn: 34710"
                />
                <Input
                  label="Ülke"
                  value={newLabForm.country}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, country: e.target.value }))}
                  placeholder="Turkiye"
                />
              </div>
              <div className="mt-3">
                <Input
                  label="Açık Adres"
                  value={newLabForm.fullAddress}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, fullAddress: e.target.value }))}
                  placeholder="Örn: Atatürk Sokak No:10, Moda, Kadıköy, İstanbul, Türkiye"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewLabOpen(false); resetNewLabForm() }}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitNewLab} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Laboratuvar Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Edit Laboratory Modal ── */}
      <Modal open={editLabOpen} onOpenChange={setEditLabOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Laboratuvar Düzenle</ModalTitle>
            <ModalDescription>
              {selectedLab && `${selectedLab.name} — kargo bilgilerini güncelleyin.`}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input
              label="Kargo Firması"
              value={newLabForm.cargofirm}
              onChange={(e) => setNewLabForm((s) => ({ ...s, cargofirm: e.target.value }))}
              placeholder="Kargo firması"
            />
            <Input
              label="Kargo Numarası"
              value={newLabForm.cargoNumber}
              onChange={(e) => setNewLabForm((s) => ({ ...s, cargoNumber: e.target.value }))}
              placeholder="Kargo anlaşma numarası"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setEditLabOpen(false); setSelectedLab(null); resetNewLabForm() }}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitEditLab} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Assign Dietitian Modal ── */}
      <Modal open={assignDietitianOpen} onOpenChange={setAssignDietitianOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Diyetisyen Ata</ModalTitle>
            <ModalDescription>
              {selectedLab && `${selectedLab.name} laboratuvarına diyetisyen atayın`}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Diyetisyen seçin</label>
              <Select value={selectedDietitianId} onValueChange={setSelectedDietitianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Diyetisyen seçin" />
                </SelectTrigger>
                <SelectContent>
                  {availableDietitians.length === 0 ? (
                    <div className="p-2 text-sm text-surface-500">Atanabilecek diyetisyen yok</div>
                  ) : (
                    availableDietitians.map((dietitian) => (
                      <SelectItem key={dietitian.id} value={String(dietitian.id)}>
                        {dietitian.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {selectedLabDietitians.length > 0 && (
              <div>
                <p className="form-section-title">Atanan Diyetisyenler</p>
                <div className="space-y-2">
                  {selectedLabDietitians.map((d) => (
                    <div
                      key={d.dieticianId}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-50 border border-surface-200"
                    >
                      <Users className="h-4 w-4 text-surface-400 shrink-0" />
                      <span className="text-sm text-surface-700">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setAssignDietitianOpen(false); setSelectedLab(null); setSelectedDietitianId('') }}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitAssignDietitian} disabled={!selectedDietitianId || assignDietitianMutation.isPending}>
              {assignDietitianMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ── Delete Laboratory Modal ── */}
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
            <Button variant="destructive" onClick={submitDeleteLab} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

type LabWithDietitians = Laboratory & { assignedDietitianDetails: { dieticianId: number; name: string }[] }

function LaboratoryTable({
  laboratories,
  onView,
  onEdit,
  onDelete,
  onAssignDietitian,
}: {
  laboratories: LabWithDietitians[]
  onView: (lab: Laboratory) => void
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

  const detailQueries = useQueries({
    queries: paginatedLabs.map((lab) => ({
      queryKey: ['laboratories', lab.id, 'detail'] as const,
      queryFn: () => getLaboratoryById(lab.id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const detailByLabId = useMemo(() => {
    const map: Record<string, { phone?: string; email?: string }> = {}
    paginatedLabs.forEach((lab, i) => {
      const data = detailQueries[i]?.data
      if (data) map[lab.id] = { phone: data.phone, email: data.email }
    })
    return map
  }, [paginatedLabs, detailQueries])

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
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Laboratuvar</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Adres (İl / İlçe)</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Telefon</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kargo Firması</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kargo No</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
            </tr>
          </thead>
          <tbody>
            {laboratories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[12px] text-surface-500">
                  Laboratuvar bulunamadı.
                </td>
              </tr>
            ) : (
              paginatedLabs.map((lab, rowIndex) => {
                const detail = detailByLabId[lab.id]
                const isLoadingDetail = detailQueries[rowIndex]?.isLoading
                const phone = lab.phone ?? detail?.phone
                const email = lab.email ?? detail?.email
                return (
                <tr
                  key={lab.id}
                  className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={lab.name} size="sm" className="shrink-0" />
                      <span className="text-[12px] font-medium text-surface-700">{lab.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
                      <MapPin className="h-4 w-4 shrink-0 text-surface-400" />
                      <span className="text-[12px] text-surface-700">
                        {[lab.city, lab.district].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {isLoadingDetail ? (
                      <span className="text-[11px] text-surface-400">Yükleniyor...</span>
                    ) : (
                      phone ? (
                        <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                          <span>{phone}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-surface-500">-</span>
                      )
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {isLoadingDetail ? (
                      <span className="text-[11px] text-surface-400">Yükleniyor...</span>
                    ) : (
                      email ? (
                        <span className="text-[12px] text-surface-700 truncate max-w-[200px] block" title={email}>{email}</span>
                      ) : (
                        <span className="text-[11px] text-surface-500">-</span>
                      )
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-700">{lab.cargofirm || '-'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-700">{lab.cargoNumber || '-'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(lab)}>
                          <Eye className="h-4 w-4 mr-2" /> Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
