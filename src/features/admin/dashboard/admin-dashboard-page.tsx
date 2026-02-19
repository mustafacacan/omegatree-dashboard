import { useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { KitStatus } from '@/utils/constants'
import { formatCurrency } from '@/lib/utils'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'
import {
  Package, Users, ShoppingCart, TrendingUp, TrendingDown,
  Clock, CheckCircle, AlertTriangle, Truck, BarChart3,
  ArrowUpRight, ArrowRight, Search,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

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

const kitPieData = [
  { name: 'Stokta', value: 245, color: W.olive },
  { name: 'Analizde', value: 67, color: W.orange },
  { name: 'Zimmetli', value: 128, color: W.amber },
  { name: 'Tamamlanan', value: 892, color: W.green },
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

const recentKits = [
  { barcode: 'OT-2025-00142', status: KitStatus.IN_ANALYSIS, dietitian: 'Dr. Ayse Y.', date: 'Bugun' },
  { barcode: 'OT-2025-00141', status: KitStatus.DELIVERED, dietitian: 'Dr. Fatma D.', date: 'Bugun' },
  { barcode: 'OT-2025-00140', status: KitStatus.COMPLETED, dietitian: 'Dr. Ali K.', date: 'Dun' },
  { barcode: 'OT-2025-00139', status: KitStatus.SAMPLE_SENT, dietitian: 'Dr. Zeynep O.', date: 'Dun' },
]

const topDietitians = [
  { name: 'Dr. Ayse Yilmaz', kits: 24, revenue: 36000, pct: 96 },
  { name: 'Dr. Fatma Demir', kits: 18, revenue: 27000, pct: 72 },
  { name: 'Dr. Ali Kaya', kits: 15, revenue: 22500, pct: 60 },
]

const kitCategories = [
  { label: 'Premium', count: 542, color: W.olive },
  { label: 'Standart', count: 389, color: W.orange },
  { label: 'Cocuk', count: 246, color: W.amber },
  { label: 'Diger', count: 155, color: W.green },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const tooltipStyle = {
  background: '#fff',
  border: `1px solid ${W.warmBorder}`,
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  fontSize: '12px',
  padding: '10px 14px',
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()

  return (
    <div className="space-y-5 animate-fade-in">

          {/* ═══════ GREETING ═══════ */}
          <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-[22px] font-bold" style={{ color: W.dark }}>
                  Merhaba, {user?.firstName || 'Admin'}! <span className="inline-block animate-[wave_1.5s_ease-in-out_infinite]">&#x1F44B;</span>
                </h1>
                <p className="text-[13px] mt-0.5" style={{ color: W.textLight }}>
                  Bugunun ozetini inceleyelim. Sisteminiz aktif ve saglikli.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 h-10 px-4 rounded-xl border" style={{ background: '#fff', borderColor: W.warmBorder }}>
                <Search className="h-4 w-4" style={{ color: W.warmGrayLight }} />
                <span className="text-[13px]" style={{ color: W.warmGrayLight }}>Ara...</span>
              </div>
            </div>
          </motion.div>

          {/* ═══════ STAT CARDS ═══════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Toplam Kit', value: '1,332', change: 12.5, icon: Package, iconColor: W.olive, iconBg: W.oliveLight },
              { title: 'Aktif Diyetisyen', value: '48', change: 8.2, icon: Users, iconColor: W.orange, iconBg: W.orangeLight },
              { title: 'Bekleyen Siparis', value: '7', change: -3.1, icon: ShoppingCart, iconColor: W.amber, iconBg: W.amberLight },
              { title: 'Aylik Gelir', value: formatCurrency(83000), change: 16.9, icon: TrendingUp, iconColor: W.green, iconBg: W.greenLight },
            ].map((s, i) => {
              const Icon = s.icon
              const up = s.change >= 0
              return (
                <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
                  <div
                    className="rounded-2xl p-5 min-h-[122px] transition-shadow hover:shadow-md cursor-default flex items-center"
                    style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                        <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wider leading-tight" style={{ color: W.textLight }}>{s.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: up ? W.greenLight : '#FDE8E8',
                              color: up ? '#3D8B3D' : '#C53030',
                            }}
                          >
                            {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {up ? '+' : ''}{s.change}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* ═══════ MAIN GRID ═══════ */}
          <div className="grid grid-cols-12 gap-4">

            {/* ── Gelir Trendi — BAR CHART (warm orange bars like Nutrigo) ── */}
            <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-start justify-between min-h-[54px] mb-5">
                  <div>
                    <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Gelir Trendi</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Aylik gelir ozeti (bin TL)</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: W.oliveLight }}>
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: W.olive }} />
                    <span className="text-[12px] font-bold" style={{ color: W.olive }}>+16.9%</span>
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
                      <CartesianGrid strokeDasharray="3 3" stroke={W.creamDark} vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} tickFormatter={(v: number) => `${v}K`} />
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

            {/* ── Kit Dagilimi — DONUT (Nutrigo Expense Breakdown style) ── */}
            <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-start justify-between min-h-[54px] mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kit Dagilimi</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Durumlara gore dagilim</p>
                  </div>
                  <span className="text-2xl font-black" style={{ color: W.dark }}>1,332</span>
                </div>

                <div className="relative h-[180px] flex items-center justify-center">
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
                      <p className="text-[11px]" style={{ color: W.textLight }}>Toplam</p>
                      <p className="text-xl font-black" style={{ color: W.dark }}>1,332</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mt-3 flex-1">
                  {kitPieData.map((item) => {
                    const pct = Math.round((item.value / 1332) * 100)
                    return (
                      <div key={item.name} className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color }} />
                        <span className="text-[12px] flex-1" style={{ color: W.text }}>{item.name}</span>
                        <span className="text-[12px] font-bold" style={{ color: W.dark }}>{item.value}</span>
                        <span className="text-[10px] w-8 text-right" style={{ color: W.textLight }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            {/* ── Haftalik Kit Aktivitesi — mini bar chart ── */}
            <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-start justify-between min-h-[54px] mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Haftalik Kit</h3>
                    <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Bu haftaki kit hareketleri</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: W.dark }}>56</p>
                    <p className="text-[10px]" style={{ color: W.textLight }}>toplam</p>
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
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: W.warmGrayLight }} dy={4} />
                      <YAxis hide />
                      <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} kit`, 'Kit']} cursor={false} />
                      <Bar dataKey="value" fill="url(#barOlive)" radius={[6, 6, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* ── Canli Aktivite — Timeline with warm lines ── */}
            <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Canli Aktivite</h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: W.greenLight }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: W.green }} />
                    <span className="text-[10px] font-semibold" style={{ color: '#3D8B3D' }}>Canli</span>
                  </div>
                </div>

                <div className="relative flex-1">
                  {/* Timeline line */}
                  <div
                    className="absolute left-[19px] top-4 bottom-4 w-px"
                    style={{ background: `linear-gradient(to bottom, ${W.warmBorder}, transparent)` }}
                  />

                  <div className="space-y-1">
                    {recentActivity.map((act, i) => (
                      <div key={i} className="relative flex items-start gap-3.5 p-2.5 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer group">
                        <div
                          className="relative z-10 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ring-[3px] ring-white transition-transform group-hover:scale-105"
                          style={{ background: act.bg }}
                        >
                          <act.icon className="h-4.5 w-4.5" style={{ color: act.color }} />
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-[12px] font-medium leading-snug" style={{ color: W.text }}>{act.text}</p>
                          <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: W.warmGrayLight }}>
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
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: W.dark }}>Kit Kategorileri</h3>
                <p className="text-[12px] mb-5" style={{ color: W.textLight }}>Kategorilere gore dagilim</p>

                <div className="space-y-5 flex-1">
                  {kitCategories.map((cat, i) => {
                    const pct = Math.round((cat.count / 1332) * 100)
                    return (
                      <div key={cat.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                            <span className="text-[12px] font-medium" style={{ color: W.text }}>{cat.label}</span>
                          </div>
                          <span className="text-[12px] font-bold" style={{ color: W.dark }}>{cat.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
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

                <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                  <span className="text-[12px]" style={{ color: W.textLight }}>Toplam</span>
                  <span className="text-lg font-bold" style={{ color: W.dark }}>1,332</span>
                </div>
              </div>
            </motion.div>

            {/* ── Son Kit Hareketleri ── */}
            <motion.div className="col-span-12 lg:col-span-6" {...fadeUp} transition={{ duration: 0.35, delay: 0.35 }}>
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Son Kit Hareketleri</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/stock')}
                    className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: W.olive }}
                  >
                    Tumunu Gor <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  {recentKits.map((kit) => (
                    <div
                      key={kit.barcode}
                      className="flex items-center justify-between p-3.5 rounded-xl transition-colors cursor-pointer hover:shadow-sm"
                      style={{ background: W.cream, border: `1px solid transparent` }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.warmBorder; e.currentTarget.style.background = '#fff' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = W.cream }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: W.oliveLight }}>
                          <Package className="h-4 w-4" style={{ color: W.olive }} />
                        </div>
                        <div>
                          <code className="text-[12px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px]" style={{ color: W.textLight }}>{kit.dietitian}</span>
                            <span className="text-[10px]" style={{ color: W.warmGrayLight }}>·</span>
                            <span className="text-[10px]" style={{ color: W.textLight }}>{kit.date}</span>
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
              <div className="rounded-2xl p-5 h-full flex flex-col" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center justify-between min-h-[54px] mb-4">
                  <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>En Iyi Diyetisyenler</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: W.oliveLight, color: W.olive }}>Bu Ay</span>
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
                            <p className="text-[12px] font-semibold truncate" style={{ color: W.dark }}>{dt.name}</p>
                            <span className="text-[12px] font-bold shrink-0" style={{ color: W.olive }}>{formatCurrency(dt.revenue)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px]" style={{ color: W.textLight }}>{dt.kits} kit</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
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
                  onClick={() => navigate('/admin/users')}
                  className="w-full mt-5 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-colors"
                  style={{ background: W.oliveLight, color: W.olive }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = W.oliveLight }}
                >
                  Tum Diyetisyenleri Gor <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>

          </div>
    </div>
  )
}
