import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { motion } from 'framer-motion'
import {
  BookOpen, FileCheck, Clock, PenTool, ArrowUpRight, ShieldCheck,
  TrendingUp, CheckCircle,
} from 'lucide-react'
import { ROUTES, raporDuzenleyiciPath } from '@/utils/routes'
import { formatDate } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getExperts } from '@/services/experts.service'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar,
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

const statusPieFrom = (pending: number, inProgress: number, completed: number) => [
  { name: 'Bekleyen', value: Math.max(0, pending), color: W.amber },
  { name: 'Onay Bekliyor', value: Math.max(0, inProgress), color: W.orange },
  { name: 'Tamamlanan', value: Math.max(0, completed), color: W.green },
].filter((i) => i.value > 0)


function toMonthKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function monthLabelTr(d: Date) {
  const label = d.toLocaleString('tr-TR', { month: 'short' })
  // Safari bazı durumlarda nokta ekleyebiliyor (örn: "Oca.")
  const cleaned = label.replace('.', '')
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned
}

function relativeDayLabel(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startNow - startD) / 864e5)
  if (diffDays === 0) return 'Bugün'
  if (diffDays === 1) return 'Dün'
  if (diffDays > 1) return `${diffDays} gün önce`
  return formatDate(dateStr)
}

