import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'
import { useCurrentUser } from '@/stores/auth.store'
import { Timeline } from '@/components/shared/timeline'
import { Card, CardContent, Button } from '@/components/ui'
import '@/components/ui'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDieticianClientKits } from '@/services/dietician-client-kits.service'
import type { DieticianClientKit } from '@/services/dietician-client-kits.service'
import { getResultsPage } from '@/services/results.service'
import { getDieticianClientKitStatusLabel } from '@/utils/constants'
import {
  Package,
  FileCheck,
  Heart,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  FlaskConical,
  Calendar,
  Info,
} from 'lucide-react'

type KitTimelineStatus = 'completed' | 'current' | 'upcoming' | 'error'

function kitBelongsToCurrentUser(kit: DieticianClientKit, user: ReturnType<typeof useCurrentUser>): boolean {
  if (!user) return false

  const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  const kitEmail = typeof kit.clientEmail === 'string' ? kit.clientEmail.trim().toLowerCase() : ''
  if (userEmail && kitEmail && userEmail === kitEmail) return true

  const n = typeof user.id === 'number' ? user.id : Number(user.id)
  if (!Number.isFinite(n)) return false

  return kit.clientUserId === n || kit.clientId === n
}

type DieticianClientKitStatusNormalized =
  | 'in_client'
  | 'in_laboratory'
  | 'in_expert'
  | 'delivered'
  | 'cancelled'
  | 'completed'

function normalizeKitStatus(status?: string | null): DieticianClientKitStatusNormalized | undefined {
  if (!status) return undefined
  const s = String(status).trim().toLowerCase().replace(/-/g, '_')
  if (
    s === 'in_client' ||
    s === 'in_laboratory' ||
    s === 'in_expert' ||
    s === 'delivered' ||
    s === 'cancelled' ||
    s === 'completed'
  ) {
    return s
  }
  return undefined
}

function buildKitTimeline(rawStatus?: string): Array<{ label: string; description?: string; status: KitTimelineStatus }> {
  const steps: Array<{ label: string; description?: string; status: KitTimelineStatus }> = [
    { label: 'Kit Talep Edildi', description: 'Diyetisyeniniz tarafindan', status: 'upcoming' },
    { label: 'Kit Teslim Alindi', description: 'Kargo ile gonderildi', status: 'upcoming' },
    { label: 'Numune Gonderildi', description: 'Kargo ile gonderildi', status: 'upcoming' },
    { label: 'Laboratuvar Analizi', description: 'Sonuclar hazirlaniyor...', status: 'upcoming' },
    { label: 'Uzman Degerlendirmesi', status: 'upcoming' },
    { label: 'Rapor Teslimi', status: 'upcoming' },
  ]

  const status = normalizeKitStatus(rawStatus)

  if (!status) {
    steps[0].status = 'current'
    steps[0].description = 'Kit kaydi bulunamadi'
    return steps
  }

  if (status === 'cancelled') {
    // Keep template; show cancellation as an error on the most relevant step.
    // We can't reliably infer the last completed stage, so mark the first step as error.
    steps[0].status = 'error'
    steps[0].description = 'Surec iptal edildi'
    return steps
  }

  // Map status -> the step that is currently active.
  // Earlier steps are completed, later steps are upcoming.
  const currentIndex = (() => {
    if (status === 'delivered' || status === 'in_client') return 1
    if (status === 'in_laboratory') return 3
    if (status === 'in_expert') return 4
    if (status === 'completed') return 5
    return 0
  })()

  for (let i = 0; i < steps.length; i += 1) {
    if (i < currentIndex) steps[i].status = 'completed'
    else if (i === currentIndex) steps[i].status = status === 'completed' ? 'completed' : 'current'
    else steps[i].status = 'upcoming'
  }

  return steps
}

function getStatusTitle(rawStatus?: string): string {
  const status = normalizeKitStatus(rawStatus)
  if (!status) return 'Kit Sureci'
  if (status === 'delivered' || status === 'in_client') return 'Numune Bekleniyor'
  if (status === 'in_laboratory') return 'Analiz Devam Ediyor'
  if (status === 'in_expert') return 'Uzman Degerlendiriyor'
  if (status === 'completed') return 'Rapor Hazir'
  if (status === 'cancelled') return 'Iptal Edildi'
  return 'Kit Sureci'
}

