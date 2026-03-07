import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { Avatar, Button } from '@/components/ui'
import { KitStatus } from '@/utils/constants'
import { ROUTES, danisanDetayPath } from '@/utils/routes'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getDietitiansAssignedLaboratory } from '@/services/laboratories.service'
import {
  Users, FlaskConical, Package, FileCheck, TrendingUp, TrendingDown,
  ArrowUpRight, Clock, MapPin,
  CheckCircle, AlertTriangle,
} from 'lucide-react'
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

const monthlyClients = [
  { month: 'Oca', yeni: 3 }, { month: 'Sub', yeni: 5 }, { month: 'Mar', yeni: 4 },
  { month: 'Nis', yeni: 2 }, { month: 'May', yeni: 6 }, { month: 'Haz', yeni: 4 },
]

const myKitPie = [
  { name: 'Tamamlanan', value: 16, color: W.olive },
  { name: 'Analizde', value: 5, color: W.orange },
  { name: 'Kargoda', value: 3, color: W.amber },
  { name: 'Stokta', value: 5, color: W.green },
]

const recentClients = [
  { id: '1', name: 'Ahmet Yildiz', kitStatus: KitStatus.IN_ANALYSIS, lastVisit: '15 Haz 2025' },
  { id: '2', name: 'Selin Kara', kitStatus: KitStatus.COMPLETED, lastVisit: '14 Haz 2025' },
  { id: '3', name: 'Emre Demir', kitStatus: KitStatus.SAMPLE_SENT, lastVisit: '13 Haz 2025' },
  { id: '4', name: 'Deniz Ak', kitStatus: KitStatus.DELIVERED, lastVisit: '12 Haz 2025' },
  { id: '5', name: 'Zeynep Koc', kitStatus: KitStatus.IN_STOCK, lastVisit: '11 Haz 2025' },
]

const activeKitTimeline = [
  { label: 'Kit Teslim Alindi', description: 'OT-2025-00142', date: '13 Haz 09:30', status: 'completed' as const },
  { label: 'Danisana Atandi', description: 'Ahmet Yildiz', date: '13 Haz 10:15', status: 'completed' as const },
  { label: 'Numune Gonderildi', description: 'Kargo: YK-12345', date: '14 Haz 11:00', status: 'completed' as const },
  { label: 'Laboratuvar Analizi', description: 'Analiz devam ediyor', status: 'current' as const },
  { label: 'Uzman Raporu', status: 'upcoming' as const },
  { label: 'Sonuc Teslimi', status: 'upcoming' as const },
]

const recentActivities = [
  { icon: CheckCircle, color: W.green, bg: W.greenLight, text: 'Selin Kara analizi tamamlandi', time: '2 saat once' },
  { icon: Package, color: W.olive, bg: W.oliveLight, text: 'Emre Demir numunesi kargolandi', time: '5 saat once' },
  { icon: AlertTriangle, color: W.amber, bg: W.amberLight, text: 'Stok uyarisi: 5 kit kaldi', time: 'Dun' },
]

