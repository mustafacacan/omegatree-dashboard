import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Users, MapPin, Phone,
  Loader2, Eye, FlaskConical, Package, Clock, CheckCircle, FileText,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Laboratory } from '@/types/laboratory.types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  getLaboratories,
  getLaboratoriesWithPagination,
  getLaboratoryById,
  ensureLaboratoryPrimaryKey,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
  getLabDietitianAssignments,
  assignDietitianToLab,
  getLaboratoriesStatistics,
  getLaboratoryStatisticsById,
  type LaboratoryStatisticsItem,
} from '@/services/laboratories.service'
import { getDieticians } from '@/services/kits.service'
import { getProvinces, getDistricts } from '@/services/turkey-addresses.service'
import { readVerifiedFromDieticianNode } from '@/lib/user-verified'
import { updateUser } from '@/services/users.service'
import { updateAddress } from '@/services/addresses.service'
import { UserRole } from '@/utils/constants'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }
const W = { olive: '#8B9A4B', orange: '#E8913A', amber: '#F5C842', green: '#6ABF69', warmGray: '#8A8578' }
const tooltipStyle = { borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px', border: '1px solid var(--color-border)', background: 'var(--color-panel)' }
function formatSecondsToHours(seconds: number | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  const h = seconds / 3600
  return `${Math.round(h * 10) / 10} saat`
}
function formatRate(rate: number | undefined) {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${Math.round(rate * 100)}%`
}

const LABS_QUERY_KEY = ['laboratories'] as const
const LAB_DIETITIANS_KEY = ['laboratory-dietitians'] as const
const DIETICIANS_KEY = ['dieticians'] as const
const labDetailQueryKey = (id: string) => ['laboratories', id, 'detail'] as const

type LabWithDietitians = Laboratory & { assignedDietitianDetails: { dieticianId: number; name: string }[] }

export function LaboratoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [newLabOpen, setNewLabOpen] = useState(false)
  const [editLabOpen, setEditLabOpen] = useState(false)
  const [assignDietitianOpen, setAssignDietitianOpen] = useState(false)
  const [deleteLabOpen, setDeleteLabOpen] = useState(false)
  const [viewLabOpen, setViewLabOpen] = useState(false)
  const [viewLabId, setViewLabId] = useState<string>('')
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null)
  const [selectedDietitianId, setSelectedDietitianId] = useState<string>('')
  const [statsDays, setStatsDays] = useState('30')
  const [selectedLabIdForStats, setSelectedLabIdForStats] = useState('all')

  const [newLabForm, setNewLabForm] = useState({
    companyName: '',
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
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null)

  const { data: provinces = [] } = useQuery({
    queryKey: ['turkey', 'provinces'],
    queryFn: getProvinces,
    enabled: newLabOpen || editLabOpen,
  })
  const { data: districts = [], isLoading: districtsLoading } = useQuery({
    queryKey: ['turkey', 'districts', selectedProvinceId],
    queryFn: () => getDistricts(selectedProvinceId!),
    enabled: (newLabOpen || editLabOpen) && selectedProvinceId != null,
  })

  useEffect(() => {
    if (!editLabOpen || !selectedLab?.city?.trim() || provinces.length === 0) return
    const city = selectedLab.city.trim()
    const match = provinces.find(
      (p) => p.name.localeCompare(city, 'tr', { sensitivity: 'accent' }) === 0
    )
    setSelectedProvinceId(match?.id ?? null)
  }, [editLabOpen, selectedLab?.id, selectedLab?.city, provinces])

  const trimmedSearch = useMemo(() => search.trim(), [search])
  const labsPageQuery = useQuery({
    queryKey: [...LABS_QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () =>
      getLaboratoriesWithPagination({
        page,
        limit: pageSize,
        search: trimmedSearch || undefined,
      }),
    retry: 1,
    placeholderData: keepPreviousData,
  })
  const laboratories = labsPageQuery.data?.items ?? []
  const labsTotalItems = labsPageQuery.data?.totalItems ?? laboratories.length
  const isLoading = labsPageQuery.isLoading
  const labsError = labsPageQuery.isError

  // Stats & lab dropdown need the full verified set (independent from paginated list).
  const { data: allLaboratories = [] } = useQuery({
    queryKey: [...LABS_QUERY_KEY, 'all'],
    queryFn: () => getLaboratories({ page: 1, limit: 2000 }),
    retry: 1,
  })

  const { data: labDietitianAssignments = [] } = useQuery({
    queryKey: LAB_DIETITIANS_KEY,
    queryFn: getLabDietitianAssignments,
    retry: 1,
  })

  const { data: dieticians = [] } = useQuery({
    queryKey: DIETICIANS_KEY,
    queryFn: () => getDieticians(),
  })

  const labDetailQuery = useQuery({
    queryKey: labDetailQueryKey(viewLabId || '0'),
    queryFn: () => getLaboratoryById(viewLabId),
    enabled: viewLabOpen && !!viewLabId,
    retry: 1,
  })

  const labStatsForModal = useQuery({
    queryKey: ['laboratories', viewLabId, 'statistics', 'modal'],
    queryFn: () => getLaboratoryStatisticsById(viewLabId, { days: 30 }),
    enabled: viewLabOpen && !!viewLabId,
    retry: 1,
  })

  const statsDaysLabel = useMemo(() => ({ '7': '7 gün', '30': '30 gün', '90': '90 gün' } as const)[statsDays] ?? `${statsDays} gün`, [statsDays])
  const {
    data: labsStats,
    isLoading: labsStatsLoading,
    isError: labsStatsError,
  } = useQuery({
    queryKey: ['laboratories', 'statistics', { days: Number(statsDays) }],
    queryFn: () => getLaboratoriesStatistics({ days: Number(statsDays) }),
    retry: 1,
  })
  const {
    data: labStatsById,
    isLoading: labStatsByIdLoading,
    isError: labStatsByIdError,
  } = useQuery({
    queryKey: ['laboratories', 'statistics', 'by-id', selectedLabIdForStats, { days: Number(statsDays) }],
    queryFn: () => getLaboratoryStatisticsById(Number(selectedLabIdForStats), { days: Number(statsDays) }),
    enabled: selectedLabIdForStats !== 'all',
    retry: 1,
  })
  const verifiedLaboratoryIds = useMemo(
    () => new Set(allLaboratories.filter((l) => l.isUserVerified === true).map((l) => l.id)),
    [allLaboratories]
  )

  const labsStatsVerified = useMemo(
    () => (labsStats ?? []).filter((item) => verifiedLaboratoryIds.has(String(item.laboratoryId))),
    [labsStats, verifiedLaboratoryIds]
  )

  const labStatsSummary = useMemo(() => {
    const list = labsStatsVerified
    return list.reduce(
      (acc, item) => {
        const t = item.totals
        acc.totalKits += Number(t?.totalKits ?? 0)
        acc.inProgressKits += Number(t?.inProgressKits ?? 0)
        acc.completedKits += Number(t?.completedKits ?? 0)
        acc.reportCount += Number(t?.reportCount ?? 0)
        return acc
      },
      { totalKits: 0, inProgressKits: 0, completedKits: 0, reportCount: 0 }
    )
  }, [labsStatsVerified])
  const labChartData = useMemo(() => {
    const list = labsStatsVerified
    return list.map((item) => {
      const name = [item.laboratoryUser?.firstName, item.laboratoryUser?.lastName].filter(Boolean).join(' ') || `Lab #${item.laboratoryId}`
      const totals = item.totals
      return {
        name: name.length > 12 ? name.slice(0, 10) + '…' : name,
        toplam: Number(totals?.totalKits ?? 0),
      }
    }).filter((d) => d.toplam > 0).slice(0, 10)
  }, [labsStatsVerified])
  const selectedFromStatsList: LaboratoryStatisticsItem | undefined = useMemo(() => {
    if (selectedLabIdForStats === 'all') return undefined
    return (labsStatsVerified ?? []).find((x) => Number(x.laboratoryId) === Number(selectedLabIdForStats))
  }, [labsStatsVerified, selectedLabIdForStats])

  const labsWithDietitians = useMemo(() => {
    const assignmentsByLabId = new Map<string, { dieticianId: number; name: string }[]>()
    for (const assignment of labDietitianAssignments) {
      const labId = String(assignment.laboratory?.id ?? '')
      if (!labId) continue
      const dietician = assignment.dietician
      if (!readVerifiedFromDieticianNode(dietician)) continue
      const dieticianUser = dietician?.user
      const name = [dieticianUser?.firstName, dieticianUser?.lastName].filter(Boolean).join(' ') || `Diyetisyen #${dietician?.id ?? ''}`
      const list = assignmentsByLabId.get(labId) ?? []
      list.push({ dieticianId: dietician?.id ?? 0, name })
      assignmentsByLabId.set(labId, list)
    }
    // Admin listesinde tüm laboratuvarlar gösterilmeli; doğrulanmamış yeniler de API'de vardır.
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
      if (!readVerifiedFromDieticianNode(dietician)) continue
      const dieticianUser = dietician?.user
      const name = [dieticianUser?.firstName, dieticianUser?.lastName].filter(Boolean).join(' ') || `Diyetisyen #${dietician?.id ?? ''}`
      list.push({ dieticianId: dietician?.id ?? 0, name })
    }
    return list
  }, [labDietitianAssignments, viewLabId])

  const filteredLaboratories = labsWithDietitians

  const allVerifiedLaboratoriesForSelect = useMemo(
    () => allLaboratories.filter((l) => l.isUserVerified === true),
    [allLaboratories]
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

  const saveLabEditMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLab) return

      const phoneDigits = newLabForm.phone.replace(/\D/g, '')
      const streetVal = newLabForm.street.trim() || '-'
      const neighborhoodVal = newLabForm.neighborhood.trim() || '-'
      const noVal = newLabForm.no.trim()
      const cityVal = newLabForm.city.trim()
      const districtVal = newLabForm.district.trim()
      const countryVal = newLabForm.country.trim() || 'Turkiye'
      const autoFull =
        newLabForm.fullAddress.trim() ||
        [streetVal !== '-' ? streetVal : null, noVal ? `No:${noVal}` : null, neighborhoodVal !== '-' ? neighborhoodVal : null, districtVal, cityVal, countryVal]
          .filter(Boolean)
          .join(', ')

      /** Form boş kaldıysa listedeki satırdan yedekle (race / focus kaybı) */
      const cargoFirm =
        newLabForm.cargofirm.trim() || selectedLab.cargofirm?.trim() || ''
      const cargoNum =
        newLabForm.cargoNumber.trim() || selectedLab.cargoNumber?.trim() || ''

      if (selectedLab.userId != null) {
        await updateUser(String(selectedLab.userId), {
          companyName: newLabForm.companyName.trim(),
          firstName: newLabForm.firstName.trim() || undefined,
          lastName: newLabForm.lastName.trim() || undefined,
          phone: phoneDigits,
          email: newLabForm.email.trim() || undefined,
          role: UserRole.LAB,
        })
      }

      if (selectedLab.addressId != null) {
        const titleRaw = newLabForm.addressTitle || 'work'
        const title =
          titleRaw === 'home' || titleRaw === 'work' || titleRaw === 'other' ? titleRaw : 'work'
        await updateAddress(selectedLab.addressId, {
          title,
          country: countryVal,
          city: cityVal,
          district: districtVal,
          street: streetVal,
          neighborhood: neighborhoodVal,
          no: noVal || undefined,
          fullAddress: autoFull || undefined,
          postalCode: newLabForm.postalCode.trim() || '00000',
        })
      }

      /** Kargo: liste `id` yanlış olabildiği için gerçek PK sunucudan çözülür (userId öncelikli). */
      const laboratoryPk = await ensureLaboratoryPrimaryKey(selectedLab)
      await updateLaboratory(laboratoryPk, {
        cargofirm: cargoFirm,
        cargoNumber: cargoNum,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LABS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['laboratories'] })
      toast.success('Laboratuvar güncellendi')
      setEditLabOpen(false)
      setSelectedLab(null)
      resetNewLabForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Güncelleme başarısız' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (lab: Laboratory) => {
      const pk = await ensureLaboratoryPrimaryKey(lab)
      await deleteLaboratory(pk)
    },
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
    setSelectedProvinceId(null)
    setNewLabForm({
      companyName: '',
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
    if (!newLabForm.companyName.trim()) {
      toast.error('Kurum adı zorunludur')
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
      companyName: newLabForm.companyName.trim(),
      firstName: newLabForm.firstName.trim() || undefined,
      lastName: newLabForm.lastName.trim() || undefined,
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

  /** Formu liste satırındaki veriden doldurur; GET detayı formu boşaltabildiği için kullanılmaz. */
  const openEditLab = (lab: Laboratory) => {
    setSelectedProvinceId(null)
    setEditLabOpen(true)
    setSelectedLab(lab)
    setNewLabForm({
      companyName: lab.companyName ?? '',
      firstName: lab.firstName ?? '',
      lastName: lab.lastName ?? '',
      phone: lab.phone ?? '',
      email: lab.email ?? '',
      gender: lab.gender === 'female' ? 'female' : 'male',
      cargofirm: lab.cargofirm ?? '',
      cargoNumber: lab.cargoNumber ?? '',
      city: lab.city ?? '',
      district: lab.district ?? '',
      street: lab.street ?? '',
      neighborhood: lab.neighborhood ?? '',
      no: lab.no ?? '',
      fullAddress: lab.fullAddress ?? '',
      postalCode: lab.postalCode ?? '',
      country: lab.country ?? 'Turkiye',
      addressTitle: lab.addressTitle ?? 'work',
    })

    if (lab.userId == null || lab.addressId == null) {
      getLaboratoryById(lab.id)
        .then((full) => {
          setSelectedLab((prev) => {
            if (!prev || prev.id !== lab.id) return prev
            return {
              ...prev,
              userId: full.userId ?? prev.userId,
              addressId: full.addressId ?? prev.addressId,
            }
          })
        })
        .catch(() => {})
    }
  }

  const submitEditLab = () => {
    if (!selectedLab) return
    if (!newLabForm.companyName.trim()) {
      toast.error('Kurum adı zorunludur')
      return
    }
    const phoneDigits = newLabForm.phone.replace(/\D/g, '')
    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
      toast.error('Telefon numarası 10 veya 11 haneli olmalıdır')
      return
    }
    if (!newLabForm.city.trim() || !newLabForm.district.trim()) {
      toast.error('Şehir ve ilçe zorunludur')
      return
    }
    const cargoFirmCheck =
      newLabForm.cargofirm.trim() || selectedLab.cargofirm?.trim() || ''
    const cargoNumCheck =
      newLabForm.cargoNumber.trim() || selectedLab.cargoNumber?.trim() || ''
    if (!cargoFirmCheck || !cargoNumCheck) {
      toast.error('Kargo firması ve kargo numarası zorunludur')
      return
    }
    saveLabEditMutation.mutate()
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
    void (async () => {
      try {
        const pk = await ensureLaboratoryPrimaryKey(selectedLab)
        assignDietitianMutation.mutate({
          laboratoryId: Number(pk),
          dieticianId: Number(selectedDietitianId),
        })
      } catch (err) {
        toast.error(getApiErrorMessage(err, { fallback: 'Laboratuvar çözümlenemedi' }))
      }
    })()
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
    deleteMutation.mutate(selectedLab)
  }

  const selectedLabDietitians = useMemo(() => {
    if (!selectedLab) return []
    const labData = labsWithDietitians.find((l: LabWithDietitians) => l.id === selectedLab.id)
    return labData?.assignedDietitianDetails ?? []
  }, [selectedLab, labsWithDietitians])

  const availableDietitians = useMemo(() => {
    const assignedIds = new Set(selectedLabDietitians.map((d: { dieticianId: number; name: string }) => d.dieticianId))
    return dieticians.filter((d: { id: number }) => !assignedIds.has(d.id))
  }, [dieticians, selectedLabDietitians])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-surface-100 p-1 rounded-xl">
            <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-panel data-[state=active]:shadow-sm">Liste</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-panel data-[state=active]:shadow-sm">İstatistikler</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
            <div className="panel">
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-900">Laboratuvarlar</h3>
                  <p className="text-[12px] mt-0.5 text-surface-500">
                    {isLoading ? 'Yükleniyor...' : `Kayıtlı laboratuvarlar (${labsTotalItems} adet)`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Laboratuvar ara..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                    />
                  </div>
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
                  totalItems={labsTotalItems}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    setPageSize(next)
                    setPage(1)
                  }}
                  onView={openViewLab}
                  onEdit={openEditLab}
                  onDelete={openDeleteLab}
                  onAssignDietitian={openAssignDietitian}
                />
              )}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <motion.div {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="panel p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-card-title">Laboratuvarlar (Son {statsDaysLabel})</h3>
                  <p className="text-[12px] mt-0.5 text-surface-500">Kit sayısına göre özet</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statsDays} onValueChange={setStatsDays}>
                    <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 gün</SelectItem>
                      <SelectItem value="30">30 gün</SelectItem>
                      <SelectItem value="90">90 gün</SelectItem>
                    </SelectContent>
                  </Select>
                  {labsStatsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                </div>
              </div>
              {labsStatsError ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-center">
                  <p className="text-[12px] font-semibold text-surface-800">İstatistikler yüklenemedi</p>
                </div>
              ) : (labsStatsVerified?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-6 flex flex-col items-center justify-center">
                  <FlaskConical className="h-10 w-10 text-surface-400" />
                  <p className="text-[12px] font-semibold text-surface-700 mt-2">Veri yok</p>
                </div>
              ) : (
                <>
                  {labChartData.length > 0 && (
                    <div className="h-[200px] mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={labChartData} barSize={24} barGap={6} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <defs>
                            <linearGradient id="barLabPage" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={W.olive} stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#A8B86A" stopOpacity={0.75} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" horizontal={false} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} />
                          <YAxis type="category" dataKey="name" width={68} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-surface-600)' }} />
                          <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [v?.toLocaleString('tr-TR') ?? '0', 'Kit']} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                          <Bar dataKey="toplam" fill="url(#barLabPage)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-surface-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-surface-100 border-b border-surface-200">
                          <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 py-2 text-surface-500">Laboratuvar</th>
                          <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2 text-surface-500">Toplam</th>
                          <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2 text-surface-500">Tamam</th>
                          <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2 text-surface-500">Oran</th>
                          <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2 text-surface-500">Ort. Süre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(labsStatsVerified ?? []).map((item) => {
                          const name = [item.laboratoryUser?.firstName, item.laboratoryUser?.lastName].filter(Boolean).join(' ') || `#${item.laboratoryId}`
                          const t = item.totals
                          return (
                            <tr key={item.laboratoryId} className="border-b border-surface-200 hover:bg-surface-50">
                              <td className="px-3 py-2"><p className="text-[12px] font-semibold text-surface-800 truncate max-w-[120px]">{name}</p></td>
                              <td className="px-3 py-2 text-right text-[12px] text-surface-700">{Number(t?.totalKits ?? 0).toLocaleString('tr-TR')}</td>
                              <td className="px-3 py-2 text-right text-[12px] text-surface-700">{Number(t?.completedKits ?? 0).toLocaleString('tr-TR')}</td>
                              <td className="px-3 py-2 text-right text-[12px] text-surface-700">{formatRate(item.interest?.completionRate)}</td>
                              <td className="px-3 py-2 text-right text-[12px] text-surface-700">{formatSecondsToHours(item.interest?.avgCompletionSeconds)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="panel p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-card-title">Seçili Laboratuvar</h3>
                  <p className="text-[12px] mt-0.5 text-surface-500">Son {statsDaysLabel} detayı</p>
                </div>
                <Select value={selectedLabIdForStats} onValueChange={setSelectedLabIdForStats}>
                  <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Laboratuvar seç" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü (özet)</SelectItem>
                    {allVerifiedLaboratoriesForSelect.map((l: Laboratory) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedLabIdForStats === 'all' ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-3">
                  <p className="text-[12px] font-semibold text-surface-800">Genel özet</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-surface-200 p-2.5">
                      <p className="text-[10px] uppercase text-surface-500">Toplam Kit</p>
                      <p className="text-lg font-bold text-surface-900">{labStatsSummary.totalKits.toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="rounded-lg border border-surface-200 p-2.5">
                      <p className="text-[10px] uppercase text-surface-500">Tamamlanan</p>
                      <p className="text-lg font-bold text-surface-900">{labStatsSummary.completedKits.toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="rounded-lg border border-surface-200 p-2.5">
                      <p className="text-[10px] uppercase text-surface-500">Rapor</p>
                      <p className="text-lg font-bold text-surface-900">{labStatsSummary.reportCount.toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                </div>
              ) : labStatsByIdLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
              ) : labStatsByIdError || !labStatsById ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4"><p className="text-[12px] text-surface-600">Yüklenemedi veya veri yok.</p></div>
              ) : (
                (() => {
                  const name = [labStatsById.laboratoryUser?.firstName, labStatsById.laboratoryUser?.lastName].filter(Boolean).join(' ') || selectedFromStatsList?.laboratoryUser?.firstName || `#${selectedLabIdForStats}`
                  const totals = labStatsById.totals
                  const interest = labStatsById.interest
                  const pending = Number(totals?.pendingKits ?? 0)
                  const inProgress = Number(totals?.inProgressKits ?? 0)
                  const completed = Number(totals?.completedKits ?? 0)
                  const cancelled = Number(totals?.cancelledKits ?? 0)
                  const totalN = pending + inProgress + completed + cancelled || 1
                  const statusItems = [
                    { label: 'Bekleyen', count: pending, color: W.amber },
                    { label: 'Devam Eden', count: inProgress, color: W.orange },
                    { label: 'Tamamlanan', count: completed, color: W.green },
                    { label: 'İptal', count: cancelled, color: W.warmGray },
                  ]
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-200">
                        <Avatar name={name} size="md" className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-surface-900 truncate">{name}</p>
                          <p className="text-[11px] text-surface-500 truncate">{labStatsById.laboratoryUser?.email ?? '—'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Toplam Kit', value: Number(totals?.totalKits ?? 0).toLocaleString('tr-TR'), icon: Package },
                          { label: 'Rapor', value: Number(totals?.reportCount ?? 0).toLocaleString('tr-TR'), icon: FileText },
                          { label: 'Tamamlama', value: formatRate(interest?.completionRate), icon: CheckCircle },
                          { label: 'Ort. Süre', value: formatSecondsToHours(interest?.avgCompletionSeconds), icon: Clock },
                        ].map((m) => {
                          const Icon = m.icon
                          return (
                          <div key={m.label} className="rounded-xl border border-surface-200 bg-surface-50 p-2.5 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                              <Icon className="h-3.5 w-3.5 text-primary-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] uppercase tracking-wider text-surface-500">{m.label}</p>
                              <p className="text-[13px] font-bold text-surface-900 truncate">{m.value}</p>
                            </div>
                          </div>
                          )
                        })}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 mb-2">Kit durumları</p>
                        <div className="space-y-2">
                          {statusItems.map((cat) => {
                            const pct = totalN > 0 ? Math.round((cat.count / totalN) * 100) : 0
                            return (
                              <div key={cat.label}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: cat.color }} />
                                    <span className="text-[11px] font-medium text-surface-700">{cat.label}</span>
                                  </div>
                                  <span className="text-[11px] font-bold text-surface-900">{cat.count}</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-100">
                                  <motion.div className="h-full rounded-full" style={{ background: cat.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 border border-surface-200">
                        <span className="text-[11px] font-medium text-surface-600">Son rapor</span>
                        <span className="text-[11px] font-semibold text-surface-800">{formatDateTime(totals?.lastReportAt)}</span>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

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
              {labDetailQuery.data
                ? (labDetailQuery.data.companyName?.trim() ||
                    labDetailQuery.data.name ||
                    'Laboratuvar bilgileri')
                : 'Laboratuvar bilgileri görüntüleniyor.'}
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
              <Tabs defaultValue="bilgi" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="bilgi">Bilgi</TabsTrigger>
                  <TabsTrigger value="stats">İstatistikler</TabsTrigger>
                </TabsList>
                <TabsContent value="bilgi" className="mt-0">
              <div className="space-y-5">
                {/* Hero kart: Avatar + isim + il/ilçe */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-200/40 border border-surface-200">
                  <Avatar
                    name={
                      labDetailQuery.data.companyName?.trim() ||
                      labDetailQuery.data.name ||
                      'Laboratuvar'
                    }
                    size="lg"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-surface-500">
                      {labDetailQuery.data.companyName?.trim() ? 'Kurum adı' : 'Laboratuvar'}
                    </p>
                    <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {labDetailQuery.data.name || '—'}
                    </p>
                    {(() => {
                      const sorumlu = [labDetailQuery.data.firstName, labDetailQuery.data.lastName]
                        .filter(Boolean)
                        .join(' ')
                        .trim()
                      const kurum = (
                        labDetailQuery.data.companyName?.trim() ||
                        labDetailQuery.data.name ||
                        ''
                      ).trim()
                      if (!sorumlu || sorumlu === kurum) return null
                      return (
                        <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">
                          Sorumlu: <span className="font-medium">{sorumlu}</span>
                        </p>
                      )
                    })()}
                    <p className="text-sm text-surface-500 mt-1">
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
                    {labDetailQuery.data.createdAt && `Kayıt: ${formatDate(labDetailQuery.data.createdAt)}`}
                  </p>
                </div>
              </div>
                </TabsContent>
                <TabsContent value="stats" className="mt-0">
                  {labStatsForModal.isLoading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
                  ) : labStatsForModal.isError || !labStatsForModal.data ? (
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-center">
                      <p className="text-[12px] text-surface-600">Son 30 güne ait istatistik yüklenemedi.</p>
                    </div>
                  ) : (
                    (() => {
                      const s = labStatsForModal.data
                      const totals = s.totals
                      const interest = s.interest
                      const pending = Number(totals?.pendingKits ?? 0)
                      const inProgress = Number(totals?.inProgressKits ?? 0)
                      const completed = Number(totals?.completedKits ?? 0)
                      const cancelled = Number(totals?.cancelledKits ?? 0)
                      const totalN = pending + inProgress + completed + cancelled || 1
                      const statusItems = [
                        { label: 'Bekleyen', count: pending, color: W.amber },
                        { label: 'Devam Eden', count: inProgress, color: W.orange },
                        { label: 'Tamamlanan', count: completed, color: W.green },
                        { label: 'İptal', count: cancelled, color: W.warmGray },
                      ]
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5">
                              <p className="text-[9px] uppercase text-surface-500">Toplam Kit</p>
                              <p className="text-lg font-bold text-surface-900">{Number(totals?.totalKits ?? 0).toLocaleString('tr-TR')}</p>
                            </div>
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5">
                              <p className="text-[9px] uppercase text-surface-500">Rapor</p>
                              <p className="text-lg font-bold text-surface-900">{Number(totals?.reportCount ?? 0).toLocaleString('tr-TR')}</p>
                            </div>
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5">
                              <p className="text-[9px] uppercase text-surface-500">Tamamlama oranı</p>
                              <p className="text-lg font-bold text-surface-900">{formatRate(interest?.completionRate)}</p>
                            </div>
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-2.5">
                              <p className="text-[9px] uppercase text-surface-500">Ort. süre</p>
                              <p className="text-lg font-bold text-surface-900">{formatSecondsToHours(interest?.avgCompletionSeconds)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-surface-500 mb-2">Kit durumları (son 30 gün)</p>
                            <div className="space-y-2">
                              {statusItems.map((cat) => {
                                const pct = totalN > 0 ? Math.round((cat.count / totalN) * 100) : 0
                                return (
                                  <div key={cat.label}>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: cat.color }} />
                                        <span className="text-[11px] font-medium text-surface-700">{cat.label}</span>
                                      </div>
                                      <span className="text-[11px] font-bold text-surface-900">{cat.count}</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-100">
                                      <motion.div className="h-full rounded-full" style={{ background: cat.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-50 border border-surface-200">
                            <span className="text-[11px] font-medium text-surface-600">Son rapor</span>
                            <span className="text-[11px] font-semibold text-surface-800">{formatDateTime(totals?.lastReportAt)}</span>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </TabsContent>
              </Tabs>
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
                  const lab = labsWithDietitians.find((l: LabWithDietitians) => l.id === viewLabId)
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
            <Input
              label="Kurum Adı *"
              value={newLabForm.companyName}
              onChange={(e) => setNewLabForm((s) => ({ ...s, companyName: e.target.value }))}
              placeholder="Laboratuvar adı"
            />
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
                <Select
                  value={selectedProvinceId != null ? String(selectedProvinceId) : ''}
                  onValueChange={(v) => {
                    const id = v ? Number(v) : null
                    const province = id ? provinces.find((p) => p.id === id) : null
                    setSelectedProvinceId(id)
                    setNewLabForm((s) => ({
                      ...s,
                      city: province?.name ?? '',
                      district: '',
                    }))
                  }}
                >
                  <SelectTrigger label="Şehir *" className="w-full">
                    <SelectValue placeholder="İl seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newLabForm.district}
                  onValueChange={(v) => setNewLabForm((s) => ({ ...s, district: v }))}
                  disabled={!selectedProvinceId || districtsLoading}
                >
                  <SelectTrigger label="İlçe *" className="w-full">
                    <SelectValue placeholder={districtsLoading ? 'Yükleniyor...' : selectedProvinceId ? 'İlçe seçin' : 'Önce il seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
               
                <Input
                  label="Mahalle"
                  value={newLabForm.neighborhood}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, neighborhood: e.target.value }))}
                  placeholder="Mahalle"
                />
                 <Input
                  label="Sokak"
                  value={newLabForm.street}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, street: e.target.value }))}
                  placeholder="Sokak adı"
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
      <Modal
        open={editLabOpen}
        onOpenChange={(open) => {
          setEditLabOpen(open)
          if (!open) {
            setSelectedLab(null)
            resetNewLabForm()
          }
        }}
      >
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Laboratuvar Düzenle</ModalTitle>
            <ModalDescription>
              {selectedLab
                ? `${selectedLab.name} — kurum, yetkili, kargo ve adres bilgilerini güncelleyin.`
                : 'Laboratuvar bilgilerini düzenleyin.'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto relative">
                <p className="form-section-title">Lab Sorumlusu</p>
                <Input
                  label="Kurum Adı *"
                  value={newLabForm.companyName}
                  onChange={(e) => setNewLabForm((s) => ({ ...s, companyName: e.target.value }))}
                  placeholder="Laboratuvar / kurum adı"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ad"
                    value={newLabForm.firstName}
                    onChange={(e) => setNewLabForm((s) => ({ ...s, firstName: e.target.value }))}
                    placeholder="Yetkili adı"
                  />
                  <Input
                    label="Soyad"
                    value={newLabForm.lastName}
                    onChange={(e) => setNewLabForm((s) => ({ ...s, lastName: e.target.value }))}
                    placeholder="Yetkili soyadı"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Telefon *"
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
                    <Select
                      value={selectedProvinceId != null ? String(selectedProvinceId) : ''}
                      onValueChange={(v) => {
                        const id = v ? Number(v) : null
                        const province = id ? provinces.find((p) => p.id === id) : null
                        setSelectedProvinceId(id)
                        setNewLabForm((s) => ({
                          ...s,
                          city: province?.name ?? '',
                          district: '',
                        }))
                      }}
                    >
                      <SelectTrigger label="Şehir *" className="w-full">
                        <SelectValue placeholder="İl seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newLabForm.district}
                      onValueChange={(v) => setNewLabForm((s) => ({ ...s, district: v }))}
                      disabled={!selectedProvinceId || districtsLoading}
                    >
                      <SelectTrigger label="İlçe *" className="w-full">
                        <SelectValue placeholder={districtsLoading ? 'Yükleniyor...' : selectedProvinceId ? 'İlçe seçin' : 'Önce il seçin'} />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <Input
                      label="Mahalle"
                      value={newLabForm.neighborhood}
                      onChange={(e) => setNewLabForm((s) => ({ ...s, neighborhood: e.target.value }))}
                      placeholder="Mahalle"
                    />
                    <Input
                      label="Sokak"
                      value={newLabForm.street}
                      onChange={(e) => setNewLabForm((s) => ({ ...s, street: e.target.value }))}
                      placeholder="Sokak adı"
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
                      placeholder="Tam adres"
                    />
                  </div>
                </div>
                {selectedLab?.userId == null && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg px-3 py-2">
                    Kullanıcı kaydı bulunamadı; kurum ve yetkili bilgileri kaydedilemeyebilir.
                  </p>
                )}
                {selectedLab?.addressId == null && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg px-3 py-2">
                    Adres kaydı bulunamadı; adres güncellemesi atlanacak.
                  </p>
                )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditLabOpen(false)
                setSelectedLab(null)
                resetNewLabForm()
              }}
              disabled={saveLabEditMutation.isPending}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={submitEditLab}
              disabled={saveLabEditMutation.isPending}
              loading={saveLabEditMutation.isPending}
            >
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
                  {selectedLabDietitians.map((d: { dieticianId: number; name: string }) => (
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

function LaboratoryTable({
  laboratories,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onAssignDietitian,
}: {
  laboratories: LabWithDietitians[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onView: (lab: Laboratory) => void
  onEdit: (lab: Laboratory) => void
  onDelete: (lab: Laboratory) => void
  onAssignDietitian: (lab: Laboratory) => void
}) {
  const detailQueries = useQueries({
    queries: laboratories.map((lab) => ({
      queryKey: ['laboratories', lab.id, 'detail'] as const,
      queryFn: () => getLaboratoryById(lab.id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const detailByLabId = useMemo(() => {
    const map: Record<string, { phone?: string; email?: string }> = {}
    laboratories.forEach((lab, i) => {
      const data = detailQueries[i]?.data
      if (data) map[lab.id] = { phone: data.phone, email: data.email }
    })
    return map
  }, [laboratories, detailQueries])

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kurum / Yetkili</th>
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
              laboratories.map((lab, rowIndex) => {
                const detail = detailByLabId[lab.id]
                const isLoadingDetail = detailQueries[rowIndex]?.isLoading
                const phone = lab.phone ?? detail?.phone
                const email = lab.email ?? detail?.email
                const personName = [lab.firstName, lab.lastName].filter(Boolean).join(' ').trim()
                const rowTitle = lab.name
                const rowSubtitle =
                  personName && personName !== lab.name.trim() ? personName : null
                const avatarLabel = lab.name
                return (
                <tr
                  key={lab.id}
                  className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={avatarLabel} size="sm" className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-surface-700 truncate" title={rowTitle}>
                          {rowTitle}
                        </p>
                        {rowSubtitle ? (
                          <p className="text-[11px] text-surface-500 truncate" title={rowSubtitle}>
                            {rowSubtitle}
                          </p>
                        ) : null}
                      </div>
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
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  )
}
