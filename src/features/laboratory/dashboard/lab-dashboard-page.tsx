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
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus, KIT_STATUS_LABELS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Eye } from 'lucide-react'

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

const dailyAnalysis = [
  { day: 'Pzt', tamamlanan: 5, gelen: 7 }, { day: 'Sal', tamamlanan: 8, gelen: 6 },
  { day: 'Car', tamamlanan: 6, gelen: 9 }, { day: 'Per', tamamlanan: 10, gelen: 5 },
  { day: 'Cum', tamamlanan: 7, gelen: 8 }, { day: 'Cmt', tamamlanan: 3, gelen: 2 },
  { day: 'Paz', tamamlanan: 1, gelen: 0 },
]

/** Laboratuvar pipeline statuslari: havuz, analizde, reddedildi, tamamlandi */
const LAB_PIPELINE_STATUSES = [
  KitStatus.SAMPLE_SENT,
  KitStatus.LAB_PENDING,
  KitStatus.IN_ANALYSIS,
  KitStatus.REJECTED,
  KitStatus.ANALYSIS_COMPLETE,
  KitStatus.SPECIALIST_POOL,
  KitStatus.COMPLETED,
] as const

const tooltipStyle = { background: '#fff', border: `1px solid ${W.warmBorder}`, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', padding: '10px 14px' }
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function LabDashboardPage() {
  const navigate = useNavigate()
  const { kits } = useWorkflowStore()

  const labKits = useMemo(
    () => kits.filter((k) => (LAB_PIPELINE_STATUSES as readonly KitStatus[]).includes(k.status)),
    [kits]
  )

  const statsByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    LAB_PIPELINE_STATUSES.forEach((s) => { map[s] = 0 })
    labKits.forEach((k) => { map[k.status] = (map[k.status] ?? 0) + 1 })
    return map
  }, [labKits])

  const havuzdaCount = (statsByStatus[KitStatus.SAMPLE_SENT] ?? 0) + (statsByStatus[KitStatus.LAB_PENDING] ?? 0)
  const analizdeCount = statsByStatus[KitStatus.IN_ANALYSIS] ?? 0
  const reddedilenCount = statsByStatus[KitStatus.REJECTED] ?? 0
  const tamamlananCount = (statsByStatus[KitStatus.ANALYSIS_COMPLETE] ?? 0) + (statsByStatus[KitStatus.SPECIALIST_POOL] ?? 0) + (statsByStatus[KitStatus.COMPLETED] ?? 0)

  const pipelinePieData = useMemo(() => {
    const items: { name: string; value: number; color: string; status: string }[] = []
    if (havuzdaCount > 0) items.push({ name: KIT_STATUS_LABELS[KitStatus.SAMPLE_SENT], value: havuzdaCount, color: W.amber, status: 'havuz' })
    if (analizdeCount > 0) items.push({ name: KIT_STATUS_LABELS[KitStatus.IN_ANALYSIS], value: analizdeCount, color: W.orange, status: 'analiz' })
    if (reddedilenCount > 0) items.push({ name: KIT_STATUS_LABELS[KitStatus.REJECTED], value: reddedilenCount, color: W.red, status: 'rejected' })
    if (tamamlananCount > 0) items.push({ name: 'Tamamlanan', value: tamamlananCount, color: W.green, status: 'done' })
    return items.length ? items : [{ name: 'Veri yok', value: 1, color: W.creamDark, status: 'none' }]
  }, [havuzdaCount, analizdeCount, reddedilenCount, tamamlananCount])

  const queueItems = useMemo(() => {
    return labKits
      .filter((k) => k.status === KitStatus.SAMPLE_SENT || k.status === KitStatus.LAB_PENDING)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((k) => ({
        barcode: k.barcode,
        receivedAt: formatDateTime(k.createdAt),
        status: k.status,
      }))
  }, [labKits])

  const recentCompleted = useMemo(() => {
    return labKits
      .filter((k) => k.status === KitStatus.ANALYSIS_COMPLETE || k.status === KitStatus.SPECIALIST_POOL || k.status === KitStatus.COMPLETED)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((k) => ({ barcode: k.barcode, completedAt: formatDate(k.createdAt), status: k.status }))
  }, [labKits])

  const totalPipeline = havuzdaCount + analizdeCount + reddedilenCount + tamamlananCount
  const performanceValue = totalPipeline > 0 ? Math.round((tamamlananCount / totalPipeline) * 100) : 0
  const performanceData = [{ name: 'Verimlilik', value: performanceValue, fill: W.olive }]

  const [detailBarcode, setDetailBarcode] = useState<string | null>(null)
  const selectedKit = useMemo(() => (detailBarcode ? kits.find((k) => k.barcode === detailBarcode) : null), [kits, detailBarcode])

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ GREETING + Hizli baglantilar ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: W.dark }}>Laboratuvar Paneli</h1>
          <p className="text-[13px] mt-0.5" style={{ color: W.textLight }}>Numune havuzu, analiz surecleri ve performans ozeti</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/lab/pool')} className="gap-1.5">
            <TestTubes className="h-4 w-4" />
            Numune Havuzu
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/lab/analysis')} className="gap-1.5">
            <FlaskConical className="h-4 w-4" />
            Analizler
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/lab/results')} className="gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Sonuclar
          </Button>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS — Statusa gore istatistikler ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: KIT_STATUS_LABELS[KitStatus.SAMPLE_SENT], value: String(havuzdaCount), icon: TestTubes, iconColor: W.amber, iconBg: W.amberLight },
          { title: KIT_STATUS_LABELS[KitStatus.IN_ANALYSIS], value: String(analizdeCount), icon: FlaskConical, iconColor: W.orange, iconBg: W.orangeLight },
          { title: KIT_STATUS_LABELS[KitStatus.REJECTED], value: String(reddedilenCount), icon: XCircle, iconColor: W.red, iconBg: W.redLight },
          { title: 'Tamamlanan', value: String(tamamlananCount), icon: CheckCircle, iconColor: W.green, iconBg: W.greenLight },
        ].map((s, i) => {
          const Icon = s.icon
          return (
          <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.06 }}>
            <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                  <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                  <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
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
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Duruma Gore Istatistik</h3>
              <span className="text-xl font-black" style={{ color: W.dark }}>{totalPipeline}</span>
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
                  <p className="text-lg font-black" style={{ color: W.dark }}>{totalPipeline}</p>
                  <p className="text-[9px]" style={{ color: W.textLight }}>Toplam</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {pipelinePieData.map((item) => (
                <div key={item.status} className="flex items-center gap-2.5">
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
              {queueItems.length === 0 ? (
                <p className="text-[12px] text-surface-500 py-4 text-center">Havuzda bekleyen numune yok</p>
              ) : (
                queueItems.map((item) => (
                  <div key={item.barcode} className="flex items-center justify-between p-3 rounded-xl transition-colors" style={{ background: W.cream }} onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }} onMouseLeave={(e) => { e.currentTarget.style.background = W.cream }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: W.orangeLight }}>
                        <TestTubes className="h-4 w-4" style={{ color: W.orange }} />
                      </div>
                      <div className="min-w-0">
                        <button type="button" onClick={() => setDetailBarcode(item.barcode)} className="text-left block w-full">
                          <code className="text-[12px] font-mono font-bold hover:underline" style={{ color: W.dark }}>{item.barcode}</code>
                        </button>
                        <p className="text-[10px]" style={{ color: W.textLight }}>Gelis: {item.receivedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="xs" onClick={() => setDetailBarcode(item.barcode)} title="Detay"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="default" size="xs" onClick={() => navigate('/lab/pool')}>Sec</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Recent completed */}
        <motion.div className="col-span-12 lg:col-span-4" {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: W.dark }}>Son Tamamlananlar</h3>
            <div className="space-y-3">
              {recentCompleted.length === 0 ? (
                <p className="text-[12px] text-surface-500 py-4 text-center">Henuz tamamlanan yok</p>
              ) : (
                recentCompleted.map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => setDetailBarcode(item.barcode)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:opacity-90 transition-opacity"
                    style={{ background: W.greenLight }}
                  >
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#C8E6C8' }}>
                      <CheckCircle className="h-4 w-4" style={{ color: '#3D8B3D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-bold block" style={{ color: '#2D5A2D' }}>{item.barcode}</code>
                      <p className="text-[10px]" style={{ color: '#4A7A4A' }}>{item.completedAt}</p>
                    </div>
                    <Eye className="h-3.5 w-3.5 shrink-0" style={{ color: '#4A7A4A' }} />
                  </button>
                ))
              )}
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
                  <p className="text-2xl font-black" style={{ color: W.dark }}>{performanceValue}<span className="text-sm" style={{ color: W.textLight }}>%</span></p>
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

      {/* Kit detay modali */}
      <Modal open={!!detailBarcode} onOpenChange={(open) => !open && setDetailBarcode(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Kit / Numune Detayi</ModalTitle>
            <ModalDescription>{selectedKit?.barcode}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selectedKit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{selectedKit.barcode}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{KIT_STATUS_LABELS[selectedKit.status]}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Konum</p>
                  <p>{selectedKit.location}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Tarih</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                {selectedKit.analysisProgress != null && (
                  <div>
                    <p className="text-surface-500 text-xs">Ilerleme</p>
                    <p>%{selectedKit.analysisProgress}</p>
                  </div>
                )}
                {selectedKit.assignedDietitianName && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Diyetisyen</p>
                    <p>{selectedKit.assignedDietitianName}</p>
                  </div>
                )}
                {selectedKit.assignedClientName && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Danisan</p>
                    <p>{selectedKit.assignedClientName}</p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
