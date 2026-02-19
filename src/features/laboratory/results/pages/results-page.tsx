import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge } from '@/components/ui'
import { Upload, FileSpreadsheet, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const completedResults = [
  { barcode: 'OT-2025-00130', uploadedAt: '12 Haz 16:00', fileName: 'results_00130.xlsx' },
  { barcode: 'OT-2025-00128', uploadedAt: '11 Haz 14:30', fileName: 'results_00128.xlsx' },
  { barcode: 'OT-2025-00125', uploadedAt: '10 Haz 11:00', fileName: 'results_00125.xlsx' },
]

export function ResultsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Upload Area */}
      <Card>
        <CardContent className="p-8">
          <div className="border-2 border-dashed border-surface-300 rounded-2xl p-12 text-center hover:border-primary-300 hover:bg-primary-50/20 transition-all cursor-pointer">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-50 mb-4">
              <FileSpreadsheet className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-800 mb-2">
              Excel Dosyasi Yukleyin
            </h3>
            <p className="text-sm text-surface-500 mb-4 max-w-md mx-auto">
              Analiz sonuclarini iceren .xlsx dosyasini surukleyin veya dosya secerek yukleyin.
              Her satir bir barkoda karsilik gelmeli.
            </p>
            <Button variant="gradient" onClick={() => toast.success('Dosya secici aciliyor...')}>
              <Upload className="h-4 w-4" />
              Dosya Sec
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Son Yuklenen Sonuclar</CardTitle>
          <CardDescription>Basariyla yuklenen analiz sonuclari</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completedResults.map((result) => (
              <div
                key={result.barcode}
                className="flex items-center justify-between p-4 rounded-xl border border-surface-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <code className="text-sm font-mono font-semibold">{result.barcode}</code>
                    <p className="text-xs text-surface-400">{result.fileName} · {result.uploadedAt}</p>
                  </div>
                </div>
                <Badge variant="success" dot>Yuklendi</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
