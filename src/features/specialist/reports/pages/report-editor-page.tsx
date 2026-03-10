import { useState, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { ROUTES } from '@/utils/routes'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Textarea, Badge } from '@/components/ui'
import { Upload, Send, FileText, Table as TableIcon, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
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

  const [generalEvaluation, setGeneralEvaluation] = useState(kit?.reportContent?.generalEvaluation ?? '')
  const [nutritionAdvice, setNutritionAdvice] = useState(kit?.reportContent?.nutritionAdvice ?? '')
  const [supplementAdvice, setSupplementAdvice] = useState(kit?.reportContent?.supplementAdvice ?? '')
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(kit?.reportContent?.pdfUrl)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  if (!barcode || !kit) {
    const isNoParam = !barcode
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Rapor Editoru" />
        <Card className="border-primary-200 bg-primary-50/50">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-surface-900">
                {isNoParam ? 'Rapor yazmak icin bir analiz secin' : 'Bu barkod rapor havuzunda degil'}
              </p>
              <p className="text-sm text-surface-600 mt-1.5">
                {isNoParam
                  ? 'Atanan Isler sayfasindan bir analize "Basla" veya "Devam Et" ile girerek rapor editorune ulasabilirsiniz.'
                  : `"${barcode}" icin atama bulunamadi veya rapor bu uzmana atanmamis.`}
              </p>
              <Button
                variant="default"
                size="sm"
                className="mt-4"
                onClick={() => navigate(ROUTES.UZMAN_ATAMALAR)}
              >
                Atanan Islere Git
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={ROUTES.UZMAN_ATAMALAR}
            className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-surface-900 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Atanan İşlere dön
          </Link>
          <PageHeader
            title="Rapor duzenle"
            description={`Barkod: ${barcode}${kit.assignedClientName ? ` · ${kit.assignedClientName}` : ''}`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success('Taslak kaydedildi')}>
                  <Save className="h-4 w-4" />
                  Taslak Kaydet
                </Button>
                {canSubmit && (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => {
                      specialistSubmitReport(barcode, actor, undefined, {
                        generalEvaluation: generalEvaluation.trim() || undefined,
                        nutritionAdvice: nutritionAdvice.trim() || undefined,
                        supplementAdvice: supplementAdvice.trim() || undefined,
                        pdfUrl: pdfUrl || undefined,
                      })
                      toast.success('Rapor admin onayina gonderildi')
                      navigate(ROUTES.UZMAN_ATAMALAR)
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Onaya Gonder
                  </Button>
                )}
                {isAdminApproval && (
                  <Badge variant="info">Admin onayinda</Badge>
                )}
              </div>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              value={generalEvaluation}
              onChange={(e) => setGeneralEvaluation(e.target.value)}
            />
            <Textarea
              label="Beslenme Onerileri"
              placeholder="Danisan icin beslenme onerileriniz..."
              className="min-h-[120px]"
              value={nutritionAdvice}
              onChange={(e) => setNutritionAdvice(e.target.value)}
            />
            <Textarea
              label="Takviye Onerileri"
              placeholder="Supplement/takviye onerileri varsa belirtin..."
              className="min-h-[100px]"
              value={supplementAdvice}
              onChange={(e) => setSupplementAdvice(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">
                PDF Rapor Yukle (istege bagli)
              </label>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    if (typeof reader.result === 'string') setPdfUrl(reader.result)
                  }
                  reader.readAsDataURL(file)
                  toast.success('PDF eklendi')
                }}
              />
              <div
                className="border-2 border-dashed border-surface-300 rounded-xl p-6 text-center hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => pdfInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-surface-400 mx-auto mb-2" />
                <p className="text-sm text-surface-500">{pdfUrl ? 'PDF yuklendi (degistirmek icin tiklayin)' : 'PDF dosyasini yukleyin'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