function getStatusDescription(rawStatus?: string): string {
  const status = normalizeKitStatus(rawStatus)
  if (!status) return 'Surec baslamadi veya kitiniz henuz tanimlanmadi.'
  if (status === 'delivered' || status === 'in_client') return 'Kit teslim alindi. Numunenizi gonderdikten sonra surec ilerleyecek.'
  if (status === 'in_laboratory') return 'Numuneniz laboratuvarda inceleniyor.'
  if (status === 'in_expert') return 'Uzman degerlendirmesi devam ediyor.'
  if (status === 'completed') return 'Raporunuz hazir. Raporlarim sayfasindan goruntuleyebilirsiniz.'
  if (status === 'cancelled') return 'Surec iptal edildi.'
  return 'Surec devam ediyor.'
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function DanisanPortalPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Gunaydin' : hour < 18 ? 'Iyi gunler' : 'Iyi aksamlar'

  const currentUserId = useMemo(() => {
    if (user?.id == null) return null
    const n = typeof user.id === 'number' ? user.id : Number(user.id)
    return Number.isFinite(n) ? n : null
  }, [user?.id])

  const kitsQuery = useQuery({
    queryKey: ['dietician-client-kits', 'danisan', 'page-1', 'limit-200', currentUserId, user?.email ?? null],
    queryFn: () => getDieticianClientKits(1, 200),
    enabled: user != null,
    retry: 1,
    staleTime: 30_000,
  })

  const activeKit = useMemo(() => {
    const all = kitsQuery.data ?? []

    // Safety: if backend returns more than current user's records,
    // ensure we still match even when user.id is not numeric.
    const list = user ? all.filter((k) => kitBelongsToCurrentUser(k, user)) : []

    const sorted = [...list].sort((a, b) => {
      const aT = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bT = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bT - aT
    })

    return sorted.find((k) => k.status !== 'cancelled') ?? sorted[0] ?? null
  }, [kitsQuery.data, user])

  const kitTimeline = useMemo(() => buildKitTimeline(activeKit?.status), [activeKit?.status])

  const reportsQuery = useQuery({
    queryKey: ['results', 'danisan', 'approved', 'portal'],
    queryFn: () => getResultsPage({ page: 1, limit: 1, status: 'approved' }),
    retry: 1,
    staleTime: 30_000,
  })

  const approvedReportCount = reportsQuery.data?.totalItems ?? 0

  const statusTitle = useMemo(() => {
    const status = normalizeKitStatus(activeKit?.status)
    const awaitingAdminApproval =
      status === 'completed' && !reportsQuery.isLoading && approvedReportCount === 0
    return awaitingAdminApproval ? 'Rapor Admin Onayında' : getStatusTitle(activeKit?.status)
  }, [activeKit?.status, approvedReportCount, reportsQuery.isLoading])

  const statusDescription = useMemo(() => {
    const status = normalizeKitStatus(activeKit?.status)
    const awaitingAdminApproval =
      status === 'completed' && !reportsQuery.isLoading && approvedReportCount === 0
    return awaitingAdminApproval
      ? 'Uzman raporu onaya gönderdi. Yönetici onayından sonra raporunuz Raporlarım sayfasında görünecek.'
      : getStatusDescription(activeKit?.status)
  }, [activeKit?.status, approvedReportCount, reportsQuery.isLoading])

  const completedSteps = kitTimeline.filter(s => s.status === 'completed').length
  const totalSteps = kitTimeline.length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══ GREETING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <h1 className="text-[22px] font-bold text-surface-900">
          {greeting}, {user?.firstName ?? 'Danisan'}! <span className="inline-block">&#x1F44B;</span>
        </h1>
        <p className="text-[13px] mt-0.5 text-surface-500">
          Omega-3 Index kit ve raporlariniza buradan ulasabilirsiniz
        </p>
      </motion.div>

      {/* ═══ PROGRESS SUMMARY ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-semibold text-surface-900">Kit Surecim</h3>
                <p className="text-[12px] mt-0.5 text-surface-500">Mevcut kitinizin durumu</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary-600">
                  {kitsQuery.isLoading ? '—' : `${progressPct}%`}
                </p>
                <p className="text-[10px] text-surface-500">Tamamlanan</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 rounded-full overflow-hidden mb-1 bg-surface-200">
              <motion.div
                className="h-full rounded-full bg-primary-600"
                initial={{ width: 0 }}
                animate={{ width: `${kitsQuery.isLoading ? 0 : progressPct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-[10px] text-right text-surface-500">
              {kitsQuery.isLoading ? 'Yukleniyor...' : `${completedSteps}/${totalSteps} adim tamamlandi`}
            </p>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mt-4">
              {kitTimeline.map((step, i) => {
                const isComplete = step.status === 'completed'
                const isCurrent = step.status === 'current'
                const isError = step.status === 'error'

                const stepClass = isComplete
                  ? 'bg-primary-600 text-white'
                  : isError
                    ? 'bg-danger/10 text-danger border border-danger/30'
                    : isCurrent
                      ? 'bg-warning/10 text-warning border border-warning/30'
                      : 'bg-surface-200 text-surface-500'

                const lineClass = isComplete ? 'bg-primary-600' : isError ? 'bg-danger/30' : isCurrent ? 'bg-warning/30' : 'bg-surface-200'

                return (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${stepClass}`}>
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isError ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < kitTimeline.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${lineClass}`} />}
                  </div>
                )
              })}
            </div>

            {/* Step names */}
            <div className="hidden sm:grid mt-2 gap-2" style={{ gridTemplateColumns: `repeat(${kitTimeline.length}, minmax(0, 1fr))` }}>
              {kitTimeline.map((step, i) => {
                const cls =
                  step.status === 'completed'
                    ? 'text-primary-700'
                    : step.status === 'error'
                      ? 'text-danger'
                      : step.status === 'current'
                        ? 'text-warning'
                        : 'text-surface-400'

                return (
                  <div key={i} className="min-w-0">
                    <p className={`text-[10px] leading-tight text-center truncate ${cls}`}>{step.label}</p>
                  </div>
                )
              })}
            </div>

            {!kitsQuery.isLoading && !activeKit ? (
              <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600">
                Henuz kit kaydiniz bulunamadi.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid grid-cols-12 gap-4">

        {/* Kit Timeline Detail */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <Card className="h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-surface-900">Detayli Surec</h3>
                <Button variant="link" size="sm" onClick={() => navigate(ROUTES.DANISAN_KIT)} className="h-auto p-0 text-[11px]">
                  Detay <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <Timeline steps={kitTimeline} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Info Cards */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">

            {/* Kit Status */}
            <div
              className="cursor-pointer"
              onClick={() => navigate(ROUTES.DANISAN_KIT)}
            >
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-warning/10">
                    <FlaskConical className="h-5 w-5 text-warning" />
                  </div>
                  <h4 className="text-[14px] font-semibold mb-1 text-surface-900">{statusTitle}</h4>
                  <p className="text-[12px] leading-relaxed text-surface-500">{statusDescription}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-warning">
                    <Clock className="h-3 w-3" /> {`Durum: ${getDieticianClientKitStatusLabel(activeKit?.status)}`}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports */}
            <div
              className="cursor-pointer"
              onClick={() => navigate(ROUTES.DANISAN_RAPORLAR)}
            >
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-primary-50">
                    <FileCheck className="h-5 w-5 text-primary-600" />
                  </div>
                  <h4 className="text-[14px] font-semibold mb-1 text-surface-900">Raporlarim</h4>
                  <p className="text-[12px] leading-relaxed text-surface-500">
                    Tamamlanan analiz raporlarinizi goruntuleyebilir ve indirebilirsiniz.
                  </p>
                  <p className="text-[11px] mt-2 text-surface-400">
                    {reportsQuery.isLoading ? 'Yukleniyor...' : `Onayli rapor: ${approvedReportCount}`}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium text-primary-600">
                    Raporlara Git <ArrowRight className="h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Dietitian Info */}
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-success/10">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <h4 className="text-[14px] font-semibold mb-1 text-surface-900">Diyetisyenim</h4>
                <p className="text-[12px] text-surface-500">{activeKit?.dieticianName ?? '—'}</p>
                <p className="text-[11px] mt-1 text-surface-400">{activeKit?.dieticianPhone ?? '—'}</p>
              </CardContent>
            </Card>

            {/* Kit Info */}
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-surface-100">
                  <Package className="h-5 w-5 text-surface-600" />
                </div>
                <h4 className="text-[14px] font-semibold mb-1 text-surface-900">Kit Bilgilerim</h4>
                <code className="text-[12px] font-mono text-primary-600">{activeKit?.kitBarcode ?? '—'}</code>
                <p className="text-[11px] mt-1 text-surface-400">{activeKit?.kitName ?? '—'}</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* ═══ INFO CARD ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-success/10">
                <Heart className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-surface-900">Omega-3 Index Nedir?</p>
                <p className="text-[13px] mt-1 leading-relaxed text-surface-600">
                  Kaninizdaki omega-3 yag asitleri (EPA ve DHA) seviyesini olcen bir testtir.
                  Ideal deger %8 ve uzeridir. Sonuclar diyetisyeniniz tarafindan degerlendirilecek
                  ve size ozel beslenme onerileri hazirlanacaktir.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-success">
                    <Info className="h-3 w-3" /> Detayli bilgi
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

