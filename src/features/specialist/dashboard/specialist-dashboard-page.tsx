import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import {
  BookOpen, FileCheck, Clock, PenTool, ArrowUpRight, ShieldCheck,
  TrendingUp, TrendingDown, CheckCircle,
} from 'lucide-react'
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

const monthlyReports = [
  { month: 'Oca', rapor: 4 }, { month: 'Sub', rapor: 5 }, { month: 'Mar', rapor: 6 },
  { month: 'Nis', rapor: 3 }, { month: 'May', rapor: 7 }, { month: 'Haz', rapor: 5 },
]

const statusPie = [
  { name: 'Bekleyen', value: 3, color: W.amber },
  { name: 'Hazirlaniyor', value: 1, color: W.orange },
  { name: 'Onay Bekliyor', value: 2, color: W.olive },
  { name: 'Tamamlanan', value: 28, color: W.green },
]

const performanceData = [{ name: 'Performans', value: 94, fill: W.olive }]

const pendingAssignments = [
  { barcode: 'OT-2025-00130', assignedAt: '15 Haz 10:00', priority: 'normal', type: 'Mikrobiyom' },
  { barcode: 'OT-2025-00128', assignedAt: '14 Haz 14:00', priority: 'urgent', type: 'Omega-3 Index' },
  { barcode: 'OT-2025-00125', assignedAt: '13 Haz 09:00', priority: 'normal', type: 'Vitamin Panel' },
]

const recentCompleted = [
  { barcode: 'OT-2025-00120', date: 'Bugun', duration: '1.5 gun', score: 4.9 },
  { barcode: 'OT-2025-00118', date: 'Dun', duration: '2.0 gun', score: 4.8 },
  { barcode: 'OT-2025-00115', date: '2 gun once', duration: '1.8 gun', score: 5.0 },
]

const weeklyActivity = [
  { icon: CheckCircle, color: W.green, bg: W.greenLight, text: 'OT-2025-00120 raporu onaylandi', time: '3 saat once' },
  { icon: PenTool, color: W.orange, bg: W.orangeLight, text: 'OT-2025-00128 raporu baslatildi', time: '5 saat once' },
  { icon: BookOpen, color: W.olive, bg: W.oliveLight, text: 'Yeni analiz atandi: OT-2025-00130', time: 'Dun' },
]

