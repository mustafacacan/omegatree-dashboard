import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Textarea, Badge } from '@/components/ui'
import { Upload, Send, FileText, Table as TableIcon, Save, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'

const labData = [
  { marker: 'EPA (C20:5n-3)', value: '2.4', unit: '%', reference: '1.5 - 3.0', status: 'normal' },
  { marker: 'DHA (C22:6n-3)', value: '4.1', unit: '%', reference: '3.0 - 5.0', status: 'normal' },
  { marker: 'Omega-3 Index', value: '6.5', unit: '%', reference: '> 8.0', status: 'low' },
  { marker: 'AA/EPA Ratio', value: '8.2', unit: '-', reference: '< 5.0', status: 'high' },
  { marker: 'Omega-6/3 Ratio', value: '12.1', unit: '-', reference: '< 4.0', status: 'high' },
]

export function ReportEditorPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { kits, specialistSubmitReport } = useWorkflowStore()
  const barcode = params.get('barcode') || ''
  const kit = barcode ? kits.find((k) => k.barcode === barcode) : null
  const canSubmit = kit?.reportStatus === 'SPECIALIST_POOL'
  const isAdminApproval = kit?.reportStatus === 'ADMIN_APPROVAL'
  const actor = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Uzman' : 'Uzman'

  if (!barcode || !kit) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-10 w-10 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Barkod bulunamadi</p>
              <p className="text-sm text-amber-800 mt-1">
                {!barcode
                  ? 'URLde barcode parametresi yok. Atanan islerden &quot;Basla&quot; ile girin.'
                  : `"${barcode}" sistemde bulunamadi veya rapor havuzunda degil.`}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/specialist/assignments')}>
                Atanan Islere Don
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        actions={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => toast.success('Taslak kaydedildi')}>
              <Save className="h-4 w-4" />
              Taslak Kaydet
            </Button>
            {canSubmit && (
              <Button
                variant="gradient"
                onClick={() => {
                  specialistSubmitReport(barcode, actor)
                  toast.success('Rapor admin onayina gonderildi')
                  navigate('/specialist/assignments')
                }}
              >
                <Send className="h-4 w-4" />
                Onaya Gonder
              </Button>
            )}
            {isAdminApproval && (
              <Badge variant="info">Admin onayinda — rapor gonderildi</Badge>
            )}
          </div>
        }
      />
      <div className="text-xs text-surface-500 -mt-4">
        Calisilan barkod: <code className="font-mono font-semibold">{barcode}</code>
        {kit.assignedClientName && (
          <span className="ml-2">· Danisan: {kit.assignedClientName}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-primary-500" />
              Laboratuvar Verileri
            </CardTitle>
            <CardDescription>Kor analiz - sadece barkod verileri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {labData.map((item) => (
                <div
                  key={item.marker}
                  className="flex items-center justify-between p-3 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-800">{item.marker}</p>
                    <p className="text-xs text-surface-400">Ref: {item.reference}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-surface-800">
                      {item.value} {item.unit}
                    </span>
                    <Badge
                      variant={
                        item.status === 'normal' ? 'success' :
                        item.status === 'low' ? 'warning' : 'danger'
                      }
                    >
                      {item.status === 'normal' ? 'Normal' :
                       item.status === 'low' ? 'Dusuk' : 'Yuksek'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Klinik Yorum
            </CardTitle>
            <CardDescription>Beslenme perspektifinden analiz yorumu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Genel Degerlendirme"
              placeholder="Omega-3 indeksi ve yag asidi profili hakkinda genel degerlendirmenizi yazin..."
              className="min-h-[120px]"
            />
            <Textarea
              label="Beslenme Onerileri"
              placeholder="Danisan icin beslenme onerileriniz..."
              className="min-h-[120px]"
            />
            <Textarea
              label="Takviye Onerileri"
              placeholder="Supplement/takviye onerileri varsa belirtin..."
              className="min-h-[100px]"
            />

            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">
                PDF Rapor Yukle
              </label>
              <div className="border-2 border-dashed border-surface-300 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer" onClick={() => toast.success('PDF dosya secici aciliyor...')}>
                <Upload className="h-6 w-6 text-surface-400 mx-auto mb-2" />
                <p className="text-sm text-surface-500">PDF dosyasini yukleyin</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
