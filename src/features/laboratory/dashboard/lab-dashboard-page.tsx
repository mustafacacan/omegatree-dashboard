import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody } from '@/components/ui'
import { motion } from 'framer-motion'
import {
  TestTubes, FlaskConical, CheckCircle, ArrowUpRight,
  ShieldCheck, Zap, XCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ROUTES } from '@/utils/routes'
import { formatDate, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Eye } from 'lucide-react'
import { getLaboratoryKitById, getLaboratoryKitsPage, type LabKitStatus, type LaboratoryKit } from '@/services/laboratory-kits.service'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
  red: '#C53030', redLight: '#FDE8E8',
}

function getStatusLabel(status?: LabKitStatus) {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'in_progress') return 'Islemde'
  if (status === 'cancelled') return 'Iptal'
  if (status === 'completed') return 'Tamamlandi'
  return 'Bilinmiyor'
}

function getKitBarcode(kit: LaboratoryKit) {
  return kit.kitId?.kitBarcode ?? `#${kit.id}`
}

function ymdLocal(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayShortTr(date: Date) {
  // JS: 0=Sun
  const map = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt']
  return map[date.getDay()] ?? '—'
}

function toValidDate(input: string | undefined) {
  if (!input) return null
  const d = new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

const tooltipStyle = { background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function LabDashboardPage() {
  const navigate = useNavigate()

  const pendingQuery = useQuery({
    queryKey: ['laboratory-kits', 'dashboard', 'pending'],
    queryFn: () => getLaboratoryKitsPage({ page: 1, status: 'pending' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const inProgressQuery = useQuery({
    queryKey: ['laboratory-kits', 'dashboard', 'in_progress'],
    queryFn: () => getLaboratoryKitsPage({ page: 1, status: 'in_progress' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const cancelledQuery = useQuery({
    queryKey: ['laboratory-kits', 'dashboard', 'cancelled'],
    queryFn: () => getLaboratoryKitsPage({ page: 1, status: 'cancelled' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const completedQuery = useQuery({
    queryKey: ['laboratory-kits', 'dashboard', 'completed'],
    queryFn: () => getLaboratoryKitsPage({ page: 1, status: 'completed' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const bekliyorCount = pendingQuery.data?.totalItems ?? 0
  const islemdeCount = inProgressQuery.data?.totalItems ?? 0
  const iptalCount = cancelledQuery.data?.totalItems ?? 0
  const tamamlananCount = completedQuery.data?.totalItems ?? 0

  const pipelinePieData = useMemo(() => {
    const items: { name: string; value: number; color: string; status: string }[] = []
    if (bekliyorCount > 0) items.push({ name: getStatusLabel('pending'), value: bekliyorCount, color: W.amber, status: 'pending' })
    if (islemdeCount > 0) items.push({ name: getStatusLabel('in_progress'), value: islemdeCount, color: W.orange, status: 'in_progress' })
    if (iptalCount > 0) items.push({ name: getStatusLabel('cancelled'), value: iptalCount, color: W.red, status: 'cancelled' })
    if (tamamlananCount > 0) items.push({ name: getStatusLabel('completed'), value: tamamlananCount, color: W.green, status: 'completed' })
    return items.length ? items : [{ name: 'Veri yok', value: 1, color: W.creamDark, status: 'none' }]
  }, [bekliyorCount, islemdeCount, iptalCount, tamamlananCount])

  const queueItems = useMemo(() => {
    const items = pendingQuery.data?.items ?? []
    return [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((k) => ({
        id: k.id,
        barcode: getKitBarcode(k),
        receivedAt: formatDateTime(k.createdAt),
        status: k.status,
      }))
  }, [pendingQuery.data?.items])

  const recentCompleted = useMemo(() => {
    const items = completedQuery.data?.items ?? []
    return [...items]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5)
      .map((k) => ({
        id: k.id,
        barcode: getKitBarcode(k),
        completedAt: formatDate(k.updatedAt || k.createdAt),
        status: k.status,
      }))
  }, [completedQuery.data?.items])

  const totalPipeline = bekliyorCount + islemdeCount + iptalCount + tamamlananCount
  const performanceValue = totalPipeline > 0 ? Math.round((tamamlananCount / totalPipeline) * 100) : 0
  const performanceData = [{ name: 'Verimlilik', value: performanceValue, fill: W.olive }]

  const dailyAnalysis = useMemo(() => {
    const now = new Date()
    const days: Array<{ day: string; key: string; date: Date }> = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push({ day: dayShortTr(d), key: ymdLocal(d), date: d })
    }

    const gelenMap: Record<string, number> = {}
    const tamamlananMap: Record<string, number> = {}
    days.forEach((d) => {
      gelenMap[d.key] = 0
      tamamlananMap[d.key] = 0
    })

    const pendingItems = pendingQuery.data?.items ?? []
    const inProgressItems = inProgressQuery.data?.items ?? []
    const completedItems = completedQuery.data?.items ?? []

    for (const item of [...pendingItems, ...inProgressItems]) {
      const dt = toValidDate(item.createdAt)
      if (!dt) continue
      const key = ymdLocal(dt)
      if (key in gelenMap) gelenMap[key] += 1
    }
    for (const item of completedItems) {
      const dt = toValidDate(item.updatedAt || item.createdAt)
      if (!dt) continue
      const key = ymdLocal(dt)
      if (key in tamamlananMap) tamamlananMap[key] += 1
    }

    return days.map((d) => ({
      day: d.day,
      gelen: gelenMap[d.key] ?? 0,
      tamamlanan: tamamlananMap[d.key] ?? 0,
    }))
  }, [pendingQuery.data?.items, inProgressQuery.data?.items, completedQuery.data?.items])

  const avgCompletionDays = useMemo(() => {
    const items = completedQuery.data?.items ?? []
    const durations: number[] = []
    for (const item of items) {
      const start = toValidDate(item.createdAt)
      const end = toValidDate(item.updatedAt || item.createdAt)
      if (!start || !end) continue
      const ms = end.getTime() - start.getTime()
      if (Number.isFinite(ms) && ms >= 0) durations.push(ms)
    }
    if (!durations.length) return null
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
    return avgMs / (1000 * 60 * 60 * 24)
  }, [completedQuery.data?.items])

  const [detailId, setDetailId] = useState<number | null>(null)
  const detailQuery = useQuery({
    queryKey: ['laboratory-kits', 'dashboard', 'detail', detailId],
    queryFn: () => getLaboratoryKitById(detailId as number),
    enabled: detailId != null,
    retry: 1,
  })
  const selectedKit = detailQuery.data ?? null

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══ GREETING + Hizli baglantilar ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-surface-900">Laboratuvar Paneli</h1>
          <p className="text-[13px] mt-0.5 text-surface-500">Numune havuzu, analiz surecleri ve performans ozeti</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)} className="gap-1.5">
            <TestTubes className="h-4 w-4" />
            Numune Havuzu
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_ANALIZ)} className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Analizler
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_SONUCLAR)} className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Sonuclar
          </Button>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS — Statusa gore istatistikler ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: getStatusLabel('pending'), value: String(bekliyorCount), icon: TestTubes, iconColor: W.amber, iconBg: W.amberLight },
          { title: getStatusLabel('in_progress'), value: String(islemdeCount), icon: FlaskConical, iconColor: W.orange, iconBg: W.orangeLight },
          { title: getStatusLabel('cancelled'), value: String(iptalCount), icon: XCircle, iconColor: W.red, iconBg: W.redLight },
          { title: getStatusLabel('completed'), value: String(tamamlananCount), icon: CheckCircle, iconColor: W.green, iconBg: W.greenLight },
        ].map((s, i) => {
          const Icon = s.icon
          return (
          <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
            <div className="rounded-2xl p-5 transition-shadow hover:shadow-md bg-panel border border-surface-200">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                  <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">{s.title}</p>
                  <span className="text-xl font-bold text-surface-900">{s.value}</span>
                </div>
              </div>
            </div>
          </motion.div>
          )
        })}
      </div>

      {/* ═══ ROW 1: Daily Chart + Pipeline Donut ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-5 bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold text-surface-900">Haftalik Analiz Trendi</h3>
                <p className="text-[12px] mt-0.5 text-surface-500">Gelen numuneler vs tamamlanan analizler</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-orange-400" /><span className="text-[10px] text-surface-500">Gelen</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary-500" /><span className="text-[10px] text-surface-500">Tamamlanan</span></div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyAnalysis} barGap={4} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} />
                  <ReTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="gelen" fill={W.orange} radius={[6, 6, 0, 0]} name="Gelen" opacity={0.8} />
                  <Bar dataKey="tamamlanan" fill={W.olive} radius={[6, 6, 0, 0]} name="Tamamlanan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-surface-900">Duruma Gore Istatistik</h3>
              <span className="text-xl font-black text-surface-900">{totalPipeline}</span>
            </div>
            <div className="relative h-[150px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelinePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pipelinePieData.map((e) => <Cell key={e.status} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-lg font-black text-surface-900">{totalPipeline}</p>
                  <p className="text-[9px] text-surface-500">Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {pipelinePieData.map((item) => (
                <div key={item.status} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-[12px] flex-1 text-surface-700">{item.name}</span>
                  <span className="text-[12px] font-bold text-surface-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ ROW 2: Queue + Completed + Performance ═══ */}
      <div className="grid grid-cols-12 gap-4">

        {/* Queue */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <h3 className="text-[15px] font-semibold text-surface-900">Numune Sirasi</h3>
              </div>
              <button type="button" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Havuza Git <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {queueItems.length === 0 ? (
                <p className="text-[12px] text-surface-500 py-4 text-center">Havuzda bekleyen numune yok</p>
              ) : (
                queueItems.map((item) => (
                  <div key={item.barcode} className="flex items-center justify-between p-3 rounded-xl transition-colors bg-surface-50 hover:bg-surface-100">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-orange-100 dark:bg-orange-900/30">
                        <TestTubes className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <button type="button" onClick={() => setDetailId(item.id)} className="text-left block w-full">
                          <code className="text-[12px] font-mono font-bold hover:underline text-surface-900">{item.barcode}</code>
                        </button>
                        <p className="text-[10px] text-surface-500">Gelis: {item.receivedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="xs" onClick={() => setDetailId(item.id)} title="Detay"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="default" size="xs" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)}>Sec</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Recent completed */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <h3 className="text-[15px] font-semibold mb-4 text-surface-900">Son Tamamlananlar</h3>
            <div className="space-y-3">
              {recentCompleted.length === 0 ? (
                <p className="text-[12px] text-surface-500 py-4 text-center">Henuz tamamlanan yok</p>
              ) : (
                recentCompleted.map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => setDetailId(item.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-90 transition-opacity bg-green-100 dark:bg-green-900/30"
                  >
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-green-200 dark:bg-green-800/50">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-bold block text-green-800 dark:text-green-200">{item.barcode}</code>
                      <p className="text-[10px] text-green-700 dark:text-green-300">{item.completedAt}</p>
                    </div>
                    <Eye className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                  </button>
                ))
              )}
            </div>

            {/* Kor Protocol mini */}
            <div className="rounded-xl p-4 mt-4 text-center bg-surface-800 dark:bg-surface-700">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-2 bg-primary-500/20">
                <ShieldCheck className="h-5 w-5 text-primary-400" />
              </div>
              <p className="text-[11px] font-semibold text-white">Kor Protokol Aktif</p>
              <p className="text-[10px] mt-1 text-surface-400">Danisan bilgileri gizlidir</p>
            </div>
          </div>
        </motion.div>

        {/* Performance gauge */}
        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <h3 className="text-[15px] font-semibold mb-2 text-surface-900">Verimlilik</h3>
            <div className="flex flex-col items-center">
              <div className="h-[120px] w-[120px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={performanceData}>
                    <RadialBar background={{ fill: 'var(--color-surface-200)' }} dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-black text-surface-900">{performanceValue}<span className="text-sm text-surface-500">%</span></p>
                </div>
              </div>
              <p className="text-[11px] text-center mt-2 text-surface-500">Zamaninda tamamlanma</p>

              <div className="w-full space-y-3 mt-4 pt-4 border-t border-surface-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-surface-500">Ort. Sure</span>
                    <span className="text-[10px] font-bold text-primary-600">
                      {avgCompletionDays == null ? '—' : `${avgCompletionDays.toFixed(1)} gun`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-200">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: avgCompletionDays == null ? '0%' : `${Math.min(100, Math.max(0, (avgCompletionDays / 7) * 100))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-surface-500">Kalite Skoru</span>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">4.9/5</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-200">
                    <div className="h-full rounded-full bg-green-500" style={{ width: '98%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Kit detay modali */}
      <Modal open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Kit / Numune Detayi</ModalTitle>
            <ModalDescription>{selectedKit ? getKitBarcode(selectedKit) : detailId != null ? `#${detailId}` : ''}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {detailQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-surface-500">Yukleniyor...</div>
            ) : detailQuery.isError ? (
              <div className="py-10 text-center text-sm text-surface-500">
                {getApiErrorMessage(detailQuery.error, { fallback: 'Detay yuklenemedi.' })}
              </div>
            ) : selectedKit ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{getKitBarcode(selectedKit)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{getStatusLabel(selectedKit.status)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Olusturma</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Guncelleme</p>
                  <p>{formatDateTime(selectedKit.updatedAt)}</p>
                </div>
                {selectedKit.status === 'cancelled' && selectedKit.reasonForCancellation ? (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Iptal Sebebi</p>
                    <p className="text-surface-700 text-sm mt-0.5 leading-snug">{selectedKit.reasonForCancellation}</p>
                  </div>
                ) : null}
                {/* Kor analiz: Lab sadece barkod gorur; diyetisyen/danisan adi gosterilmez */}
              </div>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
