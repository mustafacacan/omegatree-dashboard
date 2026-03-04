import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { Timeline } from '@/components/shared/timeline'
import { StatusBadge } from '@/components/shared/status-badge'
import { KitRequestModal } from '../components/kit-request-modal'
import { ReportShareModal } from '../components/report-share-modal'
import {
  Card, CardContent, CardHeader, CardTitle, Button, Badge, Avatar,
  Tabs, TabsList, TabsTrigger, TabsContent, Progress, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/utils'
import { KitStatus } from '@/utils/constants'
import { ROUTES, danisanDuzenlePath } from '@/utils/routes'
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, FlaskConical, FileText,
  Edit3, Droplets, Ruler, Weight, Heart, Pill, AlertTriangle, StickyNote,
  CheckCircle2, Package, Activity, User, Eye, Download,
  Cake, BadgeCheck, Search, Share2, Printer,
  Truck, Building2, CheckCircle, Boxes, Send, X,
} from 'lucide-react'
import { useClientsStore } from '@/stores/clients.store'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'

/* ──────────── Defaults for extended profile (anamnez vb.) ──────────── */
const defaultProfile = {
  address: '—',
  birthDate: '—',
  bloodType: '—',
  height: '—',
  weight: '—',
  allergies: '—',
  medications: '—',
  chronicDiseases: '—',
  notes: '—',
  lastVisit: '—',
}

const demoKits: Array<{
  id: string; barcode: string; status: KitStatus; assignedDate: string
  deliveredDate: string; sampleSentDate: string; completedDate?: string
  type: string; deliveryType: 'office' | 'home'; trackingNo?: string
}> = [
  {
    id: 'KIT-2025001', barcode: 'OT-250601-001', status: KitStatus.IN_ANALYSIS,
    assignedDate: '2025-05-20', deliveredDate: '2025-05-22', sampleSentDate: '2025-05-25',
    type: 'Omega-3 Index', deliveryType: 'office', trackingNo: 'ARAS-78945612',
  },
  {
    id: 'KIT-2024089', barcode: 'OT-240915-089', status: KitStatus.COMPLETED,
    assignedDate: '2024-09-10', deliveredDate: '2024-09-12', sampleSentDate: '2024-09-14',
    completedDate: '2024-10-01', type: 'Omega-3 Index', deliveryType: 'home',
  },
]

const demoReports = [
  {
    id: 'RPT-2024089', kitBarcode: 'OT-240915-089', date: '2024-10-01',
    specialist: 'Dr. Elif Aydin', status: 'approved' as const,
    summary: 'Omega-3 seviyesi normal araliklarin altinda. EPA/DHA oranlari duzeltilmeli.',
    sharedAt: '2024-10-02',
  },
]

const demoActivities = [
  { type: 'kit', message: 'Kit OT-250601-001 analiz surecine alindi', date: '2025-05-28T14:30:00', icon: FlaskConical },
  { type: 'kit', message: 'Numune laboratuvara gonderildi (Kargo: ARAS-78945612)', date: '2025-05-25T09:15:00', icon: Truck },
  { type: 'kit', message: 'Kit teslim edildi ve numune alindi', date: '2025-05-22T11:00:00', icon: Package },
  { type: 'kit', message: 'Kit talep edildi - Ofis teslimi', date: '2025-05-20T16:45:00', icon: Building2 },
  { type: 'report', message: 'Rapor RPT-2024089 guvenli link ile danisana paylsildi', date: '2024-10-02T10:30:00', icon: Share2 },
  { type: 'report', message: 'Rapor admin tarafindan onaylandi', date: '2024-10-01T15:20:00', icon: BadgeCheck },
  { type: 'visit', message: 'Anamnez bilgileri guncellendi', date: '2024-09-10T09:00:00', icon: Edit3 },
  { type: 'system', message: 'Danisan kaydi olusturuldu - ID: 20250601001', date: '2025-03-10T14:00:00', icon: User },
]

const kitTimeline = [
  { label: 'Kit Talep Edildi', description: 'Ofis teslimi secildi', date: '20.05.2025', status: 'completed' as const },
  { label: 'Kit Gonderildi', description: 'Kargo: ARAS-78945612', date: '21.05.2025', status: 'completed' as const },
  { label: 'Numune Alindi', description: 'Kit teslim edildi, numune toplandi', date: '22.05.2025', status: 'completed' as const },
  { label: 'Analiz Devam Ediyor', description: 'Omega-3 index analizi laboratuvarda', date: '28.05.2025', status: 'current' as const },
  { label: 'Sonuc Hazir', description: 'Uzman diyetisyen degerlendirmesi', status: 'upcoming' as const },
  { label: 'Rapor Tamamlandi', description: 'PDF rapor hazir, danisanla paylasilacak', status: 'upcoming' as const },
]

