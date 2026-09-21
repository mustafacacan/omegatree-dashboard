import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PanelHeader } from '@/components/shared/panel-header'
import { ToolbarSearch } from '@/components/shared/toolbar-search'
import {
  Button, Avatar, Badge,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Input,
} from '@/components/ui'
import type { FrequencyValue } from '@/lib/frequency-labels'
import { FREQUENCY_OPTIONS } from '@/lib/frequency-labels'
import { BeslenmeAnamneziFormFields } from '@/features/shared/beslenme-anamnezi-form-fields'
import {
  BESLENME_REQUIRED_ERROR,
  buildBeslenmeAnamneziPayload,
  EMPTY_BESLENME_ANAMNEZI_FORM,
  type BeslenmeAnamneziPayload,
} from '@/features/shared/beslenme-anamnezi-form.utils'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Plus, MoreHorizontal, Eye, Loader2, PackagePlus, UserPlus, Users, Phone, Mail, Send, FlaskConical, AlertTriangle,
} from 'lucide-react'
import type { DieticianClientKit } from '@/services/dietician-client-kits.service'
import { toast } from 'sonner'
import { TablePagination } from '@/components/shared/table-pagination'
import { getApiErrorMessage } from '@/lib/api-error'
import { getClientsByDietician } from '@/services/dietician-clients.service'
import { assignDieticianClientKitToClient, getDieticianClientKitById, getDieticianClientKits, sendKitToLaboratory } from '@/services/dietician-client-kits.service'
import { createClient, getClientDetail } from '@/services/clients.service'
import { upsertFoodConsumptionRecord } from '@/services/food-consumption-records.service'
import { getMyStockList } from '@/services/stocks.service'
import { useCurrentUser } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import {
  PhoneInput,
  validateNationalPhone,
} from '@/components/shared/phone-input'
import { anamnezDisplayFields, foodDisplayFields } from '@/features/shared/client-health-display'
import { IpaqFormFields } from '@/features/shared/ipaq-form-fields'
import { FoodFrequencyFormFields } from '@/features/shared/food-frequency-form-fields'
import {
  buildIpaqPayload,
  EMPTY_IPAQ_FORM,
  ipaqFormHasInput,
  validateIpaqForm,
  type IpaqFormState,
} from '@/features/shared/ipaq-form.utils'
import {
  buildEmptyFfqItems,
  countFilledFfqItems,
  ffqFormHasInput,
  validateFfqForm,
  type FoodFrequencyFormState,
} from '@/features/shared/food-frequency-form.utils'
import { upsertIpaqRecord, type CreateIpaqRecord } from '@/services/ipaq.service'
import { upsertFoodFrequencyRecord, type CreateFoodFrequencyRecord } from '@/services/food-frequency.service'
import { danisanDetayPath } from '@/utils/routes'

const DIETITIAN_CLIENTS_QUERY_KEY = ['dieticians', 'get-clients-by-dietician'] as const

type KitFlowStatus = DieticianClientKit['status']

function needsLabSend(status?: KitFlowStatus): boolean {
  return status === 'in_client'
}

function kitStatusBadge(status?: KitFlowStatus): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'outline' } {
  switch (status) {
    case 'in_client':
      return { label: 'Lab. gönderimi bekliyor', variant: 'warning' }
    case 'in_laboratory':
      return { label: 'Laboratuvarda', variant: 'info' }
    case 'in_expert':
      return { label: 'Uzmanda', variant: 'info' }
    case 'delivered':
      return { label: 'Teslim', variant: 'success' }
    case 'cancelled':
      return { label: 'İptal', variant: 'danger' }
    case 'completed':
      return { label: 'Tamamlandı', variant: 'success' }
    default:
      return { label: '—', variant: 'outline' }
  }
}

type ActiveTab = 'clients' | 'kits'
type NewClientStep = 1 | 2 | 3 | 4 | 5