const tooltipStyle = { background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function DietitianDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const {
    data: assignedLab,
    isLoading: assignedLabLoading,
  } = useQuery({
    queryKey: ['laboratory-dietician', 'dieticians-view-laboratory', 'laboratory'],
    queryFn: getDietitiansAssignedLaboratory,
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Gunaydin' : hour < 18 ? 'Iyi gunler' : 'Iyi aksamlar'

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ═══ GREETING + ATANAN LABORATUVAR ADRESI ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-surface-900">
              {greeting}, {user?.firstName || 'Diyetisyen'}! <span className="inline-block">&#x1F44B;</span>
            </h1>
            <p className="text-[13px] mt-0.5 text-surface-500">
              Danisanlariniz, kitler ve raporlara genel bakis
            </p>
          </div>
          <div className="min-w-0 max-w-full sm:max-w-md">
            {assignedLabLoading ? (
              <div className="rounded-xl p-3.5 border bg-surface-50 border-surface-200">
                <p className="text-[12px] text-surface-500">Laboratuvar bilgileri yukleniyor...</p>
              </div>
            ) : assignedLab ? (
              <div className="rounded-xl p-3.5 border bg-primary-50 dark:bg-primary-100/30 border-surface-200">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary-600" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Size atanan laboratuvar</p>
                    <p className="text-[13px] font-semibold mt-0.5 text-surface-900">{assignedLab.name}</p>
                    <p className="text-[12px] mt-1 leading-snug text-surface-700">
                      {assignedLab.address}
                      {assignedLab.district ? `, ${assignedLab.district}` : ''} / {assignedLab.city}
                      {assignedLab.postalCode ? ` ${assignedLab.postalCode}` : ''}
                    </p>
                    {(assignedLab.cargofirm || assignedLab.cargoNumber) && (
                      <p className="text-[11px] mt-1 text-surface-500">
                        Kargo: {assignedLab.cargofirm ?? '-'}{assignedLab.cargoNumber ? ` / ${assignedLab.cargoNumber}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3.5 border bg-surface-50 border-surface-200">
                <p className="text-[12px] text-surface-500">Size atanmis laboratuvar bulunmuyor.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Danisanlarim', value: '24', change: 4, icon: Users, iconColor: W.olive, iconBg: W.oliveLight },
          { title: 'Aktif Kit', value: '8', change: 2, icon: FlaskConical, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Stogumdaki Kit', value: '5', change: -3, icon: Package, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Tamamlanan', value: '16', change: 5, icon: FileCheck, iconColor: W.green, iconBg: W.greenLight },
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
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold text-surface-900">{s.value}</span>
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-100">
                <TrendingUp className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-[12px] font-bold text-primary-600">+24 danisan</span>
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
                <h3 className="text-[15px] font-semibold text-surface-900">Kit Durumlarim</h3>
                <p className="text-[12px] mt-0.5 text-surface-500">Tum kitlerin dagilimi</p>
              </div>
              <span className="text-xl font-black text-surface-900">29</span>
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
                  <p className="text-lg font-black text-surface-900">29</p>
                  <p className="text-[9px] text-surface-500">Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {myKitPie.map((item) => (
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

      {/* ═══ ROW 2: Clients + Kit Timeline + Activity ═══ */}
      <div className="grid grid-cols-12 gap-6">

        {/* Recent Clients */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-surface-900">Son Danisanlar</h3>
              <button type="button" onClick={() => navigate(ROUTES.DIYETISYEN_DANISANLAR)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Tumu <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentClients.map((c) => (
                <button key={c.id} type="button" onClick={() => navigate(danisanDetayPath(c.id))} className="flex items-center justify-between w-full p-3 rounded-xl text-left transition-colors bg-surface-50 hover:bg-surface-100">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="text-[12px] font-semibold text-surface-900">{c.name}</p>
                      <p className="text-[10px] text-surface-500">{c.lastVisit}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.kitStatus} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Active Kit Timeline */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[15px] font-semibold text-surface-900">Aktif Kit Takibi</h3>
              <button type="button" onClick={() => navigate(ROUTES.DIYETISYEN_KITLER)} className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:opacity-80">
                Kitlerim <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <code className="text-[11px] font-mono block mb-4 text-surface-500">OT-2025-00142</code>
            <Timeline steps={activeKitTimeline} />
          </div>
        </motion.div>

        {/* Activity feed with timeline line */}
        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full bg-panel border border-surface-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold text-surface-900">Aktivite</h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-green-500" />
                <span className="text-[9px] font-semibold text-green-700 dark:text-green-400">Canli</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-surface-200 to-transparent" />
              <div className="space-y-1">
                {recentActivities.map((a, i) => (
                  <div key={i} className="relative flex items-start gap-3 p-2 rounded-xl hover:bg-surface-50 transition-colors">
                    <div className="relative z-10 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ring-[3px] ring-panel" style={{ background: a.bg }}>
                      <a.icon className="h-3.5 w-3.5" style={{ color: a.color }} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[11px] font-medium leading-snug text-surface-700">{a.text}</p>
                      <p className="text-[10px] mt-0.5 flex items-center gap-1 text-surface-500">
                        <Clock className="h-2.5 w-2.5" />{a.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ STOCK WARNING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.35 }}>
        <div className="rounded-2xl p-5 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-amber-200 dark:bg-amber-800/50">
                <Package className="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">Stok Uyarisi</p>
                <p className="text-[13px] text-amber-700 dark:text-amber-300">Stogunuzda 5 kit kaldi. Yeni siparis vermenizi oneririz.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200" onClick={() => navigate(ROUTES.DIYETISYEN_SIPARISLER)}>
              Siparis Ver
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
