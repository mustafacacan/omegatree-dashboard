import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'
import { useCurrentUser } from '@/stores/auth.store'
import { Timeline } from '@/components/shared/timeline'
import '@/components/ui'
import { motion } from 'framer-motion'
import {
  Package, FileCheck, Heart, ArrowRight, CheckCircle,
  Clock, FlaskConical, Calendar, Info,
} from 'lucide-react'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

const kitTimeline = [
  { label: 'Kit Talep Edildi', description: 'Diyetisyeniniz tarafindan', date: '10 Haz', status: 'completed' as const },
  { label: 'Kit Teslim Alindi', description: 'Kargo ile gonderildi', date: '12 Haz', status: 'completed' as const },
  { label: 'Numune Gonderildi', description: 'Kargo: YK-12345', date: '14 Haz', status: 'completed' as const },
  { label: 'Laboratuvar Analizi', description: 'Sonuclar hazirlaniyor...', status: 'current' as const },
  { label: 'Uzman Degerlendirmesi', status: 'upcoming' as const },
  { label: 'Rapor Teslimi', status: 'upcoming' as const },
]

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function DanisanPortalPage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Gunaydin' : hour < 18 ? 'Iyi gunler' : 'Iyi aksamlar'

  const completedSteps = kitTimeline.filter(s => s.status === 'completed').length
  const totalSteps = kitTimeline.length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ═══ GREETING ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <h1 className="text-[22px] font-bold" style={{ color: W.dark }}>
          {greeting}, {user?.firstName ?? 'Danisan'}! <span className="inline-block">&#x1F44B;</span>
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: W.textLight }}>
          Omega-3 Index kit ve raporlariniza buradan ulasabilirsiniz
        </p>
      </motion.div>

      {/* ═══ PROGRESS SUMMARY ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kit Surecim</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Mevcut kitinizin durumu</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ color: W.olive }}>{progressPct}%</p>
              <p className="text-[10px]" style={{ color: W.textLight }}>Tamamlanan</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ background: W.creamDark }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${W.olive}, ${W.green})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <p className="text-[10px] text-right" style={{ color: W.textLight }}>{completedSteps}/{totalSteps} adim tamamlandi</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {kitTimeline.map((step, i) => {
              const isComplete = step.status === 'completed'
              const isCurrent = step.status === 'current'
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      background: isComplete ? W.olive : isCurrent ? W.orangeLight : W.creamDark,
                      color: isComplete ? '#fff' : isCurrent ? W.orange : W.warmGrayLight,
                    }}
                  >
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < kitTimeline.length - 1 && (
                    <div className="flex-1 h-0.5 rounded-full" style={{ background: isComplete ? W.olive : W.creamDark }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid grid-cols-12 gap-4">

        {/* Kit Timeline Detail */}
        <motion.div className="col-span-12 lg:col-span-5" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Detayli Surec</h3>
              <button type="button" onClick={() => navigate(ROUTES.DANISAN_KIT)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: W.olive }}>
                Detay <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <Timeline steps={kitTimeline} />
          </div>
        </motion.div>

        {/* Quick Info Cards */}
        <motion.div className="col-span-12 lg:col-span-7" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">

            {/* Kit Status */}
            <div className="rounded-2xl p-5 cursor-pointer transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }} onClick={() => navigate(ROUTES.DANISAN_KIT)}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3" style={{ background: W.orangeLight }}>
                <FlaskConical className="h-5 w-5" style={{ color: W.orange }} />
              </div>
              <h4 className="text-[14px] font-semibold mb-1" style={{ color: W.dark }}>Analiz Devam Ediyor</h4>
              <p className="text-[12px] leading-relaxed" style={{ color: W.textLight }}>
                Numuneniz laboratuvarda inceleniyor. Tahmini tamamlanma suresi 2-3 gun.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium" style={{ color: W.orange }}>
                <Clock className="h-3 w-3" /> Tahmini: 2 gun
              </div>
            </div>

            {/* Reports */}
            <div className="rounded-2xl p-5 cursor-pointer transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }} onClick={() => navigate(ROUTES.DANISAN_RAPORLAR)}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3" style={{ background: W.oliveLight }}>
                <FileCheck className="h-5 w-5" style={{ color: W.olive }} />
              </div>
              <h4 className="text-[14px] font-semibold mb-1" style={{ color: W.dark }}>Raporlarim</h4>
              <p className="text-[12px] leading-relaxed" style={{ color: W.textLight }}>
                Tamamlanan analiz raporlarinizi goruntuleyebilir ve indirebilirsiniz.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium" style={{ color: W.olive }}>
                Raporlara Git <ArrowRight className="h-3 w-3" />
              </span>
            </div>

            {/* Dietitian Info */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3" style={{ background: W.greenLight }}>
                <Calendar className="h-5 w-5" style={{ color: W.green }} />
              </div>
              <h4 className="text-[14px] font-semibold mb-1" style={{ color: W.dark }}>Diyetisyenim</h4>
              <p className="text-[12px]" style={{ color: W.textLight }}>Dr. Ayse Yilmaz</p>
              <p className="text-[11px] mt-1" style={{ color: W.warmGrayLight }}>Son gorusme: 10 Haz 2025</p>
            </div>

            {/* Kit Info */}
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-3" style={{ background: W.amberLight }}>
                <Package className="h-5 w-5" style={{ color: W.amber }} />
              </div>
              <h4 className="text-[14px] font-semibold mb-1" style={{ color: W.dark }}>Kit Bilgilerim</h4>
              <code className="text-[12px] font-mono" style={{ color: W.olive }}>OT-2025-00142</code>
              <p className="text-[11px] mt-1" style={{ color: W.warmGrayLight }}>Omega-3 Index Testi</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ INFO CARD ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
        <div className="rounded-2xl p-5" style={{ background: W.greenLight, border: '1px solid #C8E6C8' }}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#B8E0B8' }}>
              <Heart className="h-6 w-6" style={{ color: '#3D8B3D' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: '#2D5A2D' }}>Omega-3 Index Nedir?</p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: '#4A7A4A' }}>
                Kaninizdaki omega-3 yag asitleri (EPA ve DHA) seviyesini olcen bir testtir.
                Ideal deger %8 ve uzeridir. Sonuclar diyetisyeniniz tarafindan degerlendirilecek
                ve size ozel beslenme onerileri hazirlanacaktir.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: '#3D8B3D' }}>
                  <Info className="h-3 w-3" /> Detayli bilgi
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