export function ClientsListPage() {
  const navigate = useNavigate()
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
  const [newOpen, setNewOpen] = useState(false)
  const [step, setStep] = useState<NewClientStep>(1)
  const pendingFoodConsumptionRef = useRef<BeslenmeAnamneziPayload | undefined>(undefined)
  const pendingIpaqRef = useRef<CreateIpaqRecord | undefined>(undefined)
  const pendingFfqRef = useRef<CreateFoodFrequencyRecord | undefined>(undefined)
  const [ipaqForm, setIpaqForm] = useState<IpaqFormState>(EMPTY_IPAQ_FORM)
  const [ffqItems, setFfqItems] = useState<FoodFrequencyFormState>(() => buildEmptyFfqItems())
  const [ffqNotes, setFfqNotes] = useState('')
  const ffqFilledCount = useMemo(() => countFilledFfqItems(ffqItems), [ffqItems])
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryDialCode: '90',
    gender: 'male' as 'male' | 'female',
    age: '',
    chronicIllness: '',
    familyChronicIllness: '',
    medicationUsed: '',
    bodyHeight: '',
    bodyWeight: '',
    waistCircumference: '',
    hipCircumference: '',
    neckCircumference: '',
    smokingFrequency: '' as '' | FrequencyValue,
    alcoholFrequency: '' as '' | FrequencyValue,
    alcoholType: '',
    profession: '',
    education: '',
    ...EMPTY_BESLENME_ANAMNEZI_FORM,
  })
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()

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

  const pendingLabSendCount = useMemo(
    () => kitAssignments.filter((k) => needsLabSend(k.status)).length,
    [kitAssignments],
  )

  const toEditTarget = (k: DieticianClientKit) => ({
    assignmentId: k.id as number,
    clientName: k.clientName,
    kitName: k.kitName,
    kitBarcode: k.kitBarcode,
    status: k.status,
  })

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
      toast.success('Kit atandı. Sıradaki adım: laboratuvara gönderin.')
      queryClient.invalidateQueries({ queryKey: ['dietician-client-kits'] })
      queryClient.invalidateQueries({ queryKey: ['stocks', 'my-stock'] })
      setAssignOpen(false)
      setAssignClient(null)
      setSelectedKitId('')
      setTab('kits')
      setPage(1)
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : getApiErrorMessage(err, { fallback: 'Kit atamasi yapilamadi' })
      toast.error(message)
    },
  })

  const sendToLabMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget?.assignmentId) throw new Error('Atama bulunamadı')
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

  const resetNewForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      countryDialCode: '90',
      gender: 'male',
      age: '',
      chronicIllness: '',
      familyChronicIllness: '',
      medicationUsed: '',
      bodyHeight: '',
      bodyWeight: '',
      waistCircumference: '',
      hipCircumference: '',
      neckCircumference: '',
      smokingFrequency: '',
      alcoholFrequency: '',
      alcoholType: '',
      profession: '',
      education: '',
      ...EMPTY_BESLENME_ANAMNEZI_FORM,
    })
    setIpaqForm(EMPTY_IPAQ_FORM)
    setFfqItems(buildEmptyFfqItems())
    setFfqNotes('')
    setStep(1)
  }

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: DIETITIAN_CLIENTS_QUERY_KEY })
      const foodConsumptionRecord = pendingFoodConsumptionRef.current
      pendingFoodConsumptionRef.current = undefined

      if (foodConsumptionRecord) {
        try {
          await upsertFoodConsumptionRecord({
            clientId: created.id,
            ...foodConsumptionRecord,
          })
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, { fallback: 'Beslenme formu kaydedilemedi' }))
        }
      }

      const pendingIpaq = pendingIpaqRef.current
      pendingIpaqRef.current = undefined
      if (pendingIpaq) {
        try {
          await upsertIpaqRecord({ ...pendingIpaq, clientId: created.id })
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, { fallback: 'IPAQ kaydedilemedi' }))
        }
      }

      const pendingFfq = pendingFfqRef.current
      pendingFfqRef.current = undefined
      if (pendingFfq) {
        try {
          await upsertFoodFrequencyRecord({ ...pendingFfq, clientId: created.id })
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, { fallback: 'Besin tüketim sıklığı kaydedilemedi' }))
        }
      }

      toast.success('Danışan başarıyla oluşturuldu')
      setNewOpen(false)
      resetNewForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Danışan oluşturulamadı' }))
    },
  })

  const submitNewClient = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      toast.error('Ad, soyad ve telefon zorunludur')
      return
    }
    const phoneErr = validateNationalPhone(form.phone, form.countryDialCode)
    if (phoneErr) {
      toast.error(phoneErr)
      return
    }
    const foodConsumptionRecord = buildBeslenmeAnamneziPayload(form)
    if (foodConsumptionRecord === 'error') {
      toast.error(BESLENME_REQUIRED_ERROR)
      return
    }
    pendingFoodConsumptionRef.current = foodConsumptionRecord

    if (ipaqFormHasInput(ipaqForm)) {
      const ipaqErr = validateIpaqForm(ipaqForm)
      if (ipaqErr) {
        toast.error(ipaqErr)
        return
      }
      pendingIpaqRef.current = buildIpaqPayload(ipaqForm)
    } else {
      pendingIpaqRef.current = undefined
    }

    if (ffqFormHasInput(ffqItems, ffqNotes)) {
      const ffqErr = validateFfqForm(ffqItems, 1)
      if (ffqErr) {
        toast.error(ffqErr)
        return
      }
      pendingFfqRef.current = { items: ffqItems, notes: ffqNotes.trim() || null }
    } else {
      pendingFfqRef.current = undefined
    }

    const dieticianId = currentUser?.role === UserRole.DIETITIAN && currentUser?.id ? Number(currentUser.id) : undefined
    const anamnezForm = (() => {
      const age = form.age.trim() ? Number(form.age) : undefined
      const h = form.bodyHeight.trim() ? Number(form.bodyHeight) : undefined
      const w = form.bodyWeight.trim() ? Number(form.bodyWeight) : undefined
      const waist = form.waistCircumference.trim() ? Number(form.waistCircumference) : undefined
      const hip = form.hipCircumference.trim() ? Number(form.hipCircumference) : undefined
      const neck = form.neckCircumference.trim() ? Number(form.neckCircumference) : undefined
      const partial: Parameters<typeof createClient>[0]['anamnezForm'] = {}
      if (age !== undefined && !Number.isNaN(age)) partial.age = Math.round(age)
      if (form.chronicIllness.trim()) partial.chronicIllness = form.chronicIllness.trim()
      if (form.familyChronicIllness.trim()) partial.familyChronicIllness = form.familyChronicIllness.trim()
      if (form.medicationUsed.trim()) partial.medicationUsed = form.medicationUsed.trim()
      if (form.profession.trim()) partial.profession = form.profession.trim()
      if (form.education.trim()) partial.education = form.education.trim()
      if (form.smokingFrequency) partial.smokingFrequency = form.smokingFrequency
      if (form.alcoholFrequency) partial.alcoholFrequency = form.alcoholFrequency
      if (form.alcoholType.trim()) partial.alcoholType = form.alcoholType.trim()
      if (h !== undefined && !Number.isNaN(h)) partial.bodyHeight = h
      if (w !== undefined && !Number.isNaN(w)) partial.bodyWeight = w
      if (waist !== undefined && !Number.isNaN(waist)) partial.waistCircumference = waist
      if (hip !== undefined && !Number.isNaN(hip)) partial.hipCircumference = hip
      if (neck !== undefined && !Number.isNaN(neck)) partial.neckCircumference = neck
      return partial && Object.keys(partial).length ? partial : undefined
    })()

    createClientMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      countryDialCode: form.countryDialCode || '90',
      email: form.email.trim() || undefined,
      gender: form.gender,
      ...(dieticianId ? { dieticianId } : {}),
      ...(anamnezForm ? { anamnezForm } : {}),
    })
  }

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
                  <TabsTrigger value="kits" className="rounded-md text-[12px] data-[state=active]:bg-white dark:data-[state=active]:bg-surface-100 gap-1.5">
                    Kit atananlar
                    {pendingLabSendCount > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                        {pendingLabSendCount}
                      </span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
                <ToolbarSearch
                  value={search}
                  onChange={(v) => {
                    setSearch(v)
                    setPage(1)
                  }}
                  placeholder="Danışan ara..."
                  inputClassName="h-9 text-sm w-48"
                />
                <Button variant="primary" size="sm" onClick={() => { resetNewForm(); setNewOpen(true) }}>
                  <Plus className="h-4 w-4" />
                  Yeni Danışan
                </Button>
              </>
            }
          />

          <TabsContent value="clients" className="mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Danışan</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Telefon</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Oluşturulma</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
                  </tr>
                </thead>
                <tbody>
                  {clientsLoading && !clientsData ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                        <p className="text-[12px] text-surface-500">Danışan listesi yükleniyor...</p>
                      </td>
                    </tr>
                  ) : clientsItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-[12px] text-surface-500">
                        Filtreye uygun danışan bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    clientsItems.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={client.clientName ?? '—'} size="sm" className="shrink-0" />
                            <span className="text-[12px] font-medium text-surface-700">
                              {client.clientName ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                            <Phone className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                            <span>{client.clientPhone ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                            <Mail className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                            <span className="truncate max-w-[180px] block">{client.clientEmail ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-surface-500">
                          {client.createdAt ? formatDate(client.createdAt) : '—'}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  if (client.clientId) navigate(danisanDetayPath(String(client.clientId)))
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" /> Detay Sayfası
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(client.clientId)}>
                                <Eye className="h-4 w-4 mr-2" /> Hızlı Görüntüle
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
            {pendingLabSendCount > 0 ? (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {pendingLabSendCount} kit laboratuvara gönderilmeyi bekliyor
                  </p>
                  <p className="text-[12px] mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                    Danışana kit atadıktan sonra numune alındığında aşağıdaki satırdan laboratuvara gönderin.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Danışan</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Barkod</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kit</th>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Son Atama</th>
                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500 min-w-[220px]">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {kitsLoading && !kitsData ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                        <p className="text-[12px] text-surface-500">Kit atanan danışanlar yükleniyor...</p>
                      </td>
                    </tr>
                  ) : paginatedKitAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-surface-500">
                        Kit atanmış danışan bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    paginatedKitAssignments.map((k) => {
                      const awaitingLab = needsLabSend(k.status)
                      const statusInfo = kitStatusBadge(k.status)
                      return (
                        <tr
                          key={k.id}
                          className={cn(
                            'border-b border-surface-200 transition-colors',
                            awaitingLab
                              ? 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/15 border-l-[3px] border-l-amber-400'
                              : 'hover:bg-surface-50 dark:hover:bg-surface-200',
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={k.clientName ?? '—'} size="sm" className="shrink-0" />
                              <span className="text-[12px] font-medium text-surface-700">{k.clientName ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{k.kitBarcode ?? '—'}</code>
                          </td>
                          <td className="px-5 py-3.5">
                            {k.status ? (
                              <Badge variant={statusInfo.variant} size="sm">
                                {statusInfo.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-surface-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="outline">{k.kitName ?? 'Kit'}</Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[12px] text-surface-500">{k.createdAt ? formatDate(k.createdAt) : '—'}</span>
                          </td>
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {awaitingLab ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="h-8 text-[12px] shadow-sm"
                                  onClick={() => openEdit(toEditTarget(k))}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  Laboratuvara Gönder
                                </Button>
                              ) : null}
                              <Button
                                variant={awaitingLab ? 'outline' : 'ghost'}
                                size="sm"
                                className="h-8 text-[12px]"
                                onClick={() => openKitDetail(k.id)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Detay
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
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

      {/* Yeni Danışan Modal */}
      <Modal open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) resetNewForm() }}>
        <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>Yeni Danışan Ekle</ModalTitle>
            <ModalDescription>
              Danışan bilgileri, anamnez, beslenme, IPAQ ve besin sıklığı formlarını doldurun.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {([
                [1, 'Kişisel', UserPlus],
                [2, 'Anamnez', Users],
                [3, 'Beslenme', Users],
                [4, 'IPAQ', Users],
                [5, 'Besin Sıklığı', Users],
              ] as const).map(([n, label, Icon], idx) => (
                <span key={n} className="flex items-center gap-2">
                  {idx > 0 ? <div className="h-px w-3 bg-surface-200 hidden sm:block" /> : null}
                  <button
                    type="button"
                    onClick={() => setStep(n)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${step === n ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700' : 'text-surface-500 dark:text-surface-400 border border-transparent'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                </span>
              ))}
            </div>

            {step === 1 && (
              <>
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
                <PhoneInput
                  label="Telefon *"
                  value={form.phone}
                  countryDialCode={form.countryDialCode}
                  onValueChange={(phone) => setForm((s) => ({ ...s, phone }))}
                  onCountryChange={(countryDialCode) => setForm((s) => ({ ...s, countryDialCode }))}
                />
                <Input
                  label="E-posta"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="ornek@email.com"
                />
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
                  <Input label="Yaş" type="number" value={form.age} onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))} placeholder="35" />
                  <Input label="Boy (cm)" type="number" value={form.bodyHeight} onChange={(e) => setForm((s) => ({ ...s, bodyHeight: e.target.value }))} placeholder="178" />
                  <Input label="Kilo (kg)" type="number" value={form.bodyWeight} onChange={(e) => setForm((s) => ({ ...s, bodyWeight: e.target.value }))} placeholder="82" />
                  <Input label="Bel (cm)" type="number" value={form.waistCircumference} onChange={(e) => setForm((s) => ({ ...s, waistCircumference: e.target.value }))} placeholder="85" />
                  <Input label="Kalça (cm)" type="number" value={form.hipCircumference} onChange={(e) => setForm((s) => ({ ...s, hipCircumference: e.target.value }))} placeholder="95" />
                  <Input label="Boyun (cm)" type="number" value={form.neckCircumference} onChange={(e) => setForm((s) => ({ ...s, neckCircumference: e.target.value }))} placeholder="38" />
                  <Input label="Meslek" value={form.profession} onChange={(e) => setForm((s) => ({ ...s, profession: e.target.value }))} placeholder="Örn: Yazılım geliştirici" />
                  <Input label="Eğitim" value={form.education} onChange={(e) => setForm((s) => ({ ...s, education: e.target.value }))} placeholder="Örn: Lisans" />
                </div>
                <Input label="Kronik hastalıklar" value={form.chronicIllness} onChange={(e) => setForm((s) => ({ ...s, chronicIllness: e.target.value }))} placeholder="Yoksa 'Yok' yazın" />
                <Input label="Ailede kronik hastalık" value={form.familyChronicIllness} onChange={(e) => setForm((s) => ({ ...s, familyChronicIllness: e.target.value }))} placeholder="Yoksa 'Yok' yazın" />
                <Input label="Kullanılan ilaçlar" value={form.medicationUsed} onChange={(e) => setForm((s) => ({ ...s, medicationUsed: e.target.value }))} placeholder="Yoksa 'Yok' yazın" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Sigara</label>
                    <Select value={form.smokingFrequency || undefined} onValueChange={(v) => setForm((s) => ({ ...s, smokingFrequency: v as FrequencyValue }))}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-surface-700">Alkol</label>
                    <Select value={form.alcoholFrequency || undefined} onValueChange={(v) => setForm((s) => ({ ...s, alcoholFrequency: v as FrequencyValue }))}>
                      <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input label="Alkol türü" value={form.alcoholType} onChange={(e) => setForm((s) => ({ ...s, alcoholType: e.target.value }))} placeholder="Opsiyonel" />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="form-section-title">Beslenme Anamnezi (Opsiyonel)</p>
                <p className="text-[12px] text-surface-500">
                  Bu formu boş bırakabilirsiniz. Herhangi bir alan doldurulursa kaydedilir; eksik zorunlu alan varsa uyarı verilir.
                </p>
                <BeslenmeAnamneziFormFields
                  form={form}
                  onChange={(patch) => setForm((s) => ({ ...s, ...patch }))}
                />
              </>
            )}

            {step === 4 && (
              <>
                <p className="form-section-title">IPAQ — Fiziksel Aktivite (Opsiyonel)</p>
                <IpaqFormFields form={ipaqForm} onChange={setIpaqForm} />
              </>
            )}

            {step === 5 && (
              <>
                <p className="form-section-title">Besin Tüketim Sıklığı (Opsiyonel)</p>
                <FoodFrequencyFormFields
                  items={ffqItems}
                  notes={ffqNotes}
                  onItemsChange={setFfqItems}
                  onNotesChange={setFfqNotes}
                  filledCount={ffqFilledCount}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((step - 1) as NewClientStep)}>Geri</Button>
            ) : (
              <Button variant="outline" onClick={() => setNewOpen(false)}>İptal</Button>
            )}
            {step < 5 ? (
              <Button variant="primary" onClick={() => setStep((step + 1) as NewClientStep)}>
                Devam
              </Button>
            ) : (
              <Button variant="primary" onClick={submitNewClient} disabled={createClientMutation.isPending}>
                {createClientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailClientId(null)
        }}
      >
        <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>Danışan Detayı</ModalTitle>
            <ModalDescription className="text-text-secondary font-medium">
              {detail?.user ? `${detail.user.firstName ?? ''} ${detail.user.lastName ?? ''}`.trim() || '—' : 'Detay yükleniyor...'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="overflow-y-auto flex-1">
            {detailLoading && !detail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : detail ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-200 border border-surface-200 dark:border-surface-600">
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
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200">
                      <p className="text-text-secondary text-xs font-medium mb-1">Telefon</p>
                      <p className="text-sm font-medium text-text-primary">{detail.user?.phone ?? '—'}</p>
                    </div>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200">
                      <p className="text-text-secondary text-xs font-medium mb-1">E-posta</p>
                      <p className="text-sm font-medium text-text-primary truncate" title={detail.user?.email}>{detail.user?.email ?? '—'}</p>
                    </div>
                  </div>
                </div>

                {detail.dietician && (
                  <div>
                    <p className="form-section-title mb-2">Diyetisyen</p>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 flex items-center gap-3">
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
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {anamnezDisplayFields(detail.anamnezForm).map((f) => (
                          <div key={f.label}><span className="text-surface-500">{f.label}:</span> {f.value}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {detail.foodConsumptionRecord && (
                  <div>
                    <p className="form-section-title mb-2">Beslenme Anamnezi</p>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {foodDisplayFields(detail.foodConsumptionRecord).map((f) => (
                          <div key={f.label} className={f.label === 'Notlar' || f.label === 'Kaçınılan besinler' ? 'col-span-2' : undefined}>
                            <span className="text-surface-500">{f.label}:</span> {f.value}
                          </div>
                        ))}
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
                      <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 space-y-2 text-sm">
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
                          <div className="pt-2 border-t border-surface-200 dark:border-surface-600">
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
            ) : (
              <p className="text-sm text-surface-500 py-4">Detay bulunamadı.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDetailOpen(false); setDetailClientId(null) }}>Kapat</Button>
          </ModalFooter>
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
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Kit Ata</ModalTitle>
            <ModalDescription>
              {assignClient?.name ? `${assignClient.name} için stoktan kit seçin.` : 'Stoktan kit seçin.'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4">
            {myStockLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                <span className="ml-2 text-sm text-surface-500">Stok yükleniyor...</span>
              </div>
            ) : availableKits.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-surface-700">Uygun kit bulunamadi</p>
                <p className="text-xs text-surface-500 mt-1">Stogunuzda atanabilir kit yok.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-primary">Kit</p>
                <Select value={selectedKitId} onValueChange={setSelectedKitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kit seçin" />
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
              İptal
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
        <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>Kit Atama Detayı</ModalTitle>
            <ModalDescription className="text-text-secondary font-medium">
              {kitDetail ? `${kitDetail.clientName ?? '—'} • ${kitDetail.kitName ?? kitDetail.kitBarcode ?? '—'}` : 'Detay yükleniyor...'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="overflow-y-auto flex-1">
            {kitDetailLoading && !kitDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
              </div>
            ) : kitDetail ? (
              <div className="space-y-5">
                {needsLabSend(kitDetail.status) ? (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <Send className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Laboratuvara gönderilmedi</p>
                      <p className="text-[12px] mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                        Numune alındıysa aşağıdaki butonla laboratuvar sürecini başlatın.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-200 border border-surface-200 dark:border-surface-600">
                  <div className="shrink-0">
                    <Badge variant={kitStatusBadge(kitDetail.status).variant} size="sm">
                      {kitStatusBadge(kitDetail.status).label}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">
                      {kitDetail.kitName ?? kitDetail.kitBarcode ?? '—'}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                      {kitDetail.createdAt ? formatDateTime(kitDetail.createdAt) : '—'}
                      {kitDetail.updatedAt ? ` • Güncelleme: ${formatDateTime(kitDetail.updatedAt)}` : ''}
                    </p>
                  </div>
                </div>

                {(() => {
                  const steps = [
                    { key: 'in_client', label: 'Danışanda' },
                    { key: 'in_laboratory', label: 'Laboratuvarda' },
                    { key: 'in_expert', label: 'Uzmanda' },
                  ] as const
                  const status = kitDetail.status
                  const activeIndex = steps.findIndex((s) => s.key === status)
                  const isCancelled = status === 'cancelled'
                  const isDone = status === 'completed' || status === 'delivered'
                  const resolvedIndex = isDone ? steps.length - 1 : activeIndex
                  return (
                    <div>
                      <p className="form-section-title mb-2">Akış</p>
                      <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200">
                        <div className="flex items-center">
                          {steps.map((s, idx) => {
                            const isCompleted = !isCancelled && (isDone || resolvedIndex > idx)
                            const isCurrent = !isCancelled && !isDone && resolvedIndex === idx
                            const dotClass = isCancelled ? 'bg-surface-200' : isCompleted || isCurrent ? 'bg-primary-600' : 'bg-surface-200'
                            const ringClass = isCurrent ? 'ring-2 ring-primary-100' : ''
                            const textClass = isCancelled ? 'text-surface-400 dark:text-surface-500' : isCompleted || isCurrent ? 'text-text-primary' : 'text-surface-400 dark:text-surface-500'
                            const lineClass = isCancelled ? 'bg-surface-200' : isCompleted ? 'bg-primary-600' : 'bg-surface-200'
                            return (
                              <div key={s.key} className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <div className={`h-2.5 w-2.5 rounded-full ${dotClass} ${ringClass}`} />
                                  {idx < steps.length - 1 ? <div className={`h-[2px] flex-1 mx-2 ${lineClass}`} /> : null}
                                </div>
                                <div className={`mt-2 text-[11px] font-medium truncate ${textClass}`}>{s.label}</div>
                              </div>
                            )
                          })}
                        </div>
                        {isCancelled && <div className="mt-3 text-xs text-surface-500">Bu atama iptal edildi.</div>}
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <p className="form-section-title mb-2">Kit</p>
                  <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-surface-500">Barkod:</span> {kitDetail.kitBarcode ?? '—'}</div>
                      <div><span className="text-surface-500">Ad:</span> {kitDetail.kitName ?? '—'}</div>
                      <div><span className="text-surface-500">Aktif:</span> {kitDetail.kitIsActive == null ? '—' : kitDetail.kitIsActive ? 'Evet' : 'Hayır'}</div>
                      <div><span className="text-surface-500">Oluşturma:</span> {kitDetail.kitCreatedAt ? formatDateTime(kitDetail.kitCreatedAt) : '—'}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="form-section-title mb-2">Danışan</p>
                  <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="col-span-2"><span className="text-surface-500">Ad Soyad:</span> {kitDetail.clientName ?? '—'}</div>
                      <div><span className="text-surface-500">Telefon:</span> {kitDetail.clientPhone ?? '—'}</div>
                      <div className="min-w-0"><span className="text-surface-500">E-posta:</span> <span className="truncate inline-block max-w-full" title={kitDetail.clientEmail}>{kitDetail.clientEmail ?? '—'}</span></div>
                    </div>
                  </div>
                </div>

                {kitDetail.description?.trim() ? (
                  <div>
                    <p className="form-section-title mb-2">Açıklama</p>
                    <div className="rounded-lg border border-surface-200 dark:border-surface-600 p-3 bg-surface-50/50 dark:bg-surface-200 text-sm text-text-primary">{kitDetail.description}</div>
                  </div>
                ) : null}

                <div className="pt-1 border-t border-surface-200 text-xs text-surface-500 dark:text-surface-600">
                  Atama aktif: {kitDetail.isActive ? 'Evet' : 'Hayır'}
                </div>
              </div>
            ) : (
              <p className="text-sm text-surface-500 py-4">Detay bulunamadı.</p>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={() => setKitDetailOpen(false)}>Kapat</Button>
            {kitDetail && needsLabSend(kitDetail.status) ? (
              <Button
                variant="primary"
                onClick={() => {
                  setKitDetailOpen(false)
                  openEdit({
                    assignmentId: kitDetail.id!,
                    clientName: kitDetail.clientName,
                    kitName: kitDetail.kitName,
                    kitBarcode: kitDetail.kitBarcode,
                    status: kitDetail.status,
                  })
                }}
              >
                <Send className="h-4 w-4" />
                Laboratuvara Gönder
              </Button>
            ) : null}
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
            <ModalTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary-600" />
              Laboratuvara Gönder
            </ModalTitle>
            <ModalDescription className="text-text-secondary">
              {editTarget?.clientName
                ? `${editTarget.clientName} için atanan kit laboratuvar sürecine alınacak.`
                : 'Kit laboratuvar sürecine alınacak.'}
            </ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div className="rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50/80 dark:bg-surface-200/40 p-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">Kit</p>
                <p className="text-sm font-semibold text-text-primary">
                  {editTarget?.kitName
                    ? `${editTarget.kitName} • ${editTarget.kitBarcode ?? ''}`.trim()
                    : editTarget?.kitBarcode ?? '—'}
                </p>
              </div>
              {editTarget?.clientName ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">Danışan</p>
                  <p className="text-sm text-text-primary">{editTarget.clientName}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-surface-200 dark:border-surface-600">
                <span className="text-xs text-text-secondary">Mevcut durum</span>
                <Badge variant={kitStatusBadge(editTarget?.status).variant} size="sm">
                  {kitStatusBadge(editTarget?.status).label}
                </Badge>
              </div>
            </div>

            <p className="text-[13px] text-text-secondary leading-relaxed">
              Numune alındıktan sonra onaylayın. Kit durumu <span className="font-medium text-text-primary">Laboratuvarda</span> olarak güncellenir ve analiz süreci başlar.
            </p>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={sendToLabMutation.isPending}>
              İptal
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
                  Gönderiliyor...
                </>
              ) : (
                'Laboratuvara Gönder'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
