import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { KitStatus } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'
import {
  Package, Users, ShoppingCart, TrendingUp, TrendingDown,
  Clock, CheckCircle, AlertTriangle, Truck, BarChart3,
  ArrowUpRight, ArrowRight, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { getUsers } from '@/services/users.service'
import { getOrders } from '@/services/orders.service'
import { getDieticianClientKits } from '@/services/dietician-client-kits.service'
import { UserRole } from '@/utils/constants'
import {
  getLaboratories,
  getLaboratoriesStatistics,
  getLaboratoryStatisticsById,
  type LaboratoryStatisticsItem,
} from '@/services/laboratories.service'

/** API dietician-client-kit status → KitStatus (StatusBadge) */
function mapKitStatusToDisplay(
  status: 'in_client' | 'in_laboratory' | 'in_expert' | 'delivered' | 'cancelled' | 'completed' | undefined
): KitStatus {
  const map: Record<string, KitStatus> = {
    in_client: KitStatus.CLIENT_RECEIVED,
    in_laboratory: KitStatus.IN_ANALYSIS,
    in_expert: KitStatus.SPECIALIST_POOL,
    delivered: KitStatus.DELIVERED,
    completed: KitStatus.COMPLETED,
    cancelled: KitStatus.REJECTED,
  }
  return (status && map[status]) ?? KitStatus.IN_STOCK
}

/* ─── Nutrigo warm palette ─── */
const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  amber: '#F5C842',
  amberLight: '#FDF8E8',
  green: '#6ABF69',
  greenLight: '#E8F5E8',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
  warmGray: '#8A8578',
  warmGrayLight: '#B5AFA5',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

/** Aylik gelir (API'de tarih bazli ozet yok; ornek veri veya siparis toplamindan) */
const monthlyRevenue = [
  { month: 'Oca', gelir: 45 },
  { month: 'Sub', gelir: 52 },
  { month: 'Mar', gelir: 61 },
  { month: 'Nis', gelir: 58 },
  { month: 'May', gelir: 71 },
  { month: 'Haz', gelir: 83 },
  { month: 'Tem', gelir: 76 },
  { month: 'Agu', gelir: 89 },
]

const weeklyKits = [
  { day: 'Pzt', value: 8 },
  { day: 'Sal', value: 12 },
  { day: 'Car', value: 6 },
  { day: 'Per', value: 15 },
  { day: 'Cum', value: 9 },
  { day: 'Cmt', value: 4 },
  { day: 'Paz', value: 2 },
]

const recentActivity = [
  { icon: CheckCircle, color: W.green, bg: W.greenLight, text: 'OT-2025-00142 analizi tamamlandi', time: '2 dk once' },
  { icon: Truck, color: W.olive, bg: W.oliveLight, text: 'Dr. Ayse Yilmaz siparisi kargolandi', time: '15 dk once' },
  { icon: Users, color: W.orange, bg: W.orangeLight, text: 'Yeni diyetisyen: Dr. Mehmet Sahin', time: '1 saat once' },
  { icon: AlertTriangle, color: W.amber, bg: W.amberLight, text: 'Hasarli kit: OT-2025-00138', time: '2 saat once' },
  { icon: BarChart3, color: W.olive, bg: W.oliveLight, text: 'Uzman raporu onaya gonderildi', time: '3 saat once' },
]

const kitCategoryLabels: Record<string, string> = {
  in_client: 'Danışanda',
  in_laboratory: 'Laboratuvarda',
  in_expert: 'Uzmanda',
  delivered: 'Teslim Edildi',
  completed: 'Tamamlanan',
  cancelled: 'İptal',
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const tooltipStyle = {
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  fontSize: '12px',
  padding: '10px 14px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-panel)',
}

function formatSecondsToHours(seconds: number | undefined) {
  if (seconds == null || Number.isNaN(seconds)) return '—'
  const hours = seconds / 3600
  const rounded = Math.round(hours * 10) / 10
  return `${rounded.toLocaleString('tr-TR')} saat`
}

function formatRate(rate: number | undefined) {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${Math.round(rate * 100)}%`
}

function formatNumber(value: number | undefined, digits: number = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits
  return rounded.toLocaleString('tr-TR')
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  const [statsDays, setStatsDays] = useState('30')
  const [selectedLabId, setSelectedLabId] = useState('all')

  const statsDaysLabel = useMemo(() => {
    const map: Record<string, string> = {
      '7': '7 gün',
      '30': '30 gün',
      '90': '90 gün',
    }
    return map[statsDays] ?? `${statsDays} gün`
  }, [statsDays])

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({ page: 1, limit: 500 }),
  })
  const { data: ordersList } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  })
  const { data: assignmentKits = [], isLoading: kitsLoading } = useQuery({
    queryKey: ['dietician-client-kits', 'dashboard'],
    queryFn: () => getDieticianClientKits(1, 500),
  })

  const { data: labs = [] } = useQuery({
    queryKey: ['laboratories', 'dashboard', 'list'],
    queryFn: () => getLaboratories({ page: 1, limit: 200 }),
    retry: 1,
  })

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
    data: labStats,
    isLoading: labStatsLoading,
    isError: labStatsError,
  } = useQuery({
    queryKey: ['laboratories', 'statistics', { id: selectedLabId, days: Number(statsDays) }],
    queryFn: () => getLaboratoryStatisticsById(Number(selectedLabId), { days: Number(statsDays) }),
    enabled: selectedLabId !== 'all',
    retry: 1,
  })

  const summary = useMemo(() => {
    const list = labsStats ?? []
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
  }, [labsStats])

  const selectedFromList: LaboratoryStatisticsItem | undefined = useMemo(() => {
    if (selectedLabId === 'all') return undefined
    const idNum = Number(selectedLabId)
    return (labsStats ?? []).find((x) => Number(x.laboratoryId) === idNum)
  }, [labsStats, selectedLabId])

  const usersList = useMemo(() => {
    return Array.isArray(usersRes) ? usersRes : (usersRes?.users ?? [])
  }, [usersRes])
  const dietitiansCount = useMemo(
    () => usersList.filter((u) => u.role === UserRole.DIETITIAN).length,
    [usersList]
  )

  const pendingOrdersCount = useMemo(
    () => (ordersList ?? []).filter((o) => (o.status ?? '').toLowerCase() === 'pending').length,
    [ordersList]
  )
  const totalRevenue = useMemo(() => {
    const list = ordersList ?? []
    return list
      .filter((o) => (o.status ?? '').toLowerCase() === 'completed' || (o.status ?? '').toLowerCase() === 'delivered')
      .reduce((sum, o) => sum + Number(o.totalPrice ?? 0), 0)
  }, [ordersList])

  const totalKits = assignmentKits.length
  const kitPieData = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    assignmentKits.forEach((k) => {
      const s = k.status ?? 'in_client'
      statusCounts[s] = (statusCounts[s] ?? 0) + 1
    })
    const colors: Record<string, string> = {
      in_client: W.amber,
      in_laboratory: W.orange,
      in_expert: W.olive,
      delivered: W.green,
      completed: W.green,
      cancelled: W.warmGray,
    }
    return Object.entries(statusCounts).map(([key, value]) => ({
      name: kitCategoryLabels[key] ?? key,
      value,
      color: colors[key] ?? W.olive,
    }))
  }, [assignmentKits])

  const recentKits = useMemo(() => {
    const sorted = [...assignmentKits].sort((a, b) => {
      const da = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
      const db = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
      return db - da
    })
    return sorted.slice(0, 6).map((k) => {
      const d = k.updatedAt ?? k.createdAt
      const dateStr = d ? new Date(d).toLocaleDateString('tr-TR') : ''
      const today = new Date().toLocaleDateString('tr-TR')
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = yesterdayDate.toLocaleDateString('tr-TR')
      let dateLabel = dateStr
      if (dateStr === today) dateLabel = 'Bugün'
      else if (dateStr === yesterday) dateLabel = 'Dün'
      return {
        barcode: k.kitBarcode ?? `#${k.id}`,
        status: mapKitStatusToDisplay(k.status),
        dietitian: k.dieticianName ?? '—',
        date: dateLabel,
      }
    })
  }, [assignmentKits])

  const topDietitians = useMemo(() => {
    const byDietitian: Record<string, { name: string; kits: number }> = {}
    assignmentKits.forEach((k) => {
      const id = String(k.dieticianId ?? k.dieticianName ?? '')
      const name = k.dieticianName ?? 'Bilinmeyen'
      if (!id) return
      if (!byDietitian[id]) byDietitian[id] = { name, kits: 0 }
      byDietitian[id].kits += 1
      if (k.dieticianName) byDietitian[id].name = k.dieticianName
    })
    const arr = Object.values(byDietitian)
      .sort((a, b) => b.kits - a.kits)
      .slice(0, 3)
    const maxKits = Math.max(1, ...arr.map((a) => a.kits))
    return arr.map((a) => ({
      name: a.name,
      kits: a.kits,
      revenue: 0,
      pct: Math.round((a.kits / maxKits) * 100),
    }))
  }, [assignmentKits])

  const kitCategoriesChart = useMemo(() => {
    if (kitPieData.length === 0)
      return [
        { label: 'Danışanda', count: 0, color: W.amber },
        { label: 'Laboratuvarda', count: 0, color: W.orange },
        { label: 'Tamamlanan', count: 0, color: W.green },
      ]
    return kitPieData.map((p) => ({
      label: p.name,
      count: p.value,
      color: p.color,
    }))
  }, [kitPieData])

  return (
    <div className="space-y-5 animate-fade-in">

          {/* ═══════ GREETING ═══════ */}
          <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
            <div>
              <h1 className="text-[22px] font-bold text-surface-900">
                Merhaba, {user?.firstName || 'Admin'}! <span className="inline-block animate-[wave_1.5s_ease-in-out_infinite]">&#x1F44B;</span>
              </h1>
              <p className="text-[13px] mt-0.5 text-surface-500">
                Bugunun ozetini inceleyelim. Sisteminiz aktif ve saglikli.
              </p>
            </div>
          </motion.div>

          {/* ═══════ STAT CARDS ═══════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Toplam Kit', value: kitsLoading ? '...' : totalKits.toLocaleString('tr-TR'), change: null, icon: Package, iconClass: 'text-brand-500', bgClass: 'from-primary-50 to-primary-100', accent: 'stat-accent-primary' },
              { title: 'Aktif Diyetisyen', value: String(dietitiansCount), change: null, icon: Users, iconClass: 'text-accent-amber', bgClass: 'from-orange-50 to-orange-100', accent: 'stat-accent-sky' },
              { title: 'Bekleyen Siparis', value: String(pendingOrdersCount), change: null, icon: ShoppingCart, iconClass: 'text-warning', bgClass: 'from-amber-50 to-amber-100', accent: 'stat-accent-amber' },
              { title: 'Toplam Gelir', value: formatCurrency(totalRevenue), change: null, icon: TrendingUp, iconClass: 'text-success', bgClass: 'from-green-50 to-green-100', accent: 'stat-accent-violet' },
            ].map((s, i) => {
              const Icon = s.icon
              const hasChange = s.change != null
              const up = hasChange && (s.change ?? 0) >= 0
              return (
                <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
                  <div className={`rounded-2xl bg-panel border border-border p-5 min-h-[122px] hover-lift cursor-default flex items-center ${s.accent}`}>
                    <div className="flex items-center gap-3.5">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${s.bgClass}`}>
                        <Icon className={`h-5 w-5 ${s.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wider leading-tight text-text-secondary">{s.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xl font-bold text-text-primary">{s.value}</span>
                          {hasChange && (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                up ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                              {up ? '+' : ''}{s.change ?? 0}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* ═══════ MAIN GRID ═══════ */}
          <div className="grid grid-cols-12 gap-5">

            {/* ── Laboratuvar Istatistikleri ── */}
            <motion.div className="col-span-12" {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
              <div className="panel p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-card-title">Laboratuvar İstatistikleri</h3>
                    <p className="text-[12px] mt-0.5 text-text-secondary">
                      Seçilen zaman aralığında laboratuvar bazlı kit süreç metrikleri ve rapor özetleri.
                    </p>
                  </div>

                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="min-w-[160px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 mb-1">
                        Zaman Aralığı
                      </p>
                      <Select value={statsDays} onValueChange={setStatsDays}>
                        <SelectTrigger>
                          <SelectValue placeholder="Gün seç" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 gün</SelectItem>
                          <SelectItem value="30">30 gün</SelectItem>
                          <SelectItem value="90">90 gün</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-[260px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 mb-1">
                        Laboratuvar
                      </p>
                      <Select value={selectedLabId} onValueChange={setSelectedLabId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Laboratuvar seç" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm laboratuvarlar (genel)</SelectItem>
                          {labs.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="rounded-2xl border border-surface-200 bg-panel p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[12px] font-semibold text-surface-800">Genel Özet</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">Son {statsDaysLabel} toplamı</p>
                      </div>
                      {labsStatsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                    </div>

                    {labsStatsError ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <p className="text-[12px] font-semibold text-surface-800">İstatistikler yüklenemedi</p>
                        <p className="text-[12px] text-surface-600 mt-1">Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.</p>
                      </div>
                    ) : (labsStats?.length ?? 0) === 0 ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <p className="text-[12px] font-semibold text-surface-800">Veri bulunamadı</p>
                        <p className="text-[12px] text-surface-600 mt-1">Seçili zaman aralığında laboratuvar istatistiği yok.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-surface-500">Toplam Kit</p>
                            <p className="text-[16px] font-black text-surface-900 mt-1">{summary.totalKits.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-surface-500">Devam Eden</p>
                            <p className="text-[16px] font-black text-surface-900 mt-1">{summary.inProgressKits.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-surface-500">Tamamlanan</p>
                            <p className="text-[16px] font-black text-surface-900 mt-1">{summary.completedKits.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-surface-500">Rapor</p>
                            <p className="text-[16px] font-black text-surface-900 mt-1">{summary.reportCount.toLocaleString('tr-TR')}</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <caption className="text-left text-[11px] text-surface-500 pb-2">
                              Son {statsDaysLabel} içinde laboratuvar bazlı metrikler (toplam {(labsStats ?? []).length.toLocaleString('tr-TR')} kayıt).
                            </caption>
                            <thead>
                              <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                                <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Laboratuvar</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Toplam</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Bekleyen</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Devam</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Tamam</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">İptal</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Rapor</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Tamamlama Oranı</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Ort. Süre</th>
                                <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-3 py-2.5 text-surface-500">Son Rapor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(labsStats ?? []).map((item) => {
                                const name = [item.laboratoryUser?.firstName, item.laboratoryUser?.lastName].filter(Boolean).join(' ') || `#${item.laboratoryId}`
                                const totals = item.totals
                                const interest = item.interest
                                return (
                                  <tr
                                    key={item.laboratoryId}
                                    className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                                  >
                                    <td className="px-3 py-2.5">
                                      <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-surface-800 truncate">{name}</p>
                                        <p className="text-[11px] text-surface-500 truncate">{item.laboratoryUser?.email ?? '—'}</p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.totalKits ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.pendingKits ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.inProgressKits ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.completedKits ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.cancelledKits ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{Number(totals?.reportCount ?? 0).toLocaleString('tr-TR')}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{formatRate(interest?.completionRate)}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{formatSecondsToHours(interest?.avgCompletionSeconds)}</td>
                                    <td className="px-3 py-2.5 text-right text-[12px] text-surface-700">{formatDateTime(totals?.lastReportAt)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl border border-surface-200 bg-panel p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[12px] font-semibold text-surface-800">Seçili Laboratuvar</p>
                        <p className="text-[11px] text-surface-500 mt-0.5">Son {statsDaysLabel} detayı</p>
                      </div>
                      {labStatsLoading && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                    </div>

                    {selectedLabId === 'all' ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <p className="text-[12px] font-semibold text-surface-800">Detay için laboratuvar seçin</p>
                        <p className="text-[12px] text-surface-600 mt-1">Genel özet tüm laboratuvarların toplamını gösterir.</p>
                      </div>
                    ) : labStatsError ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <p className="text-[12px] font-semibold text-surface-800">Laboratuvar istatistikleri yüklenemedi</p>
                        <p className="text-[12px] text-surface-600 mt-1">Lütfen tekrar deneyin.</p>
                      </div>
                    ) : labStats ? (
                      (() => {
                        const fallbackName =
                          [selectedFromList?.laboratoryUser?.firstName, selectedFromList?.laboratoryUser?.lastName]
                            .filter(Boolean)
                            .join(' ') || `#${selectedLabId}`
                        const name =
                          [labStats.laboratoryUser?.firstName, labStats.laboratoryUser?.lastName]
                            .filter(Boolean)
                            .join(' ') || fallbackName
                        const email = labStats.laboratoryUser?.email ?? selectedFromList?.laboratoryUser?.email
                        const totals = labStats.totals
                        const interest = labStats.interest

                        return (
                          <div className="space-y-3">
                            <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                              <p className="text-[12px] font-semibold text-surface-900">{name}</p>
                              <p className="text-[11px] text-surface-500 mt-0.5">{email ?? '—'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Toplam Kit</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{Number(totals?.totalKits ?? 0).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Rapor</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{Number(totals?.reportCount ?? 0).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Tamamlama Orani</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{formatRate(interest?.completionRate)}</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Ort. Tamamlama</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{formatSecondsToHours(interest?.avgCompletionSeconds)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Son {interest?.windowDays ?? Number(statsDays)} Gündeki Tamamlanan</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{Number(interest?.recentCompletedKits ?? 0).toLocaleString('tr-TR')}</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Haftalik Tamamlama</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{formatNumber(interest?.completedPerWeek)} / hafta</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Son Dönem Ort. Tamamlama</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{formatSecondsToHours(interest?.recentAvgCompletionSeconds)}</p>
                              </div>
                              <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-surface-500">Gozlem Penceresi</p>
                                <p className="text-[16px] font-black text-surface-900 mt-1">{(interest?.windowDays ?? Number(statsDays)).toLocaleString('tr-TR')} gun</p>
                              </div>
                            </div>

                            <div className="rounded-xl bg-surface-50 border border-surface-200 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[12px] font-semibold text-surface-800">Son Rapor</p>
                                <p className="text-[12px] text-surface-700">{formatDateTime(totals?.lastReportAt)}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-[12px] text-surface-700">
                                <div className="flex items-center justify-between">
                                  <span className="text-surface-500">Bekleyen</span>
                                  <span className="font-semibold">{Number(totals?.pendingKits ?? 0).toLocaleString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-surface-500">Devam Eden</span>
                                  <span className="font-semibold">{Number(totals?.inProgressKits ?? 0).toLocaleString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-surface-500">Tamamlanan</span>
                                  <span className="font-semibold">{Number(totals?.completedKits ?? 0).toLocaleString('tr-TR')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-surface-500">İptal</span>
                                  <span className="font-semibold">{Number(totals?.cancelledKits ?? 0).toLocaleString('tr-TR')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    ) : (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <p className="text-[12px] font-semibold text-surface-800">Veri bulunamadı</p>
                        <p className="text-[12px] text-surface-600 mt-1">Seçili laboratuvar için seçili zaman aralığında kayıt yok.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Gelir Trendi — BAR CHART ── */}
            <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-start justify-between min-h-[54px] mb-5">
                  <div>
                    <h3 className="text-card-title">Gelir Trendi</h3>
                    <p className="text-[12px] mt-0.5 text-text-secondary">Aylik gelir ozeti (bin TL)</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
                    <TrendingUp className="h-3.5 w-3.5 text-primary-600" />
                    <span className="text-[12px] font-bold text-primary-600">+16.9%</span>
                  </div>
                </div>
                <div className="h-[260px] flex-1 min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue} barSize={32} barGap={8}>
                      <defs>
                        <linearGradient id="barOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={W.orange} stopOpacity={1} />
                          <stop offset="100%" stopColor="#F5B06B" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} tickFormatter={(v: number) => `${v}K`} />
                      <ReTooltip
                        contentStyle={tooltipStyle}
                        formatter={(v: number | undefined) => [`${v ?? 0}K TL`, 'Gelir']}
                        cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }}
                      />
                      <Bar dataKey="gelir" fill="url(#barOrange)" radius={[8, 8, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* ── Kit Dagilimi — DONUT ── */}
            <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-start justify-between min-h-[54px] mb-4">
                  <div>
                    <h3 className="text-card-title">Kit Dagilimi</h3>
                    <p className="text-[12px] mt-0.5 text-text-secondary">Durumlara gore dagilim</p>
                  </div>
                  <span className="text-2xl font-black text-text-primary">{totalKits.toLocaleString('tr-TR')}</span>
                </div>

                <div className="relative h-[180px] flex items-center justify-center">
                  {kitPieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={kitPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {kitPieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-[11px] text-surface-500">Toplam</p>
                          <p className="text-xl font-black text-surface-900">{totalKits.toLocaleString('tr-TR')}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-surface-500">
                      {kitsLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Package className="h-10 w-10" />}
                      <p className="text-[12px] mt-2">{kitsLoading ? 'Yükleniyor...' : 'Veri yok'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 mt-3 flex-1">
                  {kitPieData.map((item) => {
                    const pct = totalKits > 0 ? Math.round((item.value / totalKits) * 100) : 0
                    return (
                      <div key={item.name} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color }} />
                        <span className="text-[12px] flex-1 text-surface-700">{item.name}</span>
                        <span className="text-[12px] font-bold text-surface-900">{item.value}</span>
                        <span className="text-[10px] w-8 text-right text-surface-500">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* ── Haftalik Kit Aktivitesi — mini bar chart ── */}
            <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-start justify-between min-h-[54px] mb-4">
                  <div>
                    <h3 className="text-card-title">Haftalik Kit</h3>
                    <p className="text-[12px] mt-0.5 text-text-secondary">Bu haftaki kit hareketleri</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-text-primary">56</p>
                    <p className="text-[10px] text-text-secondary">toplam</p>
                  </div>
                </div>
                <div className="h-[160px] flex-1 min-h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyKits} barSize={24}>
                      <defs>
                        <linearGradient id="barOlive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={W.olive} stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#A8B86A" stopOpacity={0.7} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-surface-500)' }} dy={4} />
                      <YAxis hide />
                      <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} kit`, 'Kit']} cursor={false} />
                      <Bar dataKey="value" fill="url(#barOlive)" radius={[6, 6, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* ── Canli Aktivite — Timeline ── */}
            <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-card-title">Canli Aktivite</h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />
                    <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">Canli</span>
                  </div>
                </div>

                <div className="relative flex-1">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-surface-200 to-transparent" />

                  <div className="space-y-1">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="relative flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-surface-50 transition-colors cursor-pointer group">
                        <div
                          className="relative z-10 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ring-[3px] ring-panel transition-transform group-hover:scale-105"
                          style={{ background: act.bg }}
                        >
                          <act.icon className="h-4.5 w-4.5" style={{ color: act.color }} />
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-[12px] font-medium leading-snug text-surface-700">{act.text}</p>
                          <p className="text-[10px] mt-1 flex items-center gap-1 text-surface-500">
                            <Clock className="h-2.5 w-2.5" />
                            {act.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Kit Kategorileri — colored progress bars ── */}
            <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
              <div className="panel p-5 h-full flex flex-col">
                <h3 className="text-card-title mb-1">Kit Durumlari</h3>
                <p className="text-[12px] mb-5 text-text-secondary">Durumlara gore dagilim</p>

                <div className="space-y-5 flex-1">
                  {kitCategoriesChart.map((cat, i) => {
                    const pct = totalKits > 0 ? Math.round((cat.count / totalKits) * 100) : 0
                    return (
                      <div key={cat.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                            <span className="text-[12px] font-medium text-surface-700">{cat.label}</span>
                          </div>
                          <span className="text-[12px] font-bold text-surface-900">{cat.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-surface-100">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: cat.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-surface-200">
                  <span className="text-[12px] text-surface-500">Toplam</span>
                  <span className="text-lg font-bold text-surface-900">{totalKits.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </motion.div>

            {/* ── Son Kit Hareketleri ── */}
            <motion.div className="col-span-12 lg:col-span-6" {...fadeUp} transition={{ duration: 0.35, delay: 0.35 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-card-title">Son Kit Hareketleri</h3>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.YONETICI_STOK)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80 transition-opacity"
                  >
                    Tumunu Gor <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  {recentKits.map((kit) => (
                    <div
                      key={kit.barcode}
                      className="flex items-center justify-between p-3.5 rounded-xl transition-colors cursor-pointer hover:shadow-sm bg-surface-50 hover:bg-panel border border-transparent hover:border-surface-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary-100">
                          <Package className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <code className="text-[12px] font-mono font-bold text-surface-900">{kit.barcode}</code>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-surface-500">{kit.dietitian}</span>
                            <span className="text-[10px] text-surface-500">·</span>
                            <span className="text-[10px] text-surface-500">{kit.date}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={kit.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── Top Diyetisyenler ── */}
            <motion.div className="col-span-12 lg:col-span-6" {...fadeUp} transition={{ duration: 0.35, delay: 0.4 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-card-title">En Iyi Diyetisyenler</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary-100 text-primary-600">Bu Ay</span>
                </div>

                <div className="space-y-4 flex-1">
                  {topDietitians.map((dt, i) => {
                    const medalColors = [
                      { bg: '#FBBF24', text: '#78350F' },
                      { bg: '#D1D5DB', text: '#374151' },
                      { bg: '#D97706', text: '#FFF7ED' },
                    ]
                    const medal = medalColors[i]
                    return (
                      <div key={dt.name} className="flex items-center gap-3.5 group cursor-pointer">
                        <div className="relative">
                          <Avatar name={dt.name} size="md" />
                          <div
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ring-2 ring-white"
                            style={{ background: medal.bg, color: medal.text }}
                          >
                            {i + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-semibold truncate text-surface-900">{dt.name}</p>
                            <span className="text-[12px] font-bold shrink-0 text-primary-600">{dt.kits} kit</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-surface-500">{dt.kits} kit</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface-100">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${W.olive}, ${W.green})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${dt.pct}%` }}
                                transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(ROUTES.YONETICI_DIYETISYENLER)}
                  className="w-full mt-5 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors bg-primary-100 text-primary-600 hover:bg-surface-100"
                >
                  Tum Diyetisyenleri Gor <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>

          </div>
    </div>
  )
}