/* ──────────── Page Component ──────────── */

export function ClientDetailPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { getClientById } = useClientsStore()
  const currentUser = useCurrentUser()
  const { kits, assignKitToClient } = useWorkflowStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [kitRequestOpen, setKitRequestOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareReportId, setShareReportId] = useState('')
  const [reportFilter, setReportFilter] = useState('')
  const [assignKitOpen, setAssignKitOpen] = useState(false)
  const [selectedStockKit, setSelectedStockKit] = useState<string | null>(null)
  const [viewReportOpen, setViewReportOpen] = useState(false)
  const [viewingReport, setViewingReport] = useState<typeof demoReports[0] | null>(null)
  const stockKits = kits
    .filter((k) => k.assignedDietitianId === currentUser?.id && k.status === KitStatus.DELIVERED && !k.assignedClientId)
    .map((k) => ({ barcode: k.barcode, receivedAt: formatDate(k.createdAt), status: 'available' as const }))

  const storeClient = clientId ? getClientById(clientId) : undefined

  const nameParts = storeClient?.name?.split(' ') ?? ['Danisan', '']
  const firstName = nameParts[0] ?? 'Danisan'
  const lastName = nameParts.slice(1).join(' ') || ''
  const client = storeClient
    ? {
        id: storeClient.id,
        firstName,
        lastName,
        phone: storeClient.phone,
        email: storeClient.email,
        createdAt: storeClient.createdAt,
        ...defaultProfile,
      }
    : {
        id: clientId ?? '—',
        firstName: 'Danisan',
        lastName: '',
        phone: '—',
        email: '—',
        createdAt: '—',
        ...defaultProfile,
      }

  const age = client.birthDate && client.birthDate !== '—' ? new Date().getFullYear() - new Date(client.birthDate).getFullYear() : 0
  const bmi = client.weight && client.height && client.weight !== '—' && client.height !== '—'
    ? (Number(client.weight) / Math.pow(Number(client.height) / 100, 2)).toFixed(1)
    : '—'
  const activeKit = demoKits.find(k => k.status !== KitStatus.COMPLETED)

  if (clientId && !storeClient) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader />
        <Card>
          <CardContent className="p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
              <User className="h-6 w-6 text-surface-400" />
            </div>
            <p className="text-surface-600 mb-5">Bu ID ile eslesen bir danisan kaydi bulunamadi.</p>
            <Button variant="primary" onClick={() => navigate(ROUTES.DIYETISYEN_DANISANLAR)}>
              Danisanlar listesine don
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5" /> Geri
            </Button>
            <Button variant="outline" size="sm" onClick={() => clientId && navigate(danisanDuzenlePath(clientId))}>
              <Edit3 className="h-3.5 w-3.5" /> Duzenle
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAssignKitOpen(true)}>
              <Boxes className="h-3.5 w-3.5" /> Stoktan Kit Ata
            </Button>
            <Button variant="primary" size="sm" onClick={() => setKitRequestOpen(true)}>
              <Package className="h-3.5 w-3.5" /> Kit Talep Et
            </Button>
          </div>
        }
      />

      {/* ── Profile Card ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Left: Avatar + Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <Avatar name={`${client.firstName} ${client.lastName}`} size="xl" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-semibold text-surface-900">{client.firstName} {client.lastName}</h1>
                  <Badge variant="success" size="sm">Aktif</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-surface-500 mb-2">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{client.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{client.email}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{client.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded font-semibold">{client.id}</code>
                  <span className="text-[11px] text-surface-400">Kayit: {formatDate(client.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Right: Quick stats */}
            <div className="flex flex-wrap gap-3 shrink-0">
              <MiniStat label="Kit" value={String(demoKits.length)} sub={activeKit ? '1 aktif' : 'hepsi tamam'} />
              <MiniStat label="Rapor" value={String(demoReports.length)} sub="1 onaylanmis" />
              <MiniStat label="BMI" value={bmi} sub={Number(bmi) < 25 ? 'Normal' : 'Kilolu'} />
              <MiniStat label="Yas" value={String(age)} sub={formatDate(client.birthDate)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="kits">Kit & Numune Takibi</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
          <TabsTrigger value="activity">Aktivite</TabsTrigger>
        </TabsList>

        {/* ═══ OVERVIEW ═══ */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              {/* Personal Info */}
              <Card>
                <CardHeader><CardTitle>Kisisel Bilgiler</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Ad Soyad" value={`${client.firstName} ${client.lastName}`} />
                    <InfoRow icon={Cake} label="Dogum Tarihi" value={`${formatDate(client.birthDate)} (${age} yas)`} />
                    <InfoRow icon={Phone} label="Telefon" value={client.phone} />
                    <InfoRow icon={Mail} label="E-posta" value={client.email} />
                    <InfoRow icon={MapPin} label="Adres" value={client.address} />
                    <InfoRow icon={Droplets} label="Kan Grubu" value={client.bloodType} />
                  </div>
                </CardContent>
              </Card>

              {/* Anamnesis */}
              <Card>
                <CardHeader><CardTitle>Anamnez Bilgileri</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
                    <InfoRow icon={Ruler} label="Boy" value={`${client.height} cm`} />
                    <InfoRow icon={Weight} label="Kilo" value={`${client.weight} kg`} />
                    <InfoRow icon={Activity} label="BMI" value={bmi} />
                  </div>

                  <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-surface-600">Vucut Kitle Indeksi</span>
                      <span className={`text-sm font-bold ${Number(bmi) < 18.5 ? 'text-orange-600' : Number(bmi) < 25 ? 'text-primary-600' : Number(bmi) < 30 ? 'text-amber-600' : 'text-red-600'}`}>{bmi}</span>
                    </div>
                    <Progress value={Math.min((Number(bmi) / 40) * 100, 100)} />
                    <div className="flex justify-between mt-1.5 text-[10px] text-surface-400">
                      <span>Zayif (&lt;18.5)</span><span>Normal</span><span>Kilolu</span><span>Obez (&gt;30)</span>
                    </div>
                  </div>

                  <AnamnesisRow icon={AlertTriangle} label="Alerjiler" value={client.allergies} color="amber" />
                  <AnamnesisRow icon={Pill} label="Kullanilan Ilaclar" value={client.medications} color="blue" />
                  <AnamnesisRow icon={Heart} label="Kronik Hastaliklar" value={client.chronicDiseases} color="rose" />
                  <AnamnesisRow icon={StickyNote} label="Notlar" value={client.notes} color="surface" />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Active kit timeline */}
              {activeKit ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[14px]">Aktif Kit Takibi</CardTitle>
                      <StatusBadge status={activeKit.status} size="sm" pulse />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-500">Barkod</span>
                        <code className="font-mono text-surface-800 font-medium">{activeKit.barcode}</code>
                      </div>
                      {activeKit.trackingNo && (
                        <div className="flex justify-between text-sm">
                          <span className="text-surface-500">Kargo No</span>
                          <span className="text-surface-800 font-medium">{activeKit.trackingNo}</span>
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between mb-1 text-xs">
                        <span className="text-surface-500">Ilerleme</span>
                        <span className="font-medium text-surface-700">4/6 adim</span>
                      </div>
                      <Progress value={65} />
                    </div>
                    <Timeline steps={kitTimeline} />
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FlaskConical className="h-8 w-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-surface-600 mb-1">Aktif kit yok</p>
                    <p className="text-xs text-surface-400 mb-3">Danisan icin kit talep edin</p>
                    <Button variant="primary" size="sm" onClick={() => setKitRequestOpen(true)}>
                      <Package className="h-3.5 w-3.5" /> Kit Talep Et
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Quick notes */}
              <Card>
                <CardHeader><CardTitle className="text-[14px]">Uyarilar</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {client.allergies && (
                    <NoteItem color="amber" title="Alerji kaydi mevcut" text={client.allergies} />
                  )}
                  {client.chronicDiseases && (
                    <NoteItem color="rose" title="Kronik hastalik" text={client.chronicDiseases} />
                  )}
                  {activeKit && (
                    <NoteItem color="blue" title="Aktif analiz sureci" text={`${activeKit.type} - ${activeKit.barcode}`} />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══ KITS ═══ */}
        <TabsContent value="kits">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-surface-500">{demoKits.length} kit kaydi</p>
              <Button variant="primary" size="sm" onClick={() => setKitRequestOpen(true)}>
                <Package className="h-3.5 w-3.5" /> Yeni Kit Talep Et
              </Button>
            </div>

            {demoKits.map((kit) => {
              const steps = ['Talep', 'Gonderim', 'Numune', 'Analiz', 'Rapor', 'Tamam']
              const completedSteps = kit.status === KitStatus.COMPLETED ? 6
                : kit.status === KitStatus.IN_ANALYSIS ? 4
                : kit.status === KitStatus.SAMPLE_SENT ? 3
                : kit.status === KitStatus.DELIVERED ? 2 : 1

              return (
                <Card key={kit.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                          kit.status === KitStatus.COMPLETED ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[14px] font-semibold text-surface-900">{kit.type}</h3>
                            <StatusBadge status={kit.status} size="sm" pulse={kit.status === KitStatus.IN_ANALYSIS} />
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
                            <code className="font-mono bg-surface-50 px-1.5 py-0.5 rounded">{kit.barcode}</code>
                            <span><Calendar className="h-3 w-3 inline mr-0.5" />{formatDate(kit.assignedDate)}</span>
                            {kit.trackingNo && <span><Truck className="h-3 w-3 inline mr-0.5" />{kit.trackingNo}</span>}
                            <Badge variant={kit.deliveryType === 'office' ? 'default' : 'info'} size="sm">
                              {kit.deliveryType === 'office' ? 'Ofis' : 'Ev'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {kit.status === KitStatus.COMPLETED && (
                          <Button variant="primary" size="xs">
                            <FileText className="h-3 w-3" /> Rapor Gor
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Step progress */}
                    <div className="flex items-center gap-1">
                      {steps.map((step, idx) => (
                        <div key={step} className="flex-1">
                          <div className={`h-1.5 rounded-full ${
                            idx < completedSteps ? 'bg-primary-500'
                            : idx === completedSteps ? 'bg-primary-200'
                            : 'bg-surface-100'
                          }`} />
                          <p className={`text-[9px] mt-1 text-center font-medium ${
                            idx < completedSteps ? 'text-primary-600'
                            : idx === completedSteps ? 'text-primary-400'
                            : 'text-surface-300'
                          }`}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ═══ REPORTS ═══ */}
        <TabsContent value="reports">
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Rapor ID veya tarih ile ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={reportFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportFilter(e.target.value)}
                className="w-64"
              />
              <p className="text-sm text-surface-400 ml-auto">{demoReports.length} rapor</p>
            </div>

            {demoReports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-10 w-10 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-surface-600 mb-1">Henuz rapor yok</p>
                  <p className="text-xs text-surface-400">Analiz tamamlandiginda raporlar burada gorunecek</p>
                </CardContent>
              </Card>
            ) : (
              demoReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-5">
                    {/* Report header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[14px] font-semibold text-surface-900">Omega-3 Index Raporu</h3>
                            <Badge variant="success" size="sm">Onaylandi</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 mb-2">
                            <code className="font-mono bg-surface-50 px-1.5 py-0.5 rounded">{report.id}</code>
                            <span><Calendar className="h-3 w-3 inline mr-0.5" />{formatDate(report.date)}</span>
                            <span><User className="h-3 w-3 inline mr-0.5" />{report.specialist}</span>
                          </div>
                          <p className="text-sm text-surface-600 leading-relaxed max-w-xl">{report.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Report actions */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <Button 
                        variant="outline" 
                        size="xs"
                        onClick={() => { setViewingReport(report); setViewReportOpen(true) }}
                      >
                        <Eye className="h-3 w-3" /> PDF Goruntule
                      </Button>
                      <Button 
                        variant="outline" 
                        size="xs"
                        onClick={() => toast('Rapor indirme ozelligi yakinda eklenecek')}
                      >
                        <Download className="h-3 w-3" /> Indir
                      </Button>
                      <Button 
                        variant="outline" 
                        size="xs"
                        onClick={() => toast('Yazdirma ozelligi yakinda eklenecek')}
                      >
                        <Printer className="h-3 w-3" /> Yazdir
                      </Button>
                      <Button
                        variant="primary" size="xs"
                        onClick={() => { setShareReportId(report.id); setShareOpen(true) }}
                      >
                        <Share2 className="h-3 w-3" /> Danisana Paylas
                      </Button>
                      {report.sharedAt && (
                        <span className="text-[11px] text-surface-400 ml-2">
                          <CheckCircle2 className="h-3 w-3 inline mr-0.5 text-green-500" />
                          {formatDate(report.sharedAt)} tarihinde paylasildi
                        </span>
                      )}
                    </div>

                    {/* Result metrics */}
                    <div className="border-t border-surface-100 pt-4">
                      <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider mb-3">Analiz Sonuclari</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Metric label="Omega-3 Index" value="4.2%" status="low" />
                        <Metric label="EPA" value="0.8%" status="low" />
                        <Metric label="DHA" value="2.1%" status="warning" />
                        <Metric label="EPA/DHA" value="0.38" status="normal" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ═══ ACTIVITY ═══ */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Aktivite Gecmisi</CardTitle>
                <span className="text-xs text-surface-400">{demoActivities.length} kayit</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {demoActivities.map((a, idx) => {
                  const colors: Record<string, string> = {
                    kit: 'bg-primary-50 text-primary-600',
                    report: 'bg-orange-50 text-orange-600',
                    visit: 'bg-green-50 text-green-600',
                    system: 'bg-surface-100 text-surface-500',
                  }
                  return (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${colors[a.type] || colors.system}`}>
                          <a.icon className="h-4 w-4" />
                        </div>
                        {idx < demoActivities.length - 1 && <div className="w-px h-6 bg-surface-200 mt-1" />}
                      </div>
                      <div className="pb-5 pt-1 flex-1">
                        <p className="text-[13px] text-surface-700">{a.message}</p>
                        <p className="text-[11px] text-surface-400 mt-0.5 font-mono">{formatDateTime(a.date)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <KitRequestModal
        open={kitRequestOpen}
        onOpenChange={setKitRequestOpen}
        clientName={`${client.firstName} ${client.lastName}`}
        clientId={client.id}
      />
      <ReportShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        reportId={shareReportId}
        clientName={`${client.firstName} ${client.lastName}`}
      />

      {/* ═══ STOKTAN KIT ATA MODAL ═══ */}
      <Modal open={assignKitOpen} onOpenChange={setAssignKitOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Stoktan Kit Ata</ModalTitle>
            <ModalDescription>
              Stokunuzda bulunan mevcut bir kiti {client.firstName} {client.lastName} adli danisana atayabilirsiniz.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <p className="text-sm font-medium text-surface-700">Stokta Mevcut Kitler</p>
              {stockKits.filter(k => k.status === 'available').length === 0 ? (
                <div className="text-center py-8">
                  <Boxes className="h-12 w-12 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-surface-600 mb-1">Stokta kit yok</p>
                  <p className="text-xs text-surface-400">Once adminle iletisime gecip kit atamasini yapabilirsiniz.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  <AnimatePresence>
                    {stockKits.filter(k => k.status === 'available').map((kit) => (
                      <motion.button
                        key={kit.barcode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={() => setSelectedStockKit(kit.barcode)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selectedStockKit === kit.barcode
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-surface-200 hover:border-primary-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono text-sm font-bold text-surface-900">{kit.barcode}</code>
                              {selectedStockKit === kit.barcode && (
                                <CheckCircle className="h-4 w-4 text-primary-600" />
                              )}
                            </div>
                            <p className="text-xs text-surface-500">Stok Girisi: {kit.receivedAt}</p>
                          </div>
                          <Badge variant="success" size="sm">Mevcut</Badge>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {selectedStockKit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200"
              >
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">Atama Onay</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <strong>{selectedStockKit}</strong> barkodlu kit, <strong>{client.firstName} {client.lastName}</strong> adli danisana atanacaktir.
                      Kit danisana teslim edildiginde danisan uzerinden izlenebilir hale gelecektir.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setAssignKitOpen(false); setSelectedStockKit(null) }}>
              Iptal
            </Button>
            <Button
              variant="primary"
              disabled={!selectedStockKit}
              onClick={() => {
                if (selectedStockKit) {
                  const result = assignKitToClient(
                    selectedStockKit,
                    currentUser?.id || '',
                    client.id,
                    `${client.firstName} ${client.lastName}`.trim(),
                    `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Diyetisyen'
                  )
                  if (result.ok) {
                    toast.success(result.message || `Kit ${selectedStockKit} danisana atandi!`)
                    setAssignKitOpen(false)
                    setSelectedStockKit(null)
                  } else {
                    toast.error(result.message || 'Kit atanamadi')
                  }
                }
              }}
            >
              <Send className="h-4 w-4" /> Kiti Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ═══ RAPOR GORUNTULEME MODAL ═══ */}
      <Modal open={viewReportOpen} onOpenChange={setViewReportOpen}>
        <ModalContent className="max-w-4xl">
          <ModalHeader>
            <ModalTitle>Rapor Detayi</ModalTitle>
            <ModalDescription>
              {viewingReport && `${viewingReport.id} - ${formatDate(viewingReport.date)}`}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {viewingReport && (
              <div className="space-y-6">
                {/* Report Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1">Rapor ID</p>
                    <code className="text-sm font-mono font-semibold text-surface-900">{viewingReport.id}</code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1">Kit Barkod</p>
                    <code className="text-sm font-mono font-semibold text-surface-900">{viewingReport.kitBarcode}</code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1">Uzman</p>
                    <p className="text-sm font-semibold text-surface-900">{viewingReport.specialist}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1">Durum</p>
                    <Badge variant="success" size="sm">Onaylandi</Badge>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                  <p className="text-xs font-medium text-violet-700 uppercase tracking-wider mb-2">Rapor Ozeti</p>
                  <p className="text-sm text-violet-900 leading-relaxed">{viewingReport.summary}</p>
                </div>

                {/* Result Metrics */}
                <div>
                  <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider mb-3">Analiz Sonuclari</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric label="Omega-3 Index" value="4.2%" status="low" />
                    <Metric label="EPA" value="0.8%" status="low" />
                    <Metric label="DHA" value="2.1%" status="warning" />
                    <Metric label="EPA/DHA" value="0.38" status="normal" />
                  </div>
                </div>

                {/* PDF Preview Placeholder */}
                <div className="p-8 rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 text-center">
                  <FileText className="h-16 w-16 text-surface-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-surface-600 mb-1">PDF Onizleme</p>
                  <p className="text-xs text-surface-400 mb-4">Rapor PDF'i bu alanda goruntulenir</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => toast.success('PDF tam ekran aciliyor...')}
                  >
                    <Eye className="h-4 w-4" /> Tam Ekran Ac
                  </Button>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setViewReportOpen(false)}>
              <X className="h-4 w-4" /> Kapat
            </Button>
            <Button variant="outline" onClick={() => toast.success('Rapor indiriliyor...')}>
              <Download className="h-4 w-4" /> Indir
            </Button>
            <Button variant="primary" onClick={() => toast.success('Yazdirma dialogu aciliyor...')}>
              <Printer className="h-4 w-4" /> Yazdir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

/* ──────────── Sub-components ──────────── */

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-4 py-2.5 rounded-lg bg-surface-50 min-w-[80px]">
      <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-bold text-surface-900">{value}</p>
      <p className="text-[10px] text-surface-400">{sub}</p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-surface-50 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-surface-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-surface-800 truncate">{value}</p>
      </div>
    </div>
  )
}

function AnamnesisRow({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: 'amber' | 'blue' | 'rose' | 'surface'
}) {
  const styles = {
    amber: 'bg-amber-50 border-amber-100',
    blue: 'bg-primary-50 border-primary-100',
    rose: 'bg-rose-50 border-rose-100',
    surface: 'bg-surface-50 border-surface-100',
  }
  return (
    <div className={`p-3 rounded-lg border ${styles[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-surface-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">{label}</span>
      </div>
      <p className="text-[13px] text-surface-700 leading-relaxed">{value}</p>
    </div>
  )
}

function NoteItem({ color, title, text }: { color: 'amber' | 'blue' | 'rose' | 'green'; title: string; text: string }) {
  const map = {
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    blue: 'bg-primary-50 border-primary-100 text-primary-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-800',
    green: 'bg-green-50 border-green-100 text-green-800',
  }
  const sub = {
    amber: 'text-amber-600', blue: 'text-primary-600', rose: 'text-rose-600', green: 'text-green-600',
  }
  return (
    <div className={`p-3 rounded-lg border ${map[color]}`}>
      <p className="text-xs font-medium">{title}</p>
      <p className={`text-[11px] mt-0.5 ${sub[color]}`}>{text}</p>
    </div>
  )
}

function Metric({ label, value, status }: { label: string; value: string; status: 'low' | 'warning' | 'normal' | 'good' }) {
  const c = {
    low: { bg: 'bg-red-50', text: 'text-red-700', badge: 'Dusuk' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'Dikkat' },
    normal: { bg: 'bg-green-50', text: 'text-green-700', badge: 'Normal' },
    good: { bg: 'bg-primary-50', text: 'text-primary-700', badge: 'Iyi' },
  }[status]
  return (
    <div className={`p-3 rounded-lg ${c.bg}`}>
      <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <span className={`text-base font-bold ${c.text}`}>{value}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{c.badge}</span>
      </div>
    </div>
  )
}