function relativeTimeLabel(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr).getTime()
  const now = Date.now()
  const diffMin = Math.max(0, Math.round((now - d) / 6e4))
  if (diffMin < 60) return `${diffMin} dk önce`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} saat önce`
  const diffD = Math.round(diffH / 24)
  return `${diffD} gün önce`
}

function durationDaysLabel(from?: string) {
  if (!from) return '—'
  const ms = Date.now() - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const days = ms / 864e5
  return `${days.toFixed(1)} gün`
}

const tooltipStyle = { background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function SpecialistDashboardPage() {
  const navigate = useNavigate()

  const pendingCountQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'count', 'pending'],
    queryFn: () => getExperts({ status: 'pending', page: 1, limit: 1 }),
    retry: 1,
  })
  const inProgressCountQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'count', 'in_progress'],
    queryFn: () => getExperts({ status: 'in_progress', page: 1, limit: 1 }),
    retry: 1,
  })
  const completedCountQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'count', 'completed'],
    queryFn: () => getExperts({ status: 'completed', page: 1, limit: 1 }),
    retry: 1,
  })

  const pendingListQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'list', 'pending'],
    queryFn: () => getExperts({ status: 'pending', page: 1, limit: 5 }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const completedListQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'list', 'completed'],
    queryFn: () => getExperts({ status: 'completed', page: 1, limit: 50 }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const inProgressListQuery = useQuery({
    queryKey: ['experts', 'dashboard', 'list', 'in_progress'],
    queryFn: () => getExperts({ status: 'in_progress', page: 1, limit: 1 }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const pendingCount = pendingCountQuery.data?.totalItems ?? 0
  const inProgressCount = inProgressCountQuery.data?.totalItems ?? 0
  const completedCount = completedCountQuery.data?.totalItems ?? 0
  const totalCount = pendingCount + inProgressCount + completedCount

  const statusPie = useMemo(
    () => statusPieFrom(pendingCount, inProgressCount, completedCount),
    [pendingCount, inProgressCount, completedCount]
  )

  const pendingList = useMemo(() => {
    const list = pendingListQuery.data?.experts ?? []
    return list
      .filter((e) => !!e.kitBarcode)
      .map((e) => ({
        barcode: e.kitBarcode!,
        assignedAt: e.assignedAt ? formatDate(e.assignedAt) : '—',
        clientName: e.userName,
      }))
  }, [pendingListQuery.data?.experts])

  const recentCompleted = useMemo(() => {
    const list = (completedListQuery.data?.experts ?? [])
      .filter((e) => !!e.kitBarcode)
      .slice(0, 3)
    return list.map((e) => ({
      barcode: e.kitBarcode!,
      date: relativeDayLabel(e.assignedAt),
      duration: durationDaysLabel(e.assignedAt),
      score: null as number | null,
      assignedAt: e.assignedAt,
    }))
  }, [completedListQuery.data?.experts])

  const weeklyActivity = useMemo(() => {
    const pending = pendingListQuery.data?.experts?.[0]
    const inProgress = inProgressListQuery.data?.experts?.[0]
    const completed = completedListQuery.data?.experts?.[0]

    const items: Array<{ icon: typeof CheckCircle; color: string; bg: string; text: string; time: string }> = []

    if (completed?.kitBarcode) {
      items.push({
        icon: CheckCircle,
        color: W.green,
        bg: W.greenLight,
        text: `${completed.kitBarcode} raporu tamamlandı`,
        time: relativeTimeLabel(completed.assignedAt),
      })
    }

    if (inProgress?.kitBarcode) {
      items.push({
        icon: PenTool,
        color: W.orange,
        bg: W.orangeLight,
        text: `${inProgress.kitBarcode} raporu başlatıldı`,
        time: relativeTimeLabel(inProgress.assignedAt),
      })
    }

    if (pending?.kitBarcode) {
      items.push({
        icon: BookOpen,
        color: W.olive,
        bg: W.oliveLight,
        text: `Yeni analiz atandı: ${pending.kitBarcode}`,
        time: relativeTimeLabel(pending.assignedAt),
      })
    }

    return items.slice(0, 3)
  }, [completedListQuery.data?.experts, inProgressListQuery.data?.experts, pendingListQuery.data?.experts])

  const monthlyReports = useMemo(() => {
    const base = new Date()
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1)
      return { key: toMonthKey(d), month: monthLabelTr(d) }
    })

    const map = new Map<string, number>()
    for (const m of months) map.set(m.key, 0)

    for (const e of (completedListQuery.data?.experts ?? [])) {
      if (!e.assignedAt) continue
      const k = toMonthKey(new Date(e.assignedAt))
      if (!map.has(k)) continue
      map.set(k, (map.get(k) ?? 0) + 1)
    }

    return months.map((m) => ({ month: m.month, rapor: map.get(m.key) ?? 0 }))
  }, [completedListQuery.data?.experts])

  const performanceValue = useMemo(() => {
    if (totalCount <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 100)))
  }, [completedCount, totalCount])

  const performanceData = useMemo(() => [{ name: 'Performans', value: performanceValue, fill: W.olive }], [performanceValue])

  const avgSpeedDays = useMemo(() => {
    const completed = (completedListQuery.data?.experts ?? []).filter((e) => e.assignedAt)
    if (completed.length === 0) return null
    const days = completed
      .map((e) => (Date.now() - new Date(e.assignedAt!).getTime()) / 864e5)
      .filter((n) => Number.isFinite(n) && n > 0)
    if (days.length === 0) return null
    return (days.reduce((a, b) => a + b, 0) / days.length)
  }, [completedListQuery.data?.experts])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ GREETING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <h1 className="text-[22px] font-bold text-surface-900">Uzman Paneli</h1>
        <p className="text-[13px] mt-0.5 text-surface-500">Atanan analizler, rapor durumlariniz ve performans ozeti</p>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Bekleyen', value: String(pendingCount), icon: BookOpen, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Onay Bekliyor', value: String(inProgressCount), icon: PenTool, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Tamamlanan', value: String(completedCount), icon: FileCheck, iconColor: W.green, iconBg: W.greenLight },
          { title: 'Toplam', value: String(totalCount), icon: Clock, iconColor: W.olive, iconBg: W.oliveLight },
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

      {/* ═══ ROW 1: Monthly Chart + Status Donut ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-5 bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold text-surface-900">Aylik Rapor Trendi</h3>
                <p className="text-[12px] mt-0.5 text-surface-500">Tamamlanan rapor sayilari</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                <TrendingUp className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-[12px] font-bold text-primary-700 dark:text-primary-400">{completedCount} rapor (YTD)</span>
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReports} barSize={36}>
                  <defs>
                    <linearGradient id="barSpec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={W.olive} stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#A8B86A" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-200)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-surface-500)' }} />
                  <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} rapor`, 'Tamamlanan']} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="rapor" fill="url(#barSpec)" radius={[8, 8, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-surface-900">Rapor Dagilimi</h3>
              <span className="text-xl font-black text-surface-900">{totalCount}</span>
            </div>
            <div className="relative h-[150px] flex items-center justify-center">
              {statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-lg font-black text-surface-900">{totalCount}</p>
                  <p className="text-[9px] text-surface-500">Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {statusPie.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-[12px] flex-1 text-surface-700">{item.name}</span>
                  <span className="text-[12px] font-bold text-surface-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ ROW 2: Assignments + Completed + Performance ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-surface-900">Bekleyen Analizler</h3>
              <button type="button" onClick={() => navigate(ROUTES.UZMAN_ATAMALAR)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Tumu <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {pendingList.length === 0 ? (
                <p className="text-[12px] py-4 text-center text-surface-500">Bekleyen rapor yok. Atanan islerden yeni atama gorunecek.</p>
              ) : (
                pendingList.map((item) => (
                  <div key={item.barcode} className="flex items-center justify-between p-3.5 rounded-xl transition-colors bg-surface-50 hover:bg-surface-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                        <BookOpen className="h-4.5 w-4.5 text-orange-500" />
                      </div>
                      <div>
                        <code className="text-[12px] font-mono font-bold text-surface-900">{item.barcode}</code>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.clientName && <span className="text-[10px] text-surface-500">{item.clientName}</span>}
                          <span className="text-[10px] text-surface-400">·</span>
                          <span className="text-[10px] text-surface-500">{item.assignedAt}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="default" size="xs" onClick={() => navigate(raporDuzenleyiciPath(item.barcode))}>
                      <PenTool className="h-3 w-3" /> Baslat
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <h3 className="text-[15px] font-semibold mb-4 text-surface-900">Son Raporlarim</h3>
            <div className="space-y-2">
              {recentCompleted.map((r) => (
                <div key={r.barcode} className="flex items-center gap-3 p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-green-200 dark:bg-green-800/50">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <code className="text-[12px] font-mono font-bold text-green-800 dark:text-green-200">{r.barcode}</code>
                    <p className="text-[10px] text-green-700 dark:text-green-300">{r.date} · {r.duration} · Puan: {r.score ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            <h4 className="text-[13px] font-semibold mt-5 mb-3 text-surface-900">Aktivite</h4>
            <div className="relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gradient-to-b from-surface-200 to-transparent" />
              {weeklyActivity.map((a, i) => (
                <div key={i} className="relative flex items-start gap-2.5 p-1.5 rounded-lg">
                  <div className="relative z-10 h-7 w-7 rounded-md flex items-center justify-center shrink-0 ring-2 ring-panel" style={{ background: a.bg }}>
                    <a.icon className="h-3 w-3" style={{ color: a.color }} />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] font-medium text-surface-700">{a.text}</p>
                    <p className="text-[9px] text-surface-500">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <h3 className="text-[15px] font-semibold mb-2 text-surface-900">Performans</h3>
            <div className="flex flex-col items-center">
              <div className="h-[110px] w-[110px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={performanceData}>
                    <RadialBar background={{ fill: 'var(--color-surface-200)' }} dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-black text-surface-900">{performanceValue}<span className="text-xs text-surface-500">%</span></p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-1 text-surface-500">Zamaninda teslim</p>
              <div className="w-full space-y-2.5 mt-4 pt-3 border-t border-surface-200">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-surface-500">Kalite</span>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400">4.9/5</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-200">
                    <div className="h-full rounded-full bg-green-500" style={{ width: '98%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-surface-500">Hiz</span>
                    <span className="text-[10px] font-bold text-primary-600">{avgSpeedDays != null ? `${avgSpeedDays.toFixed(1)} gün` : '—'}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-200">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: '85%' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl p-3 mt-4 text-center bg-surface-800 dark:bg-surface-700">
              <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-primary-400" />
              <p className="text-[10px] font-semibold text-white">Kor Protokol Aktif</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
