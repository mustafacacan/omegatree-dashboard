import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { Avatar } from '@/components/ui'
import { KitStatus } from '@/utils/constants'
import { ROUTES, danisanDetayPath } from '@/utils/routes'
import { useCurrentUser } from '@/stores/auth.store'
import { useDietitianSettingsStore } from '@/stores/dietitian-settings.store'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getDietitiansAssignedLaboratory } from '@/services/laboratories.service'
import { getClientsByDietician } from '@/services/dietician-clients.service'
import { type DieticianClientKit, getDieticianClientKits } from '@/services/dietician-client-kits.service'
import { getMyStockList } from '@/services/stocks.service'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Users, FlaskConical, Package, FileCheck, TrendingUp, TrendingDown,
  ArrowUpRight, Clock, MapPin,
  CheckCircle, AlertTriangle,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

const MONTH_LABELS_TR = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara']

function toTs(input: string | null | undefined): number | null {
  if (!input) return null
  const d = new Date(input)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

function formatRelativeTimeTR(nowTs: number, dateTs: number | null): string {
  if (!dateTs) return '—'
  const diffMs = Math.max(0, nowTs - dateTs)
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Az once'
  if (mins < 60) return `${mins} dk once`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat once`
  const days = Math.floor(hours / 24)
  return `${days} gun once`
}

function mapDieticianKitStatusToKitStatus(status: DieticianClientKit['status'] | undefined): KitStatus {
  switch (status) {
    case 'in_client':
      return KitStatus.CLIENT_RECEIVED
    case 'delivered':
      return KitStatus.DELIVERED
    case 'in_laboratory':
      return KitStatus.IN_ANALYSIS
    case 'in_expert':
      return KitStatus.SPECIALIST_POOL
    case 'completed':
      return KitStatus.COMPLETED
    case 'cancelled':
      return KitStatus.REJECTED
    default:
      return KitStatus.ASSIGNED
  }
}

function getKitTimelineStepIndex(status: DieticianClientKit['status'] | undefined): number {
  switch (status) {
    case 'in_client':
      return 1
    case 'delivered':
      return 2
    case 'in_laboratory':
      return 3
    case 'in_expert':
      return 4
    case 'completed':
      return 5
    case 'cancelled':
      return 0
    default:
      return 0
  }
}

const tooltipStyle = { background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function DietitianDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { minStockAlert } = useDietitianSettingsStore()

  const [now] = useState(() => new Date())
  const nowTs = now.getTime()

  const {
    data: assignedLab,
    isLoading: assignedLabLoading,
  } = useQuery({
    queryKey: ['laboratory-dietician', 'dieticians-view-laboratory', 'laboratory'],
    queryFn: getDietitiansAssignedLaboratory,
  })

  const { data: clientsPage } = useQuery({
    queryKey: ['dieticians', 'get-clients-by-dietician', { page: 1, limit: 200 }],
    queryFn: () => getClientsByDietician({ page: 1, limit: 200 }),
  })

  const { data: kits } = useQuery({
    queryKey: ['dietician-client-kits', { page: 1, limit: 500 }],
    queryFn: () => getDieticianClientKits(1, 500),
  })

  const { data: myStockList } = useQuery({
    queryKey: ['stocks', 'my-stock'],
    queryFn: () => getMyStockList(),
  })

  const greeting = useMemo(() => {
    const hour = now.getHours()
    return hour < 12 ? 'Gunaydin' : hour < 18 ? 'Iyi gunler' : 'Iyi aksamlar'
  }, [now])

  const clientsItems = useMemo(() => clientsPage?.items ?? [], [clientsPage])
  const clientsTotal = clientsPage?.totalItems ?? clientsItems.length

  const stockList = useMemo(() => myStockList ?? [], [myStockList])

  const availableStockCount = useMemo(() => {
    return stockList.filter((s) => s.status === 'available').length
  }, [stockList])

  const kitList = useMemo(() => kits ?? [], [kits])
  const assignedKits = useMemo(() => kitList.filter((k) => !!k.clientId), [kitList])
  const activeKits = useMemo(
    () => assignedKits.filter((k) => (k.status ?? 'in_client') !== 'completed' && (k.status ?? 'in_client') !== 'cancelled'),
    [assignedKits]
  )
  const completedKitsCount = useMemo(() => kitList.filter((k) => k.status === 'completed').length, [kitList])

  const deltaLast30Days = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000
    const nowMs = nowTs
    const lastStart = nowMs - 30 * DAY
    const prevStart = nowMs - 60 * DAY

    const countInRange = (timestamps: Array<number | null>, start: number, end: number): number =>
      timestamps.reduce<number>((acc, t) => (t != null && t >= start && t < end ? acc + 1 : acc), 0)

    const clientCreatedTs = clientsItems.map((c) => toTs(c.createdAt))
    const kitsCreatedTs = kitList.map((k) => toTs(k.createdAt ?? k.kitCreatedAt ?? k.kitUpdatedAt))
    const stockCreatedTs = stockList.map((s) => toTs(s.createdAt))
    const completedUpdatedTs = kitList
      .filter((k) => k.status === 'completed')
      .map((k) => toTs(k.updatedAt ?? k.kitUpdatedAt ?? k.createdAt))

    return {
      clients: countInRange(clientCreatedTs, lastStart, nowMs) - countInRange(clientCreatedTs, prevStart, lastStart),
      activeKits: countInRange(kitsCreatedTs, lastStart, nowMs) - countInRange(kitsCreatedTs, prevStart, lastStart),
      stock: countInRange(stockCreatedTs, lastStart, nowMs) - countInRange(stockCreatedTs, prevStart, lastStart),
      completed: countInRange(completedUpdatedTs, lastStart, nowMs) - countInRange(completedUpdatedTs, prevStart, lastStart),
    }
  }, [clientsItems, kitList, nowTs, stockList])

  const monthlyClients = useMemo(() => {
    const points = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return {
        key,
        month: MONTH_LABELS_TR[d.getMonth()] ?? String(d.getMonth() + 1),
        yeni: 0,
      }
    })

    const map = new Map(points.map((p) => [p.key, p]))

    for (const c of clientsItems) {
      const ts = toTs(c.createdAt)
      if (!ts) continue
      const d = new Date(ts)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const point = map.get(key)
      if (point) point.yeni += 1
    }

    return points.map((p) => ({ month: p.month, yeni: p.yeni }))
  }, [clientsItems, now])

  const newClientsInWindow = useMemo(() => monthlyClients.reduce((acc, p) => acc + p.yeni, 0), [monthlyClients])

  const myKitPie = useMemo(() => {
    const tamamlanan = completedKitsCount
    const analizde = kitList.filter((k) => k.status === 'in_laboratory' || k.status === 'in_expert').length
    const kargoda = kitList.filter((k) => k.status === 'delivered').length
    const stokta = availableStockCount

    return [
      { name: 'Tamamlanan', value: tamamlanan, color: W.olive },
      { name: 'Analizde', value: analizde, color: W.orange },
      { name: 'Kargoda', value: kargoda, color: W.amber },
      { name: 'Stokta', value: stokta, color: W.green },
    ]
  }, [availableStockCount, completedKitsCount, kitList])

  const totalForPie = useMemo(() => myKitPie.reduce((acc, it) => acc + it.value, 0), [myKitPie])

  const kitsByClientId = useMemo(() => {
    const map = new Map<number, DieticianClientKit[]>()
    for (const k of kitList) {
      if (!k.clientId) continue
      const list = map.get(k.clientId) ?? []
      list.push(k)
      map.set(k.clientId, list)
    }

    for (const [clientId, list] of map.entries()) {
      list.sort((a, b) => (toTs(b.updatedAt ?? b.createdAt) ?? 0) - (toTs(a.updatedAt ?? a.createdAt) ?? 0))
      map.set(clientId, list)
    }
    return map
  }, [kitList])

  const recentClients = useMemo(() => {
    const list = [...clientsItems]
      .filter((c) => c.clientId != null)
      .sort((a, b) => (toTs(b.createdAt) ?? 0) - (toTs(a.createdAt) ?? 0))
      .slice(0, 5)

    return list.map((c) => {
      const clientId = c.clientId ?? 0
      const topKit = clientId ? kitsByClientId.get(clientId)?.[0] : undefined
      return {
        id: String(clientId),
        name: c.clientName ?? `#${clientId}`,
        kitStatus: mapDieticianKitStatusToKitStatus(topKit?.status),
        lastVisit: formatDate(c.createdAt),
      }
    })
  }, [clientsItems, kitsByClientId])

  const activeKit = useMemo(() => {
    const list = [...activeKits]
    list.sort((a, b) => (toTs(b.updatedAt ?? b.createdAt) ?? 0) - (toTs(a.updatedAt ?? a.createdAt) ?? 0))
    return list[0]
  }, [activeKits])

  const activeKitTimeline = useMemo(() => {
    const kitBarcode = activeKit?.kitBarcode
    const kitCreatedAt = activeKit?.kitCreatedAt ?? activeKit?.kitUpdatedAt ?? activeKit?.createdAt
    const assignmentCreatedAt = activeKit?.createdAt
    const updatedAt = activeKit?.updatedAt
    const clientName = activeKit?.clientName

    const currentIndex = getKitTimelineStepIndex(activeKit?.status)

    const steps = [
      {
        label: 'Kit Teslim Alindi',
        description: kitBarcode ?? '—',
        date: kitCreatedAt ? formatDateTime(kitCreatedAt) : undefined,
      },
      {
        label: 'Danisana Atandi',
        description: clientName ?? (activeKit ? '—' : 'Aktif kit bulunmuyor'),
        date: assignmentCreatedAt ? formatDateTime(assignmentCreatedAt) : undefined,
      },
      {
        label: 'Numune Gonderildi',
        description: assignedLab?.cargofirm ? `Kargo: ${assignedLab.cargofirm}` : undefined,
        date: activeKit?.status === 'delivered' || activeKit?.status === 'in_laboratory' || activeKit?.status === 'in_expert' || activeKit?.status === 'completed'
          ? (updatedAt ? formatDateTime(updatedAt) : undefined)
          : undefined,
      },
      {
        label: 'Laboratuvar Analizi',
        description: activeKit?.status === 'in_laboratory' ? 'Analiz devam ediyor' : undefined,
        date: activeKit?.status === 'in_laboratory' ? (updatedAt ? formatDateTime(updatedAt) : undefined) : undefined,
      },
      {
        label: 'Uzman Raporu',
        description: activeKit?.status === 'in_expert' ? 'Uzman sureci devam ediyor' : undefined,
        date: activeKit?.status === 'in_expert' ? (updatedAt ? formatDateTime(updatedAt) : undefined) : undefined,
      },
      {
        label: 'Sonuc Teslimi',
        description: activeKit?.status === 'completed' ? 'Tamamlandi' : undefined,
        date: activeKit?.status === 'completed' ? (updatedAt ? formatDateTime(updatedAt) : undefined) : undefined,
      },
    ]

    return steps.map((s, idx) => ({
      ...s,
      status: idx < currentIndex ? ('completed' as const) : idx === currentIndex ? ('current' as const) : ('upcoming' as const),
    }))
  }, [activeKit, assignedLab])

  const recentActivities = useMemo(() => {
    const activities: Array<{ icon: LucideIcon; color: string; bg: string; text: string; time: string }> = []

    const latestCompleted = [...kitList]
      .filter((k) => k.status === 'completed')
      .sort((a, b) => (toTs(b.updatedAt ?? b.createdAt) ?? 0) - (toTs(a.updatedAt ?? a.createdAt) ?? 0))[0]

    if (latestCompleted) {
      activities.push({
        icon: CheckCircle,
        color: W.green,
        bg: W.greenLight,
        text: `${latestCompleted.clientName ?? 'Danisan'} analizi tamamlandi`,
        time: formatRelativeTimeTR(nowTs, toTs(latestCompleted.updatedAt ?? latestCompleted.createdAt)),
      })
    }

    const latestDelivery = [...kitList]
      .filter((k) => k.status === 'delivered')
      .sort((a, b) => (toTs(b.updatedAt ?? b.createdAt) ?? 0) - (toTs(a.updatedAt ?? a.createdAt) ?? 0))[0]

    if (latestDelivery) {
      activities.push({
        icon: Package,
        color: W.olive,
        bg: W.oliveLight,
        text: `${latestDelivery.clientName ?? 'Danisan'} numunesi kargolandi`,
        time: formatRelativeTimeTR(nowTs, toTs(latestDelivery.updatedAt ?? latestDelivery.createdAt)),
      })
    }

    const threshold = minStockAlert > 0 ? minStockAlert : 5
    if (availableStockCount <= threshold) {
      activities.push({
        icon: AlertTriangle,
        color: W.amber,
        bg: W.amberLight,
        text: `Stok uyarisi: ${availableStockCount} kit kaldi`,
        time: 'Bugun',
      })
    }

    return activities.slice(0, 3)
  }, [availableStockCount, kitList, minStockAlert, nowTs])

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══ GREETING + ATANAN LABORATUVAR ADRESI ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-text-primary">
              {greeting}, {user?.firstName || 'Diyetisyen'}! <span className="inline-block">&#x1F44B;</span>
            </h1>
            <p className="text-[13px] mt-0.5 text-text-secondary">
              Danisanlariniz, kitler ve raporlara genel bakis
            </p>
          </div>
          <div className="min-w-0 max-w-full sm:max-w-md">
            {assignedLabLoading ? (
              <div className="rounded-xl p-3.5 border bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700">
                <p className="text-[12px] text-text-secondary">Laboratuvar bilgileri yukleniyor...</p>
              </div>
            ) : assignedLab ? (
              <div className="rounded-xl p-3.5 border bg-primary-50 dark:bg-primary-900/30 border-surface-200 dark:border-surface-700">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary-600" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Kiti Göndereceğiniz Adres</p>
                    {/* <p className="text-[13px] font-semibold mt-0.5 text-text-primary">{assignedLab.name}</p> */}
                    <p className="text-[12px] mt-1 leading-snug text-text-primary">
                      {assignedLab.address}
                      {assignedLab.district ? `, ${assignedLab.district}` : ''} / {assignedLab.city}
                      {assignedLab.postalCode ? ` ${assignedLab.postalCode}` : ''}
                    </p>
                    {(assignedLab.cargofirm || assignedLab.cargoNumber) && (
                      <p className="text-[11px] mt-1 text-text-secondary">
                        Kargo: {assignedLab.cargofirm ?? '-'}{assignedLab.cargoNumber ? ` / ${assignedLab.cargoNumber}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3.5 border bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700">
                <p className="text-[12px] text-text-secondary">Size atanmis laboratuvar bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Danisanlarim', value: clientsTotal, change: deltaLast30Days.clients, icon: Users, iconColor: W.olive, iconBg: W.oliveLight },
          { title: 'Aktif Kit', value: activeKits.length, change: deltaLast30Days.activeKits, icon: FlaskConical, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Stogumdaki Kit', value: availableStockCount, change: deltaLast30Days.stock, icon: Package, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Tamamlanan', value: completedKitsCount, change: deltaLast30Days.completed, icon: FileCheck, iconColor: W.green, iconBg: W.greenLight },
        ].map((s, i) => {
          const Icon = s.icon
          const up = s.change >= 0
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md bg-panel border border-surface-200">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold text-text-primary">{s.value}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${up ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {up ? '+' : ''}{s.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ═══ ROW 1: Bar Chart + Donut ═══ */}
      <div className="grid grid-cols-12 gap-6">

        {/* Monthly new clients bar chart */}
        <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-5 bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold text-surface-900">Yeni Danisan Trendi</h3>
                <p className="text-[12px] mt-0.5 text-surface-500">Aylik yeni danisan sayisi</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/40">
                <TrendingUp className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                <span className="text-[12px] font-bold text-primary-600 dark:text-primary-400">+{newClientsInWindow} danisan</span>
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyClients} barSize={36}>
                  <defs>
                    <linearGradient id="barDiet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={W.orange} stopOpacity={1} />
                      <stop offset="100%" stopColor="#F5B06B" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} />
                  <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} danisan`, 'Yeni']} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="yeni" fill="url(#barDiet)" radius={[8, 8, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Kit status donut */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-card-title">Kit Durumlarim</h3>
                <p className="text-[12px] mt-0.5 text-text-secondary">Tum kitlerin dagilimi</p>
              </div>
              <span className="text-xl font-black text-text-primary">{totalForPie}</span>
            </div>
            <div className="relative h-[150px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={myKitPie} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {myKitPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-black text-text-primary">{totalForPie}</p>
                  <p className="text-[9px] text-text-secondary">Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {myKitPie.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-[12px] flex-1 text-text-primary">{item.name}</span>
                  <span className="text-[12px] font-bold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ ROW 2: Clients + Kit Timeline + Activity ═══ */}
      <div className="grid grid-cols-12 gap-6">

        {/* Recent Clients */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-card-title">Son Danisanlar</h3>
              <button type="button" onClick={() => navigate(ROUTES.DIYETISYEN_DANISANLAR)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Tumu <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentClients.length > 0 ? recentClients.map((c) => (
                <button key={c.id} type="button" onClick={() => navigate(danisanDetayPath(c.id))} className="flex items-center justify-between w-full p-3 rounded-xl text-left transition-colors bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-700/50">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="text-[12px] font-semibold text-text-primary">{c.name}</p>
                      <p className="text-[10px] text-text-secondary">{c.lastVisit}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.kitStatus} size="sm" />
                </button>
              )) : (
                <div className="rounded-xl p-3 bg-surface-50 dark:bg-surface-800/50 text-[12px] text-text-secondary">Henuz danisan yok.</div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Active Kit Timeline */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-card-title">Aktif Kit Takibi</h3>
              <button type="button" onClick={() => navigate(ROUTES.DIYETISYEN_KITLER)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Kitlerim <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <code className="text-[11px] font-mono block mb-4 text-text-secondary">{activeKit?.kitBarcode ?? '—'}</code>
            <Timeline steps={activeKitTimeline} />
          </div>
        </motion.div>

        {/* Activity feed with timeline line */}
        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-card-title">Aktivite</h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />
                <span className="text-[9px] font-semibold text-green-700 dark:text-green-400">Canli</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-surface-200 to-transparent" />
              <div className="space-y-1">
                {recentActivities.length > 0 ? recentActivities.map((a, i) => (
                  <div key={i} className="relative flex items-start gap-3 p-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <div className="relative z-10 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ring-[3px] ring-panel" style={{ background: a.bg }}>
                      <a.icon className="h-3.5 w-3.5" style={{ color: a.color }} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-medium leading-snug text-surface-700 dark:text-surface-300">{a.text}</p>
                      <p className="text-[10px] mt-0.5 flex items-center gap-1 text-surface-500">
                        <Clock className="h-2.5 w-2.5" />{a.time}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl p-3 bg-surface-50 dark:bg-surface-800/50 text-[12px] text-text-secondary">Aktivite yok.</div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
