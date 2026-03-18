import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar, Badge,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Mail, Phone, Loader2, Eye, UserPlus,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import { getClients, createClient, getClientDetail } from '@/services/clients.service'
import type { AppClient } from '@/services/clients.service'
import type { ClientDetail } from '@/services/clients.service'
import { useCurrentUser } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import { getDieticians, type DieticianOption } from '@/services/kits.service'
import { addDieticianToClient, updateDieticianClient } from '@/services/dietician-clients.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const CLIENTS_QUERY_KEY = ['admin', 'clients'] as const

export function ClientsPage() {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewClientId, setViewClientId] = useState<number | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignClient, setAssignClient] = useState<AppClient | null>(null)
  const [assignDieticianId, setAssignDieticianId] = useState('')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    chronicIllness: '',
    medicationUsed: '',
    foodAllergy: '',
    bodyHeight: '',
    bodyWeight: '',
    waistCircumference: '',
    hipCircumference: '',
    profession: '',
    education: '',
  })

  const { data: clientsRes, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, { search }],
    queryFn: () => getClients({ page: 1, limit: 500, search: search.trim() || undefined }),
    retry: 1,
  })

  const { data: dieticiansRes, isLoading: dieticiansLoading } = useQuery({
    queryKey: ['dieticians', 'options'],
    queryFn: getDieticians,
    enabled: assignOpen,
    staleTime: 60_000,
    retry: 1,
  })

  const dieticianOptions: DieticianOption[] = Array.isArray(dieticiansRes) ? dieticiansRes : []

  const clientsList = Array.isArray(clientsRes?.clients) ? clientsRes.clients : []

  const filtered = useMemo(
    () =>
      clientsList.filter((c) => {
        const q = search.toLowerCase()
        return (
          (c.firstName ?? '').toLowerCase().includes(q) ||
          (c.lastName ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.dieticianName ?? '').toLowerCase().includes(q)
        )
      }),
    [clientsList, search]
  )

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'clients', 'detail', viewClientId],
    queryFn: () => getClientDetail(viewClientId as number),
    enabled: viewOpen && viewClientId !== null,
  })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
      toast.success('Danışan başarıyla oluşturuldu')
      setNewOpen(false)
      resetForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Danışan oluşturulamadı' }))
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (args: { dieticianId: number; clientId: number }) => {
      try {
        return await addDieticianToClient(args.dieticianId, args.clientId)
      } catch (err: unknown) {
        const status = (() => {
          if (!err || typeof err !== 'object') return undefined
          const resp = (err as Record<string, unknown>).response
          if (!resp || typeof resp !== 'object') return undefined
          const st = (resp as Record<string, unknown>).status
          return typeof st === 'number' ? st : undefined
        })()
        if (status === 400 || status === 409) {
          return await updateDieticianClient(args.dieticianId, args.clientId)
        }
        throw err
      }
    },
    onSuccess: async () => {
      toast.success('Diyetisyen atandı')
      setAssignOpen(false)
      setAssignClient(null)
      setAssignDieticianId('')
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Diyetisyen atanamadı' }))
    },
  })

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'male',
      chronicIllness: '',
      medicationUsed: '',
      foodAllergy: '',
      bodyHeight: '',
      bodyWeight: '',
      waistCircumference: '',
      hipCircumference: '',
      profession: '',
      education: '',
    })
    setStep(1)
  }

  const openView = (c: AppClient) => {
    setViewClientId(c.id)
    setViewOpen(true)
  }

  const openAssignDietician = (c: AppClient) => {
    setAssignClient(c)
    setAssignDieticianId(c.dieticianId ? String(c.dieticianId) : '')
    setAssignOpen(true)
  }

  const submitNew = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      toast.error('Ad, soyad ve telefon zorunludur')
      return
    }
    const dieticianId = currentUser?.role === UserRole.DIETITIAN && currentUser?.id ? Number(currentUser.id) : undefined

    const anamnezForm = (() => {
      const h = form.bodyHeight.trim() ? Number(form.bodyHeight) : undefined
      const w = form.bodyWeight.trim() ? Number(form.bodyWeight) : undefined
      const waist = form.waistCircumference.trim() ? Number(form.waistCircumference) : undefined
      const hip = form.hipCircumference.trim() ? Number(form.hipCircumference) : undefined
      const partial: {
        chronicIllness?: string
        medicationUsed?: string
        foodAllergy?: string
        bodyHeight?: number
        bodyWeight?: number
        waistCircumference?: number
        hipCircumference?: number
        profession?: string
        education?: string
      } = {}
      if (form.chronicIllness.trim()) partial.chronicIllness = form.chronicIllness.trim()
      if (form.medicationUsed.trim()) partial.medicationUsed = form.medicationUsed.trim()
      if (form.foodAllergy.trim()) partial.foodAllergy = form.foodAllergy.trim()
      if (form.profession.trim()) partial.profession = form.profession.trim()
      if (form.education.trim()) partial.education = form.education.trim()
      if (h !== undefined && !Number.isNaN(h)) partial.bodyHeight = h
      if (w !== undefined && !Number.isNaN(w)) partial.bodyWeight = w
      if (waist !== undefined && !Number.isNaN(waist)) partial.waistCircumference = waist
      if (hip !== undefined && !Number.isNaN(hip)) partial.hipCircumference = hip
      return Object.keys(partial).length ? partial : undefined
    })()

    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender,
      ...(dieticianId ? { dieticianId } : {}),
      ...(anamnezForm ? { anamnezForm } : {}),
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Danışanlar</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                {clientsLoading ? 'Yükleniyor...' : `Kayıtlı danışanlar (${filtered.length} adet)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Danışan ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                />
              </div>
              <Button variant="primary" size="sm" onClick={() => { resetForm(); setNewOpen(true) }}>
                <Plus className="h-4 w-4" />
                Yeni Danışan
              </Button>
            </div>
          </div>

          {clientsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : clientsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-surface-700">Liste yüklenirken hata oluştu.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })}>
                Tekrar Dene
              </Button>
            </div>
          ) : (
            <ClientsTable clients={filtered} onView={openView} onAssignDietician={openAssignDietician} />
          )}
        </div>
      </motion.div>

      {/* Yeni Danışan Modal */}
      <Modal open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) resetForm() }}>
        <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>Yeni Danışan Ekle</ModalTitle>
            <ModalDescription>
              Danışan bilgileri ve isteğe bağlı anamnez alanlarını doldurun.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === 1 ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-surface-500 hover:bg-surface-50'
                }`}
              >
                <UserPlus className="h-4 w-4" /> Kişisel Bilgiler
              </button>
              <div className="h-px w-4 bg-surface-200" />
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === 2 ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-surface-500 hover:bg-surface-50'
                }`}
              >
                <Users className="h-4 w-4" /> Anamnez (Opsiyonel)
              </button>
            </div>

            {step === 1 && (
              <>
                <p className="form-section-title">Kişisel Bilgiler</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ad *"
                    value={form.firstName}
                    onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder="Ad"
                  />
                  <Input
                    label="Soyad *"
                    value={form.lastName}
                    onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder="Soyad"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefon *"
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="05XX XXX XX XX"
                  />
                  <Input
                    label="E-posta"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="ornek@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Cinsiyet</label>
                    <Select value={form.gender} onValueChange={(v) => setForm((s) => ({ ...s, gender: v as 'male' | 'female' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadın</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="form-section-title">Anamnez Bilgileri (Opsiyonel)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Boy (cm)"
                    type="number"
                    value={form.bodyHeight}
                    onChange={(e) => setForm((s) => ({ ...s, bodyHeight: e.target.value }))}
                    placeholder="178"
                  />
                  <Input
                    label="Kilo (kg)"
                    type="number"
                    value={form.bodyWeight}
                    onChange={(e) => setForm((s) => ({ ...s, bodyWeight: e.target.value }))}
                    placeholder="82"
                  />
                  <Input
                    label="Bel (cm)"
                    type="number"
                    value={form.waistCircumference}
                    onChange={(e) => setForm((s) => ({ ...s, waistCircumference: e.target.value }))}
                    placeholder="85"
                  />
                  <Input
                    label="Kalça (cm)"
                    type="number"
                    value={form.hipCircumference}
                    onChange={(e) => setForm((s) => ({ ...s, hipCircumference: e.target.value }))}
                    placeholder="95"
                  />
                  <Input
                    label="Meslek"
                    value={form.profession}
                    onChange={(e) => setForm((s) => ({ ...s, profession: e.target.value }))}
                    placeholder="Örn: Yazılım geliştirici"
                  />
                  <Input
                    label="Eğitim"
                    value={form.education}
                    onChange={(e) => setForm((s) => ({ ...s, education: e.target.value }))}
                    placeholder="Örn: Lisans"
                  />
                </div>
                <Input
                  label="Kronik hastalıklar"
                  value={form.chronicIllness}
                  onChange={(e) => setForm((s) => ({ ...s, chronicIllness: e.target.value }))}
                  placeholder="Bilinen kronik hastalıklar..."
                />
                <Input
                  label="Kullanılan ilaçlar"
                  value={form.medicationUsed}
                  onChange={(e) => setForm((s) => ({ ...s, medicationUsed: e.target.value }))}
                  placeholder="Düzenli kullanılan ilaçlar..."
                />
                <Input
                  label="Alerjiler"
                  value={form.foodAllergy}
                  onChange={(e) => setForm((s) => ({ ...s, foodAllergy: e.target.value }))}
                  placeholder="Bilinen alerjiler (örn: Gluten, Fındık...)"
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {step === 2 ? (
              <Button variant="outline" onClick={() => setStep(1)}>Geri</Button>
            ) : (
              <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
            )}
            {step === 1 ? (
              <Button variant="primary" onClick={() => setStep(2)}>Devam — Anamnez</Button>
            ) : (
              <Button variant="primary" onClick={submitNew} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detay Modal */}
      <Modal
        open={viewOpen}
        onOpenChange={(o) => {
          setViewOpen(o)
          if (!o) setViewClientId(null)
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Danışan Detayı</ModalTitle>
            <ModalDescription className="text-surface-700 dark:text-surface-700 font-medium">
              {detailData?.user ? `${detailData.user.firstName ?? ''} ${detailData.user.lastName ?? ''}`.trim() || '—' : 'Detay yükleniyor...'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {detailLoading && !detailData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : detailData ? (
              <ViewDetailContent detail={detailData} />
            ) : (
              <p className="text-sm text-surface-500 py-4">Detay bulunamadı.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setViewOpen(false); setViewClientId(null) }}>Kapat</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Diyetisyen Ata Modal */}
      <Modal
        open={assignOpen}
        onOpenChange={(o) => {
          setAssignOpen(o)
          if (!o) {
            setAssignClient(null)
            setAssignDieticianId('')
          }
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Diyetisyen Ata</ModalTitle>
            <ModalDescription>
              {assignClient ? `${[assignClient.firstName, assignClient.lastName].filter(Boolean).join(' ') || 'Danışan'}` : 'Danışan seçin'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Diyetisyen</label>
              <Select value={assignDieticianId} onValueChange={setAssignDieticianId}>
                <SelectTrigger>
                  <SelectValue placeholder={dieticiansLoading ? 'Yükleniyor...' : 'Seçin...'} />
                </SelectTrigger>
                <SelectContent>
                  {dieticianOptions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>İptal</Button>
            <Button
              variant="primary"
              disabled={!assignClient || !assignDieticianId || assignMutation.isPending}
              onClick={() => {
                if (!assignClient) return
                const dieticianId = Number(assignDieticianId)
                if (!Number.isFinite(dieticianId)) return
                assignMutation.mutate({ dieticianId, clientId: assignClient.id })
              }}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function ViewDetailContent({ detail }: { detail: ClientDetail }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-200/40 border border-surface-200">
        <Avatar
          name={`${detail.user?.firstName ?? ''} ${detail.user?.lastName ?? ''}`.trim() || '—'}
          size="lg"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-surface-900 dark:text-surface-900">
            {`${detail.user?.firstName ?? ''} ${detail.user?.lastName ?? ''}`.trim() || '—'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {detail.anamnezForm ? (
              <Badge variant="success" size="sm">Anamnez Var</Badge>
            ) : (
              <Badge variant="outline" size="sm">Anamnez Yok</Badge>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="form-section-title mb-2">İletişim</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50">
            <p className="text-surface-500 dark:text-surface-500 text-xs font-medium mb-1">Telefon</p>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-900">{detail.user?.phone ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50">
            <p className="text-surface-500 dark:text-surface-500 text-xs font-medium mb-1">E-posta</p>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-900 truncate" title={detail.user?.email}>{detail.user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {detail.dietician && (
        <div>
          <p className="form-section-title mb-2">Diyetisyen</p>
          <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50 flex items-center gap-3">
            <Avatar name={`${detail.dietician.firstName ?? ''} ${detail.dietician.lastName ?? ''}`.trim()} size="sm" />
            <div>
              <p className="text-sm font-medium text-surface-800 dark:text-surface-900">{`${detail.dietician.firstName ?? ''} ${detail.dietician.lastName ?? ''}`.trim() || '—'}</p>
              <p className="text-xs text-surface-500 dark:text-surface-500">{detail.dietician.email ?? ''}</p>
            </div>
          </div>
        </div>
      )}

      {detail.anamnezForm && (
        <div>
          <p className="form-section-title mb-2">Anamnez</p>
          <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-surface-500">Kronik:</span> {detail.anamnezForm.chronicIllness ?? '—'}</div>
              <div><span className="text-surface-500">İlaç:</span> {detail.anamnezForm.medicationUsed ?? '—'}</div>
              <div><span className="text-surface-500">Alerji:</span> {detail.anamnezForm.foodAllergy ?? '—'}</div>
              <div><span className="text-surface-500">Meslek:</span> {detail.anamnezForm.profession ?? '—'}</div>
              <div><span className="text-surface-500">Eğitim:</span> {detail.anamnezForm.education ?? '—'}</div>
              <div><span className="text-surface-500">Boy:</span> {detail.anamnezForm.bodyHeight ?? '—'}</div>
              <div><span className="text-surface-500">Kilo:</span> {detail.anamnezForm.bodyWeight ?? '—'}</div>
              <div><span className="text-surface-500">Bel:</span> {detail.anamnezForm.waistCircumference ?? '—'}</div>
              <div><span className="text-surface-500">Kalça:</span> {detail.anamnezForm.hipCircumference ?? '—'}</div>
            </div>
          </div>
        </div>
      )}

      {detail.foodConsumptionRecord && (
        <div>
          <p className="form-section-title mb-2">Beslenme Kaydı</p>
          <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-surface-500">Öğün/gün:</span> {detail.foodConsumptionRecord.mealsPerDay ?? '—'}</div>
              <div><span className="text-surface-500">Fastfood öğün:</span> {detail.foodConsumptionRecord.fastFoodMealsPerDay ?? '—'}</div>
              <div><span className="text-surface-500">Su (L):</span> {detail.foodConsumptionRecord.dailyWaterLiters ?? '—'}</div>
              <div><span className="text-surface-500">Dışkılama:</span> {detail.foodConsumptionRecord.defecationFrequency ?? '—'}</div>
              <div><span className="text-surface-500">Alkol:</span> {detail.foodConsumptionRecord.alcoholFrequency ?? '—'}</div>
              <div><span className="text-surface-500">Sigara:</span> {detail.foodConsumptionRecord.smokingFrequency ?? '—'}</div>
              <div><span className="text-surface-500">Bağırsak:</span> {detail.foodConsumptionRecord.bowelIssue ?? '—'}</div>
              <div><span className="text-surface-500">GIS:</span> {detail.foodConsumptionRecord.gastrointestinalDisease ?? '—'}</div>
              <div className="col-span-2"><span className="text-surface-500">Kaçınılanlar:</span> {detail.foodConsumptionRecord.avoidedFoods ?? '—'}</div>
              <div className="col-span-2"><span className="text-surface-500">Rahatsız edenler:</span> {detail.foodConsumptionRecord.discomfortFoods ?? '—'}</div>
              <div><span className="text-surface-500">Gece yeme:</span> {detail.foodConsumptionRecord.nightEatingHabit == null ? '—' : detail.foodConsumptionRecord.nightEatingHabit ? 'Evet' : 'Hayır'}</div>
              <div><span className="text-surface-500">Yeme bozukluğu:</span> {detail.foodConsumptionRecord.eatingDisorderBehaviors == null ? '—' : detail.foodConsumptionRecord.eatingDisorderBehaviors ? 'Evet' : 'Hayır'}</div>
            </div>
          </div>
        </div>
      )}

      {detail.sleepQualityRecords && detail.sleepQualityRecords.length > 0 && (() => {
        const latest = detail.sleepQualityRecords.reduce((acc, cur) => {
          const a = acc?.recordDate ?? acc?.createdAt
          const b = cur?.recordDate ?? cur?.createdAt
          if (!a) return cur
          if (!b) return acc
          return new Date(b).getTime() >= new Date(a).getTime() ? cur : acc
        }, detail.sleepQualityRecords[0])

        return (
          <div>
            <p className="form-section-title mb-2">Uyku Kaydı</p>
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-surface-500">Tarih:</span> {latest.recordDate ? formatDate(latest.recordDate) : '—'}</div>
                <div><span className="text-surface-500">Uyku (saat):</span> {latest.sleepHours ?? '—'}</div>
                <div><span className="text-surface-500">Yatış:</span> {latest.usualBedTime ?? '—'}</div>
                <div><span className="text-surface-500">Kalkış:</span> {latest.usualWakeTime ?? '—'}</div>
                <div><span className="text-surface-500">Dalma (dk):</span> {latest.sleepLatencyMinutes ?? '—'}</div>
                <div><span className="text-surface-500">Öznel kalite (0-3):</span> {latest.subjectiveSleepQuality ?? '—'}</div>
                <div><span className="text-surface-500">30dk içinde uyuyamama (0-3):</span> {latest.cannotFallAsleepWithin30 ?? '—'}</div>
                <div><span className="text-surface-500">Tuvalet için uyanma (0-3):</span> {latest.wakeToUseBathroom ?? '—'}</div>
                <div><span className="text-surface-500">Uyku ilacı (0-3):</span> {latest.sleepMedicationFrequency ?? '—'}</div>
                <div><span className="text-surface-500">Gündüz uykululuk (0-3):</span> {latest.daytimeSleepinessFrequency ?? '—'}</div>
                <div><span className="text-surface-500">İstek/enerji (0-3):</span> {latest.lackOfEnthusiasmProblem ?? '—'}</div>
                <div><span className="text-surface-500">Eş durumu (0-3):</span> {latest.bedPartnerSituation ?? '—'}</div>
              </div>

              {latest.notes ? (
                <div className="pt-2 border-t border-surface-200">
                  <span className="text-surface-500">Not:</span> {latest.notes}
                </div>
              ) : null}
            </div>
          </div>
        )
      })()}

      {detail.createdAt && (
        <div className="pt-1 border-t border-surface-200 text-xs text-surface-500 dark:text-surface-600">
          Kayıt: {formatDateTime(detail.createdAt)}
        </div>
      )}
    </div>
  )
}

function ClientsTable({
  clients,
  onView,
  onAssignDietician,
}: {
  clients: AppClient[]
  onView: (c: AppClient) => void
  onAssignDietician: (c: AppClient) => void
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginated = useMemo(
    () => clients.slice((page - 1) * pageSize, page * pageSize),
    [clients, page, pageSize]
  )

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Danışan</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Telefon</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Diyetisyen</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Oluşturulma</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-surface-500">
                  Danışan bulunamadı.
                </td>
              </tr>
            ) : (
              paginated.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${c.firstName} ${c.lastName}`.trim() || '—'} size="sm" className="shrink-0" />
                      <span className="text-[12px] font-medium text-surface-700">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                      <Phone className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span>{c.phone || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                      <Mail className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span className="truncate max-w-[180px] block">{c.email || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-surface-700">
                    {c.dieticianName || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-surface-500">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(c)}>
                          <Eye className="h-4 w-4 mr-2" /> Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAssignDietician(c)}>
                          <Users className="h-4 w-4 mr-2" /> Diyetisyen Ata
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
        totalItems={clients.length}
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

export default ClientsPage
