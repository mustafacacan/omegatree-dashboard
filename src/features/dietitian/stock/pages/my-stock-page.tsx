import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { Badge, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import {
  Package, Boxes, ShoppingCart, AlertTriangle, ScanLine, RotateCcw,
  TrendingUp, TrendingDown, Search,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'
import { formatDate } from '@/lib/utils'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function MyStockPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { kits } = useWorkflowStore()
  const [searchQuery, setSearchQuery] = useState('')

  const myKits = useMemo(() => {
    return kits
      .filter((k) => k.assignedDietitianId === user?.id)
      .map((k) => ({
        barcode: k.barcode,
        receivedAt: k.createdAt,
        status: k.assignedClientName ? ('assigned' as const) : ('available' as const),
        client: k.assignedClientName,
        kitStatus: k.status,
      }))
  }, [kits, user?.id])

  const availableKits = useMemo(() => myKits.filter((k) => k.status === 'available'), [myKits])
  const assignedKits = useMemo(() => myKits.filter((k) => k.status === 'assigned'), [myKits])

  const filtered = useMemo(() => {
    return myKits.filter(
      (k) => !searchQuery || k.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [myKits, searchQuery])

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Kullanilabilir', value: availableKits.length, icon: Package, iconColor: W.olive, iconBg: W.oliveLight, change: 2 },
          { title: 'Danisana Atanmis', value: assignedKits.length, icon: Boxes, iconColor: W.orange, iconBg: W.orangeLight, change: 1 },
          { title: 'Minimum Stok', value: 3, icon: AlertTriangle, iconColor: W.amber, iconBg: W.amberLight, change: 0 },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
                      {s.change !== 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: s.change > 0 ? W.greenLight : '#FDE8E8', color: s.change > 0 ? '#3D8B3D' : '#C53030' }}>
                          {s.change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
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

      {/* ═══ STOCK WARNING ═══ */}
      {availableKits.length <= 3 && (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: W.amberLight, border: '1px solid #F0DFA0' }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F5E6A0' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#B8960A' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold" style={{ color: '#78600A' }}>Stok Uyarisi</p>
              <p className="text-[11px]" style={{ color: '#9C7D0A' }}>Kullanilabilir kit sayiniz azaliyor. Yeni siparis vermenizi oneririz.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/dietitian/orders')} style={{ borderColor: '#D4B830', color: '#78600A' }}>
              Siparis Ver
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ STOCK LIST ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>

          {/* Header */}
          <div className="p-5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Stoktaki Kitler</h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                <input
                  type="text"
                  placeholder="Barkod ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-44 outline-none transition-colors"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/dietitian/kits')}>
                <ScanLine className="h-3.5 w-3.5" /> Kit Teslim Al
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/dietitian/kits')}>
                <RotateCcw className="h-3.5 w-3.5" /> Iade Talebi
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/dietitian/orders')}>
                <ShoppingCart className="h-3.5 w-3.5" /> Yeni Siparis
              </Button>
            </div>
          </div>

          {/* Available kits */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: W.green }} />
              <span className="text-[12px] font-semibold" style={{ color: W.dark }}>Kullanilabilir</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: W.greenLight, color: '#3D8B3D' }}>{availableKits.length}</span>
            </div>
            {availableKits.length === 0 ? (
              <div className="text-center py-8 text-surface-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 text-surface-300" />
                <p>Kullanilabilir kit bulunmuyor</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(k => k.status === 'available').map((kit) => (
                <div
                  key={kit.barcode}
                  className="flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer"
                  style={{ background: W.cream, border: `1.5px solid transparent` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.olive; e.currentTarget.style.background = W.oliveLight }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = W.cream }}
                >
                  <div>
                    <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                    <p className="text-[10px] mt-0.5" style={{ color: W.textLight }}>Teslim: {formatDate(kit.receivedAt)}</p>
                  </div>
                  <Badge variant="success" dot>Hazir</Badge>
                </div>
              ))}
              </div>
            )}

            {/* Assigned kits */}
            {assignedKits.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ background: W.orange }} />
                  <span className="text-[12px] font-semibold" style={{ color: W.dark }}>Danisana Atanmis</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: W.orangeLight, color: W.orange }}>{assignedKits.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.filter(k => k.status === 'assigned').map((kit) => (
                    <div
                      key={kit.barcode}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: W.orangeLight, border: '1.5px solid transparent' }}
                    >
                      <div>
                        <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                        <p className="text-[10px] mt-0.5" style={{ color: W.orange }}>{kit.client}</p>
                      </div>
                      <Badge variant="warning" dot>Atanmis</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="px-5 pb-5">
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: W.oliveLight }}>
              <ScanLine className="h-4 w-4 shrink-0" style={{ color: W.olive }} />
              <p className="text-[11px]" style={{ color: '#5A6B2A' }}>
                Bu stok, barkod numarasi ile teslim aldiginiz kitleri gosterir. Yeni kit almak icin
                <button type="button" onClick={() => navigate('/dietitian/kits')} className="font-semibold underline ml-1" style={{ color: '#5A6B2A' }}>Kit Teslim Al</button> sayfasini kullanin.
                Iade talebi olusturmak icin de ayni sayfadaki kit kartlarinda
                <span className="font-semibold ml-1">Iade Talebi Olustur</span> aksiyonunu kullanabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