const tooltipStyle = { background: '#fff', border: `1px solid ${W.warmBorder}`, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function SpecialistDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ GREETING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <h1 className="text-[22px] font-bold" style={{ color: W.dark }}>Uzman Paneli</h1>
        <p className="text-[13px] mt-0.5" style={{ color: W.textLight }}>Atanan analizler, rapor durumlariniz ve performans ozeti</p>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Bekleyen', value: '3', change: -1, icon: BookOpen, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Hazirlaniyor', value: '1', change: 0, icon: PenTool, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Tamamlanan', value: '28', change: 5, icon: FileCheck, iconColor: W.green, iconBg: W.greenLight },
          { title: 'Ort. Sure', value: '1.8 gun', change: -0.2, icon: Clock, iconColor: W.olive, iconBg: W.oliveLight },
        ].map((s, i) => {
          const Icon = s.icon
          const up = s.change > 0
          const down = s.change < 0
          const isGoodDown = s.title === 'Bekleyen' || s.title === 'Ort. Sure'
          const positive = isGoodDown ? down : up
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
                      {s.change !== 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: positive ? W.greenLight : '#FDE8E8', color: positive ? '#3D8B3D' : '#C53030' }}>
                          {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {s.change > 0 ? '+' : ''}{s.change}
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

      {/* ═══ ROW 1: Monthly Chart + Status Donut ═══ */}
      <div className="grid grid-cols-12 gap-4">
        <motion.div className="col-span-12 lg:col-span-8" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Aylik Rapor Trendi</h3>
                <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Tamamlanan rapor sayilari</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: W.oliveLight }}>
                <TrendingUp className="h-3.5 w-3.5" style={{ color: W.olive }} />
                <span className="text-[12px] font-bold" style={{ color: W.olive }}>30 rapor (YTD)</span>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={W.creamDark} vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} />
                  <ReTooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0} rapor`, 'Tamamlanan']} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="rapor" fill="url(#barSpec)" radius={[8, 8, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Rapor Dagilimi</h3>
              <span className="text-xl font-black" style={{ color: W.dark }}>34</span>
            </div>
            <div className="relative h-[150px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-lg font-black" style={{ color: W.dark }}>34</p>
                  <p className="text-[9px]" style={{ color: W.textLight }}>Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {statusPie.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: item.color }} />
                  <span className="text-[12px] flex-1" style={{ color: W.text }}>{item.name}</span>
                  <span className="text-[12px] font-bold" style={{ color: W.dark }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ ROW 2: Assignments + Completed + Performance ═══ */}
      <div className="grid grid-cols-12 gap-4">

        {/* Pending Assignments */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Bekleyen Analizler</h3>
              <button type="button" onClick={() => navigate('/specialist/assignments')} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: W.olive }}>
                Tumu <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {pendingAssignments.map((item) => (
                <div key={item.barcode} className="flex items-center justify-between p-3.5 rounded-xl transition-colors" style={{ background: W.cream }} onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }} onMouseLeave={(e) => { e.currentTarget.style.background = W.cream }}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: W.orangeLight }}>
                      <BookOpen className="h-4.5 w-4.5" style={{ color: W.orange }} />
                    </div>
                    <div>
                      <code className="text-[12px] font-mono font-bold" style={{ color: W.dark }}>{item.barcode}</code>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: W.textLight }}>{item.type}</span>
                        <span className="text-[10px]" style={{ color: W.warmGrayLight }}>·</span>
                        <span className="text-[10px]" style={{ color: W.textLight }}>{item.assignedAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priority === 'urgent' && <Badge variant="danger" dot pulse>Acil</Badge>}
                    <Button variant="default" size="xs" onClick={() => navigate('/specialist/reports')}>
                      <PenTool className="h-3 w-3" /> Baslat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent completed + activity */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: W.dark }}>Son Raporlarim</h3>
            <div className="space-y-2">
              {recentCompleted.map((r) => (
                <div key={r.barcode} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: W.greenLight }}>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#C8E6C8' }}>
                    <CheckCircle className="h-4 w-4" style={{ color: '#3D8B3D' }} />
                  </div>
                  <div className="flex-1">
                    <code className="text-[12px] font-mono font-bold" style={{ color: '#2D5A2D' }}>{r.barcode}</code>
                    <p className="text-[10px]" style={{ color: '#4A7A4A' }}>{r.date} · {r.duration} · Puan: {r.score}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Activity feed */}
            <h4 className="text-[13px] font-semibold mt-5 mb-3" style={{ color: W.dark }}>Aktivite</h4>
            <div className="relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-px" style={{ background: `linear-gradient(to bottom, ${W.warmBorder}, transparent)` }} />
              {weeklyActivity.map((a, i) => (
                <div key={i} className="relative flex items-start gap-2.5 p-1.5 rounded-lg">
                  <div className="relative z-10 h-7 w-7 rounded-md flex items-center justify-center shrink-0 ring-2 ring-white" style={{ background: a.bg }}>
                    <a.icon className="h-3 w-3" style={{ color: a.color }} />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[10px] font-medium" style={{ color: W.text }}>{a.text}</p>
                    <p className="text-[9px]" style={{ color: W.warmGrayLight }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Performance + Protocol */}
        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: W.dark }}>Performans</h3>
            <div className="flex flex-col items-center">
              <div className="h-[110px] w-[110px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={performanceData}>
                    <RadialBar background={{ fill: W.creamDark }} dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-black" style={{ color: W.dark }}>94<span className="text-xs" style={{ color: W.textLight }}>%</span></p>
                </div>
              </div>
              <p className="text-[10px] text-center mt-1" style={{ color: W.textLight }}>Zamaninda teslim</p>

              <div className="w-full space-y-2.5 mt-4 pt-3" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px]" style={{ color: W.textLight }}>Kalite</span>
                    <span className="text-[10px] font-bold" style={{ color: W.green }}>4.9/5</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
                    <div className="h-full rounded-full" style={{ width: '98%', background: W.green }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px]" style={{ color: W.textLight }}>Hiz</span>
                    <span className="text-[10px] font-bold" style={{ color: W.olive }}>1.8 gun</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
                    <div className="h-full rounded-full" style={{ width: '85%', background: W.olive }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Kor Protocol mini */}
            <div className="rounded-xl p-3 mt-4 text-center" style={{ background: W.dark }}>
              <ShieldCheck className="h-5 w-5 mx-auto mb-1" style={{ color: W.olive }} />
              <p className="text-[10px] font-semibold text-white">Kor Protokol Aktif</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
