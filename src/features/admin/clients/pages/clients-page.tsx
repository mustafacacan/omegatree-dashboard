import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar, Badge,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Checkbox,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Mail, Phone, Loader2, Eye, Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import { getClients, createClient, getClientDetail } from '@/services/clients.service'
import type { AppClient } from '@/services/clients.service'
import type { ClientDetail } from '@/services/clients.service'
import { upsertFoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { useCurrentUser } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import { getDieticians, type DieticianOption } from '@/services/kits.service'
import { addDieticianToClient, updateDieticianClient } from '@/services/dietician-clients.service'
import { updateUser } from '@/services/users.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const CLIENTS_QUERY_KEY = ['admin', 'clients'] as const

export function ClientsPage() {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [newOpen, setNewOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewClientId, setViewClientId] = useState<number | null>(null)
  const [tab, setTab] = useState<'personal' | 'anamnez' | 'nutrition'>('personal')

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignClient, setAssignClient] = useState<AppClient | null>(null)
  const [assignDieticianId, setAssignDieticianId] = useState('')
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false)
  const [pendingAssign, setPendingAssign] = useState<{ clientId: number; dieticianId: number } | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editClientId, setEditClientId] = useState<number | null>(null)
  const [editDieticianId, setEditDieticianId] = useState<string>('')
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  })

  type AlcoholFrequency = 'never' | 'rarely' | 'sometimes' | 'often' | 'daily'
  type SmokingFrequency = AlcoholFrequency
  type BowelIssue = 'none' | 'diarrhea' | 'constipation' | 'both'

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    dieticianId: '',
    chronicIllness: '',
    medicationUsed: '',
    foodAllergy: '',
    bodyHeight: '',
    bodyWeight: '',
    waistCircumference: '',
    hipCircumference: '',
    profession: '',
    education: '',

    // Nutrition form (foodConsumptionRecord) — optional: sent only if any field is filled.
    mealsPerDay: '',
    fastFoodMealsPerDay: '',
    dailyWaterLiters: '',
    defecationFrequency: '',
    alcoholFrequency: '' as '' | AlcoholFrequency,
    smokingFrequency: '' as '' | SmokingFrequency,
    avoidedFoods: '',
    discomfortFoods: '',
    bowelIssue: '' as '' | BowelIssue,
    gastrointestinalDisease: '',
    nightEatingHabit: false,
    eatingDisorderBehaviors: false,
    nutritionNotes: '',
  })

  const DIETICIAN_NONE_VALUE = '__none__'

  const trimmedSearch = useMemo(() => search.trim(), [search])
  const { data: clientsRes, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: [...CLIENTS_QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () => getClients({ page, limit: pageSize, search: trimmedSearch || undefined }),
    retry: 1,
  })

  const { data: dieticiansRes, isLoading: dieticiansLoading } = useQuery({
    queryKey: ['dieticians', 'options'],
    queryFn: () => getDieticians(),
    enabled: assignOpen || newOpen,
    staleTime: 60_000,
    retry: 1,
  })

  const dieticianOptions: DieticianOption[] = Array.isArray(dieticiansRes) ? dieticiansRes : []

  const clientsList = useMemo(() => {
    const list = Array.isArray(clientsRes?.clients) ? clientsRes.clients : []
    // Admin list should show all rows; filtering by verification can hide valid results
    // when backend doesn't expose isVerified consistently.
    return list
  }, [clientsRes?.clients])

  const totalItems = Number(clientsRes?.totalItems ?? clientsRes?.total ?? clientsList.length) || clientsList.length

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'clients', 'detail', viewClientId],
    queryFn: () => getClientDetail(viewClientId as number),
    enabled: viewOpen && viewClientId !== null,
  })

  const { data: editDetailData, isLoading: editDetailLoading } = useQuery({
    queryKey: ['admin', 'clients', 'detail', editClientId, 'edit'],
    queryFn: () => getClientDetail(editClientId as number),
    enabled: editOpen && editClientId !== null,
    retry: 1,
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

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editClientId) throw new Error('Danışan seçilmedi')
      const detail = editDetailData
      if (!detail?.user?.id) throw new Error('Danışan kullanıcı kaydı bulunamadı')

      const patch: Parameters<typeof updateUser>[1] = {}
      const firstName = editUserForm.firstName.trim()
      const lastName = editUserForm.lastName.trim()
      const email = editUserForm.email.trim()
      const phoneDigits = editUserForm.phone.replace(/\D/g, '')

      if (firstName && firstName !== (detail.user.firstName ?? '')) patch.firstName = firstName
      if (lastName && lastName !== (detail.user.lastName ?? '')) patch.lastName = lastName
      if (email && email !== (detail.user.email ?? '')) patch.email = email
      if (phoneDigits && phoneDigits !== (detail.user.phone ?? '')) patch.phone = phoneDigits

      if (Object.keys(patch).length > 0) {
        await updateUser(String(detail.user.id), patch)
      }

      const currentDieticianId = detail.dietician?.id != null ? Number(detail.dietician.id) : undefined
      const nextDieticianId = editDieticianId.trim()
      if (nextDieticianId && nextDieticianId !== DIETICIAN_NONE_VALUE) {
        const did = Number(nextDieticianId)
        if (Number.isFinite(did) && did > 0 && did !== currentDieticianId) {
          await updateDieticianClient(did, Number(editClientId))
        }
      }
    },
    onSuccess: async () => {
      toast.success('Danışan güncellendi')
      setEditOpen(false)
      setEditClientId(null)
      setEditDieticianId('')
      setEditUserForm({ firstName: '', lastName: '', phone: '', email: '' })
      await queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY })
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Danışan güncellenemedi' }))
    },
  })

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'male',
      dieticianId: '',
      chronicIllness: '',
      medicationUsed: '',
      foodAllergy: '',
      bodyHeight: '',
      bodyWeight: '',
      waistCircumference: '',
      hipCircumference: '',
      profession: '',
      education: '',

      mealsPerDay: '',
      fastFoodMealsPerDay: '',
      dailyWaterLiters: '',
      defecationFrequency: '',
      alcoholFrequency: '',
      smokingFrequency: '',
      avoidedFoods: '',
      discomfortFoods: '',
      bowelIssue: '',
      gastrointestinalDisease: '',
      nightEatingHabit: false,
      eatingDisorderBehaviors: false,
      nutritionNotes: '',
    })
    setTab('personal')
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

  const selectedDieticianLabel = useMemo(() => {
    const did = Number(assignDieticianId)
    if (!Number.isFinite(did)) return undefined
    return dieticianOptions.find((d) => d.id === did)?.label
  }, [assignDieticianId, dieticianOptions])

  const confirmAssign = (args: { clientId: number; dieticianId: number }) => {
    setPendingAssign(args)
    setAssignConfirmOpen(true)
  }

  const runAssign = (args: { clientId: number; dieticianId: number }) => {
    assignMutation.mutate(args)
  }

  const openEdit = (c: AppClient) => {
    setEditClientId(c.id)
    setEditUserForm({
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    })
    setEditDieticianId(c.dieticianId ? String(c.dieticianId) : DIETICIAN_NONE_VALUE)
    setEditOpen(true)
  }

  // When detail loads, prefill edit form once (without clobbering user edits).
  useEffect(() => {
    const user = editDetailData?.user
    if (!editOpen || !user) return
    setEditUserForm((prev) => {
      const untouched =
        prev.firstName === '' &&
        prev.lastName === '' &&
        prev.phone === '' &&
        prev.email === ''
      if (!untouched) return prev
      return {
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        phone: user.phone ?? '',
        email: user.email ?? '',
      }
    })
    setEditDieticianId((prev) => {
      if (prev && prev !== DIETICIAN_NONE_VALUE) return prev
      return editDetailData.dietician?.id ? String(editDetailData.dietician.id) : DIETICIAN_NONE_VALUE
    })
  }, [editOpen, editDetailData?.user?.id])

  const submitNew = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      toast.error('Ad, soyad ve telefon zorunludur')
      return
    }
    const dieticianId = (() => {
      if (currentUser?.role === UserRole.DIETITIAN && currentUser?.id) return Number(currentUser.id)
      if (
        currentUser?.role === UserRole.ADMIN &&
        form.dieticianId.trim() &&
        form.dieticianId !== DIETICIAN_NONE_VALUE
      ) {
        const n = Number(form.dieticianId)
        return Number.isFinite(n) ? n : undefined
      }
      return undefined
    })()

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

    const foodConsumptionRecord = (() => {
      const mealsPerDay = form.mealsPerDay.trim() ? Number(form.mealsPerDay) : NaN
      const dailyWaterLiters = form.dailyWaterLiters.trim() ? Number(form.dailyWaterLiters) : NaN
      const fastFoodMealsPerDay = form.fastFoodMealsPerDay.trim() ? Number(form.fastFoodMealsPerDay) : NaN
      const defecationFrequency = form.defecationFrequency.trim()

      const alcoholFrequency = form.alcoholFrequency
      const smokingFrequency = form.smokingFrequency

      const avoidedFoods = form.avoidedFoods.trim() || 'none'
      const discomfortFoods = form.discomfortFoods.trim() || 'none'
      const bowelIssue = form.bowelIssue || 'none'
      const gastrointestinalDisease = form.gastrointestinalDisease.trim() || 'none'

      const hasAnyInput =
        form.mealsPerDay.trim() !== '' ||
        form.fastFoodMealsPerDay.trim() !== '' ||
        form.dailyWaterLiters.trim() !== '' ||
        form.defecationFrequency.trim() !== '' ||
        form.alcoholFrequency !== '' ||
        form.smokingFrequency !== '' ||
        form.avoidedFoods.trim() !== '' ||
        form.discomfortFoods.trim() !== '' ||
        form.bowelIssue !== '' ||
        form.gastrointestinalDisease.trim() !== '' ||
        form.nutritionNotes.trim() !== '' ||
        form.nightEatingHabit === true ||
        form.eatingDisorderBehaviors === true

      // If user didn't touch nutrition form at all, don't send anything.
      if (!hasAnyInput) return undefined

      if (
        !Number.isFinite(mealsPerDay) ||
        !Number.isFinite(dailyWaterLiters) ||
        !Number.isFinite(fastFoodMealsPerDay) ||
        !defecationFrequency ||
        !alcoholFrequency ||
        !smokingFrequency
      ) {
        toast.error(
          'Beslenme formu için zorunlu alanlar: Öğün/gün, Fastfood/gün, Su (L), Dışkılama, Alkol, Sigara'
        )
        return undefined
      }

      return {
        mealsPerDay,
        alcoholFrequency,
        smokingFrequency,
        avoidedFoods,
        dailyWaterLiters,
        fastFoodMealsPerDay,
        defecationFrequency,
        discomfortFoods,
        bowelIssue,
        gastrointestinalDisease,
        nightEatingHabit: !!form.nightEatingHabit,
        eatingDisorderBehaviors: !!form.eatingDisorderBehaviors,
        ...(form.nutritionNotes.trim() ? { notes: form.nutritionNotes.trim() } : {}),
      }
    })()

    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender,
      ...(dieticianId ? { dieticianId } : {}),
      ...(anamnezForm ? { anamnezForm } : {}),
    }, {
      onSuccess: async (created) => {
        if (!foodConsumptionRecord) return
        try {
          await upsertFoodConsumptionRecord({
            clientId: created.id,
            ...foodConsumptionRecord,
          })
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, { fallback: 'Beslenme formu kaydedilemedi' }))
        }
      },
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
                {clientsLoading ? 'Yükleniyor...' : `Kayıtlı danışanlar (${totalItems} adet)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Danışan ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
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
            <ClientsTable
              clients={clientsList}
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
              onView={openView}
              onEdit={openEdit}
              onAssignDietician={openAssignDietician}
            />
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
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Kişisel</TabsTrigger>
                <TabsTrigger value="anamnez">Anamnez</TabsTrigger>
                <TabsTrigger value="nutrition">Beslenme</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4">
                <p className="form-section-title">Kişisel Bilgiler</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ad *"
                    filter="personName"
                    value={form.firstName}
                    onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder="Ad"
                  />
                  <Input
                    label="Soyad *"
                    filter="personName"
                    value={form.lastName}
                    onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder="Soyad"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefon *"
                    filter="phone"
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
                  {currentUser?.role === UserRole.ADMIN && (
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-medium text-surface-700">Diyetisyen (Opsiyonel)</label>
                      <Select
                        value={form.dieticianId || DIETICIAN_NONE_VALUE}
                        onValueChange={(v) => setForm((s) => ({ ...s, dieticianId: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={dieticiansLoading ? 'Yükleniyor...' : 'Seçin...'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DIETICIAN_NONE_VALUE}>Seçilmedi</SelectItem>
                          {dieticianOptions.map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="anamnez" className="mt-4 space-y-3">
                <p className="form-section-title">Anamnez (Opsiyonel)</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Boy (cm)" type="number" value={form.bodyHeight} onChange={(e) => setForm((s) => ({ ...s, bodyHeight: e.target.value }))} placeholder="178" />
                  <Input label="Kilo (kg)" type="number" value={form.bodyWeight} onChange={(e) => setForm((s) => ({ ...s, bodyWeight: e.target.value }))} placeholder="82" />
                  <Input label="Bel (cm)" type="number" value={form.waistCircumference} onChange={(e) => setForm((s) => ({ ...s, waistCircumference: e.target.value }))} placeholder="85" />
                  <Input label="Kalça (cm)" type="number" value={form.hipCircumference} onChange={(e) => setForm((s) => ({ ...s, hipCircumference: e.target.value }))} placeholder="95" />
                  <Input label="Meslek" value={form.profession} onChange={(e) => setForm((s) => ({ ...s, profession: e.target.value }))} placeholder="Örn: Yazılım geliştirici" />
                  <Input label="Eğitim" value={form.education} onChange={(e) => setForm((s) => ({ ...s, education: e.target.value }))} placeholder="Örn: Lisans" />
                </div>
                <Input label="Kronik hastalıklar" value={form.chronicIllness} onChange={(e) => setForm((s) => ({ ...s, chronicIllness: e.target.value }))} placeholder="Bilinen kronik hastalıklar..." />
                <Input label="Kullanılan ilaçlar" value={form.medicationUsed} onChange={(e) => setForm((s) => ({ ...s, medicationUsed: e.target.value }))} placeholder="Düzenli kullanılan ilaçlar..." />
                <Input label="Alerjiler" value={form.foodAllergy} onChange={(e) => setForm((s) => ({ ...s, foodAllergy: e.target.value }))} placeholder="Bilinen alerjiler (örn: Gluten, Fındık...)" />
              </TabsContent>

              <TabsContent value="nutrition" className="mt-4 space-y-3">
                <p className="form-section-title">Beslenme Formu (Opsiyonel)</p>
                <p className="text-[12px] text-surface-500">
                  Bu formu boş bırakabilirsiniz. Herhangi bir alan doldurulursa kaydedilir; eksik zorunlu alan varsa uyarı verilir.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Öğün / gün *" type="number" value={form.mealsPerDay} onChange={(e) => setForm((s) => ({ ...s, mealsPerDay: e.target.value }))} placeholder="3" />
                  <Input label="Fastfood / gün *" type="number" value={form.fastFoodMealsPerDay} onChange={(e) => setForm((s) => ({ ...s, fastFoodMealsPerDay: e.target.value }))} placeholder="0" />
                  <Input label="Su (L) *" type="number" value={form.dailyWaterLiters} onChange={(e) => setForm((s) => ({ ...s, dailyWaterLiters: e.target.value }))} placeholder="2.5" />
                  <Input label="Dışkılama *" value={form.defecationFrequency} onChange={(e) => setForm((s) => ({ ...s, defecationFrequency: e.target.value }))} placeholder="Örn: daily" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Alkol *</label>
                    <Select value={form.alcoholFrequency} onValueChange={(v) => setForm((s) => ({ ...s, alcoholFrequency: v as AlcoholFrequency }))}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {['never', 'rarely', 'sometimes', 'often', 'daily'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Sigara *</label>
                    <Select value={form.smokingFrequency} onValueChange={(v) => setForm((s) => ({ ...s, smokingFrequency: v as SmokingFrequency }))}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {['never', 'rarely', 'sometimes', 'often', 'daily'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input label="Kaçınılan gıdalar *" value={form.avoidedFoods} onChange={(e) => setForm((s) => ({ ...s, avoidedFoods: e.target.value }))} placeholder="Örn: none" />
                  <Input label="Rahatsız eden gıdalar *" value={form.discomfortFoods} onChange={(e) => setForm((s) => ({ ...s, discomfortFoods: e.target.value }))} placeholder="Örn: none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Bağırsak sorunu *</label>
                    <Select value={form.bowelIssue} onValueChange={(v) => setForm((s) => ({ ...s, bowelIssue: v as BowelIssue }))}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {['none', 'diarrhea', 'constipation', 'both'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input label="GIS hastalığı *" value={form.gastrointestinalDisease} onChange={(e) => setForm((s) => ({ ...s, gastrointestinalDisease: e.target.value }))} placeholder="Örn: none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-[12px] text-surface-700">
                    <Checkbox checked={form.nightEatingHabit} onCheckedChange={(v) => setForm((s) => ({ ...s, nightEatingHabit: Boolean(v) }))} />
                    Gece yeme alışkanlığı *
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-surface-700">
                    <Checkbox checked={form.eatingDisorderBehaviors} onCheckedChange={(v) => setForm((s) => ({ ...s, eatingDisorderBehaviors: Boolean(v) }))} />
                    Yeme bozukluğu davranışı *
                  </label>
                </div>

                <Input label="Not" value={form.nutritionNotes} onChange={(e) => setForm((s) => ({ ...s, nutritionNotes: e.target.value }))} placeholder="Opsiyonel" />
              </TabsContent>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
            <Button variant="primary" onClick={submitNew} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
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

      {/* Düzenle Modal */}
      <Modal
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) {
            setEditClientId(null)
            setEditDieticianId('')
            setEditUserForm({ firstName: '', lastName: '', phone: '', email: '' })
          }
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Danışan Düzenle</ModalTitle>
            <ModalDescription>
              Kişisel bilgileri ve diyetisyen atamasını güncelleyin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {editDetailLoading && !editDetailData ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ad"
                    filter="personName"
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder={editDetailData?.user?.firstName ?? 'Ad'}
                  />
                  <Input
                    label="Soyad"
                    filter="personName"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder={editDetailData?.user?.lastName ?? 'Soyad'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefon"
                    filter="phone"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder={editDetailData?.user?.phone ?? '05XX XXX XX XX'}
                  />
                  <Input
                    label="E-posta"
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder={editDetailData?.user?.email ?? 'ornek@email.com'}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-surface-700">Diyetisyen</label>
                  <Select
                    value={editDieticianId || (editDetailData?.dietician?.id ? String(editDetailData.dietician.id) : DIETICIAN_NONE_VALUE)}
                    onValueChange={setEditDieticianId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={dieticiansLoading ? 'Yükleniyor...' : 'Seçin...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DIETICIAN_NONE_VALUE}>Seçilmedi</SelectItem>
                      {dieticianOptions.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={() => editMutation.mutate()} loading={editMutation.isPending} disabled={editMutation.isPending}>
              Kaydet
            </Button>
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
            setAssignConfirmOpen(false)
            setPendingAssign(null)
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
                // Always show confirmation modal before assigning/changing.
                confirmAssign({ dieticianId, clientId: assignClient.id })
              }}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Diyetisyen Değiştirme Onayı */}
      <Modal
        open={assignConfirmOpen}
        onOpenChange={(o) => {
          setAssignConfirmOpen(o)
          if (!o) setPendingAssign(null)
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Diyetisyen ataması değiştirilsin mi?</ModalTitle>
            <ModalDescription>
              Devam ederseniz seçtiğiniz diyetisyen danışana atanacaktır.
              {assignClient?.dieticianId
                ? ' Mevcut bir atama varsa kaldırılıp yeni diyetisyen atanır.'
                : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-500">Danışan</span>
                <span className="font-medium text-surface-800">
                  {assignClient ? `${[assignClient.firstName, assignClient.lastName].filter(Boolean).join(' ')}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-500">Mevcut diyetisyen</span>
                <span className="font-medium text-surface-800">
                  {assignClient?.dieticianName || (assignClient?.dieticianId ? `#${assignClient.dieticianId}` : '—')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-500">Yeni diyetisyen</span>
                <span className="font-medium text-surface-800">
                  {selectedDieticianLabel || (pendingAssign?.dieticianId ? `#${pendingAssign.dieticianId}` : '—')}
                </span>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignConfirmOpen(false)
                setPendingAssign(null)
              }}
              disabled={assignMutation.isPending}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!pendingAssign) return
                setAssignConfirmOpen(false)
                runAssign(pendingAssign)
              }}
              disabled={!pendingAssign || assignMutation.isPending}
              loading={assignMutation.isPending}
            >
              Onayla ve Ata
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
          <p className="font-semibold text-text-primary">
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
          <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40">
            <p className="text-text-secondary text-xs font-medium mb-1">Telefon</p>
            <p className="text-sm font-medium text-text-primary">{detail.user?.phone ?? '—'}</p>
          </div>
          <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40">
            <p className="text-text-secondary text-xs font-medium mb-1">E-posta</p>
            <p className="text-sm font-medium text-text-primary truncate" title={detail.user?.email}>{detail.user?.email ?? '—'}</p>
          </div>
        </div>
      </div>

      {detail.dietician && (
        <div>
          <p className="form-section-title mb-2">Diyetisyen</p>
          <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40 flex items-center gap-3">
            <Avatar name={`${detail.dietician.firstName ?? ''} ${detail.dietician.lastName ?? ''}`.trim()} size="sm" />
            <div>
              <p className="text-sm font-medium text-text-primary">{`${detail.dietician.firstName ?? ''} ${detail.dietician.lastName ?? ''}`.trim() || '—'}</p>
              <p className="text-xs text-text-secondary">{detail.dietician.email ?? ''}</p>
            </div>
          </div>
        </div>
      )}

      {detail.anamnezForm && (
        <div>
          <p className="form-section-title mb-2">Anamnez</p>
          <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40 space-y-2 text-sm text-text-primary">
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
          <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40 space-y-2 text-sm text-text-primary">
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
            <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200/40 space-y-2 text-sm text-text-primary">
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
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onAssignDietician,
}: {
  clients: AppClient[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onView: (c: AppClient) => void
  onEdit: (c: AppClient) => void
  onAssignDietician: (c: AppClient) => void
}) {
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
              clients.map((c) => (
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
                        <DropdownMenuItem onClick={() => onEdit(c)}>
                          <MoreHorizontal className="h-4 w-4 mr-2" /> Düzenle
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
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  )
}

export default ClientsPage
