import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import {
  TestTubes, FlaskConical, CheckCircle, Clock, ArrowUpRight,
  ShieldCheck, Zap, TrendingUp, TrendingDown,
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

const dailyAnalysis = [
  { day: 'Pzt', tamamlanan: 5, gelen: 7 }, { day: 'Sal', tamamlanan: 8, gelen: 6 },
  { day: 'Car', tamamlanan: 6, gelen: 9 }, { day: 'Per', tamamlanan: 10, gelen: 5 },
  { day: 'Cum', tamamlanan: 7, gelen: 8 }, { day: 'Cmt', tamamlanan: 3, gelen: 2 },
  { day: 'Paz', tamamlanan: 1, gelen: 0 },
]

const pipelinePie = [
  { name: 'Havuzda', value: 4, color: W.amber },
  { name: 'Analizde', value: 12, color: W.orange },
  { name: 'Sonuc Bekliyor', value: 3, color: W.olive },
  { name: 'Tamamlanan', value: 45, color: W.green },
]

const performanceData = [{ name: 'Verimlilik', value: 92, fill: W.olive }]

const queueItems = [
  { barcode: 'OT-2025-00142', receivedAt: '15 Haz 14:30', priority: 'normal', age: '4 saat' },
  { barcode: 'OT-2025-00141', receivedAt: '15 Haz 11:00', priority: 'normal', age: '7 saat' },
  { barcode: 'OT-2025-00140', receivedAt: '14 Haz 16:45', priority: 'urgent', age: '1 gun' },
  { barcode: 'OT-2025-00138', receivedAt: '14 Haz 09:20', priority: 'normal', age: '1.5 gun' },
]

const recentCompleted = [
  { barcode: 'OT-2025-00135', completedAt: 'Bugun 11:30', duration: '2.8 gun' },
  { barcode: 'OT-2025-00133', completedAt: 'Bugun 09:15', duration: '3.1 gun' },
  { barcode: 'OT-2025-00130', completedAt: 'Dun 16:40', duration: '2.5 gun' },
]

const tooltipStyle = { background: '#fff', border: `1px solid ${W.warmBorder}`, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function LabDashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ GREETING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <h1 className="text-[22px] font-bold" style={{ color: W.dark }}>Laboratuvar Paneli</h1>
        <p className="text-[13px] mt-0.5" style={{ color: W.textLight }}>Numune havuzu, analiz surecleri ve performans ozeti</p>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Havuzda Bekleyen', value: '4', change: -2, icon: TestTubes, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Analizde', value: '12', change: 3, icon: FlaskConical, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Bugun Tamamlanan', value: '6', change: 1, icon: CheckCircle, iconColor: W.green, iconBg: W.greenLight },
          { title: 'Ort. Analiz Suresi', value: '3.2 gun', change: -0.3, icon: Clock, iconColor: W.olive, iconBg: W.oliveLight },
        ].map((s, i) => {
          const Icon = s.icon
          const up = s.change >= 0
          const isGoodDown = s.title === 'Havuzda Bekleyen' || s.title === 'Ort. Analiz Suresi'
          const positive = isGoodDown ? !up : up
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: positive ? W.greenLight : '#FDE8E8', color: positive ? '#3D8B3D' : '#C53030' }}>
                        {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {s.change > 0 ? '+' : ''}{s.change}
                      </span>
                    </div>
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
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Haftalik Analiz Trendi</h3>
                <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Gelen numuneler vs tamamlanan analizler</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: W.orange }} /><span className="text-[10px]" style={{ color: W.textLight }}>Gelen</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: W.olive }} /><span className="text-[10px]" style={{ color: W.textLight }}>Tamamlanan</span></div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyAnalysis} barGap={4} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={W.creamDark} vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: W.warmGrayLight }} />
                  <ReTooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
                  <Bar dataKey="gelen" fill={W.orange} radius={[6, 6, 0, 0]} name="Gelen" opacity={0.8} />
                  <Bar dataKey="tamamlanan" fill={W.olive} radius={[6, 6, 0, 0]} name="Tamamlanan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Analiz Hatti</h3>
              <span className="text-xl font-black" style={{ color: W.dark }}>64</span>
            </div>
            <div className="relative h-[150px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelinePie} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pipelinePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-lg font-black" style={{ color: W.dark }}>64</p>
                  <p className="text-[9px]" style={{ color: W.textLight }}>Bu Hafta</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {pipelinePie.map((item) => (
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

      {/* ═══ ROW 2: Queue + Completed + Performance ═══ */}
      <div className="grid grid-cols-12 gap-4">

        {/* Queue */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: W.orange }} />
                <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Numune Sirasi</h3>
              </div>
              <button type="button" onClick={() => navigate('/lab/pool')} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: W.olive }}>
                Havuza Git <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2">
              {queueItems.map((item) => (
                <div key={item.barcode} className="flex items-center justify-between p-3 rounded-xl transition-colors" style={{ background: W.cream }} onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }} onMouseLeave={(e) => { e.currentTarget.style.background = W.cream }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: W.orangeLight }}>
                      <TestTubes className="h-4 w-4" style={{ color: W.orange }} />
                    </div>
                    <div>
                      <code className="text-[12px] font-mono font-bold" style={{ color: W.dark }}>{item.barcode}</code>
                      <p className="text-[10px]" style={{ color: W.textLight }}>Bekleme: {item.age}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priority === 'urgent' && <Badge variant="danger" dot pulse>Acil</Badge>}
                    <Button variant="default" size="xs" onClick={() => navigate('/lab/pool')}>Sec</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent completed */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: W.dark }}>Son Tamamlananlar</h3>
            <div className="space-y-3">
              {recentCompleted.map((item) => (
                <div key={item.barcode} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: W.greenLight }}>
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: '#C8E6C8' }}>
                    <CheckCircle className="h-4 w-4" style={{ color: '#3D8B3D' }} />
                  </div>
                  <div className="flex-1">
                    <code className="text-[12px] font-mono font-bold" style={{ color: '#2D5A2D' }}>{item.barcode}</code>
                    <p className="text-[10px]" style={{ color: '#4A7A4A' }}>{item.completedAt} · {item.duration}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Kor Protocol mini */}
            <div className="rounded-xl p-4 mt-4 text-center" style={{ background: W.dark }}>
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg mb-2" style={{ background: 'rgba(139,154,75,0.2)' }}>
                <ShieldCheck className="h-5 w-5" style={{ color: W.olive }} />
              </div>
              <p className="text-[11px] font-semibold text-white">Kor Protokol Aktif</p>
              <p className="text-[10px] mt-1" style={{ color: '#9C968D' }}>Danisan bilgileri gizlidir</p>
            </div>
          </div>
        </motion.div>

        {/* Performance gauge */}
        <motion.div className="col-span-12 lg:col-span-3" {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: W.dark }}>Verimlilik</h3>
            <div className="flex flex-col items-center">
              <div className="h-[120px] w-[120px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={performanceData}>
                    <RadialBar background={{ fill: W.creamDark }} dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-2xl font-black" style={{ color: W.dark }}>92<span className="text-sm" style={{ color: W.textLight }}>%</span></p>
                </div>
              </div>
              <p className="text-[11px] text-center mt-2" style={{ color: W.textLight }}>Zamaninda tamamlanma</p>

              <div className="w-full space-y-3 mt-4 pt-4" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: W.textLight }}>Ort. Sure</span>
                    <span className="text-[10px] font-bold" style={{ color: W.olive }}>3.2 gun</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
                    <div className="h-full rounded-full" style={{ width: '68%', background: W.olive }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: W.textLight }}>Kalite Skoru</span>
                    <span className="text-[10px] font-bold" style={{ color: W.green }}>4.9/5</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: W.creamDark }}>
                    <div className="h-full rounded-full" style={{ width: '98%', background: W.green }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
