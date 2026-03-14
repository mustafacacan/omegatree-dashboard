import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { KitStatus } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'
import { formatCurrency } from '@/lib/utils'
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
import { getAdminDashboard } from '@/services/dashboard.service'

/** Dashboard kit status → KitStatus (StatusBadge) */
function mapDashboardKitStatusToDisplay(status: string | undefined): KitStatus {
  const map: Record<string, KitStatus> = {
    pending: KitStatus.LAB_PENDING,
    in_progress: KitStatus.IN_ANALYSIS,
    completed: KitStatus.COMPLETED,
    cancelled: KitStatus.REJECTED,
  }
  return map[(status ?? '').toLowerCase()] ?? KitStatus.IN_STOCK
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

const kitStatusColor: Record<string, string> = {
  cancelled: W.warmGray,
  in_progress: W.orange,
  completed: W.green,
  pending: W.amber,
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

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getAdminDashboard,
    staleTime: 30_000,
  })

  const dashboard = dashboardQuery.data
  const isLoading = dashboardQuery.isLoading

  const cards = dashboard?.cards
  const totalKits = Number(dashboard?.kits?.total ?? cards?.totalKits ?? 0)
  const dietitiansCount = Number(cards?.activeDieticians ?? 0)
  const pendingOrdersCount = Number(cards?.pendingOrders ?? 0)
  const totalRevenue = Number(cards?.totalRevenue ?? 0)

  const monthlyRevenue = useMemo(() => {
    const months = dashboard?.revenueTrend?.months ?? []
    return months.map((m) => ({
      month: (m.label ?? m.key ?? '').toString(),
      // UI: "bin TL" — TL -> K TL
      gelir: Math.round((Number(m.total ?? 0) / 1000) * 10) / 10,
    }))
  }, [dashboard?.revenueTrend?.months])

  const revenueTrendChange = dashboard?.revenueTrend?.changePercent ?? null

  const kitByStatus = useMemo(() => {
    return (dashboard?.kits?.byStatus ?? []).map((s) => ({
      status: (s.status ?? '').toString(),
      label: (s.label ?? s.status ?? '—').toString(),
      count: Number(s.count ?? 0),
      percent: Number(s.percent ?? 0),
    }))
  }, [dashboard?.kits?.byStatus])

  const kitPieData = useMemo(() => {
    return kitByStatus
      .filter((s) => s.count > 0)
      .map((s) => ({
        name: s.label,
        value: s.count,
        color: kitStatusColor[s.status] ?? W.olive,
      }))
  }, [kitByStatus])

  const kitCategoriesChart = useMemo(() => {
    if (kitByStatus.length === 0) return []
    return kitByStatus.map((s) => ({
      label: s.label,
      count: s.count,
      percent: s.percent,
      color: kitStatusColor[s.status] ?? W.olive,
    }))
  }, [kitByStatus])

  const weeklyKits = useMemo(() => {
    const days = dashboard?.weeklyKits?.days ?? []
    return days.map((d) => ({
      day: (d.label ?? d.key ?? '').toString(),
      value: Number(d.count ?? 0),
    }))
  }, [dashboard?.weeklyKits?.days])

  const weeklyTotal = useMemo(() => {
    const fromApi = dashboard?.weeklyKits?.total
    if (fromApi != null) return Number(fromApi)
    return weeklyKits.reduce((sum, d) => sum + d.value, 0)
  }, [dashboard?.weeklyKits?.total, weeklyKits])

  const recentActivity = useMemo(() => {
    const list = dashboard?.liveActivity ?? []

    const pickVisual = (message: string | undefined) => {
      const m = (message ?? '').toLowerCase()
      if (m.startsWith('order:')) return { icon: ShoppingCart, color: W.orange, bg: W.orangeLight }
      if (m.startsWith('laboratory-dietician:')) return { icon: Truck, color: W.olive, bg: W.oliveLight }
      if (m.startsWith('dieticianclient:')) return { icon: Users, color: W.orange, bg: W.orangeLight }
      if (m.includes('approve') || m.includes('approved')) return { icon: CheckCircle, color: W.green, bg: W.greenLight }
      if (m.includes('cancel') || m.includes('reject')) return { icon: AlertTriangle, color: W.amber, bg: W.amberLight }
      return { icon: BarChart3, color: W.olive, bg: W.oliveLight }
    }

    return list.slice(0, 6).map((a) => {
      const v = pickVisual(a.message)
      const actor = a.actorName ? `${a.actorName}: ` : ''
      return {
        icon: v.icon,
        color: v.color,
        bg: v.bg,
        text: `${actor}${a.message ?? '—'}`,
      }
    })
  }, [dashboard?.liveActivity])

  const recentKits = useMemo(() => {
    const list = dashboard?.recentKitMovements ?? []
    return list.slice(0, 6).map((m) => {
      const d = m.createdAt
      const dateStr = d ? new Date(d).toLocaleDateString('tr-TR') : ''
      const today = new Date().toLocaleDateString('tr-TR')
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = yesterdayDate.toLocaleDateString('tr-TR')
      let dateLabel = dateStr
      if (dateStr === today) dateLabel = 'Bugün'
      else if (dateStr === yesterday) dateLabel = 'Dün'

      return {
        barcode: m.kit?.name ?? `#${m.kit?.id ?? m.id ?? ''}`,
        status: mapDashboardKitStatusToDisplay(m.status),
        dietitian: m.dietician?.name ?? '—',
        date: dateLabel || '—',
      }
    })
  }, [dashboard?.recentKitMovements])

  const topDietitians = useMemo(() => {
    const list = dashboard?.topDieticians ?? []
    const arr = list
      .map((d) => ({
        name: d.name ?? '—',
        kits: Number(d.kitCount ?? 0),
      }))
      .sort((a, b) => b.kits - a.kits)
      .slice(0, 3)
    const maxKits = Math.max(1, ...arr.map((a) => a.kits))
    return arr.map((a) => ({
      name: a.name,
      kits: a.kits,
      revenue: 0,
      pct: Math.round((a.kits / maxKits) * 100),
    }))
  }, [dashboard?.topDieticians])

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
              { title: 'Toplam Kit', value: isLoading ? '...' : totalKits.toLocaleString('tr-TR'), change: null, icon: Package, iconClass: 'text-brand-500', bgClass: 'from-primary-50 to-primary-100', accent: 'stat-accent-primary' },
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

            {/* ── Gelir Trendi — BAR CHART ── */}
            <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
              <div className="panel p-5 h-full flex flex-col">
                <div className="flex items-start justify-between min-h-[54px] mb-5">
                  <div>
                    <h3 className="text-card-title">Gelir Trendi</h3>
                    <p className="text-[12px] mt-0.5 text-text-secondary">Aylik gelir ozeti (bin TL)</p>
                  </div>
                  {revenueTrendChange != null ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
                      {revenueTrendChange >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-primary-600" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-primary-600" />
                      )}
                      <span className="text-[12px] font-bold text-primary-600">
                        {revenueTrendChange >= 0 ? '+' : ''}{revenueTrendChange}%
                      </span>
                    </div>
                  ) : null}
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
                      {isLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Package className="h-10 w-10" />}
                      <p className="text-[12px] mt-2">{isLoading ? 'Yükleniyor...' : 'Veri yok'}</p>
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
                    <p className="text-lg font-bold text-text-primary">{weeklyTotal}</p>
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
                    const pct = Number.isFinite(cat.percent) ? cat.percent : (totalKits > 0 ? Math.round((cat.count / totalKits) * 100) : 0)
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
