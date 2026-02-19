import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button } from '@/components/ui'
import { FileText, Download, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const demoReports = [
  { id: 'RPT-2024089', date: '2024-10-01', title: 'Omega-3 Index Raporu' },
]

export function DanisanRaporlarPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {demoReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-surface-600">Henuz rapor yok</p>
            <p className="text-xs text-surface-400 mt-1">Analiz tamamlandiginda raporunuz burada gorunecek</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {demoReports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-800">{r.title}</p>
                    <p className="text-sm text-surface-500">{r.date} — {r.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toast.success('Rapor goruntuleniyor...')}><Eye className="h-4 w-4" /> Goruntule</Button>
                  <Button variant="primary" size="sm" onClick={() => toast.success('Rapor indiriliyor...')}><Download className="h-4 w-4" /> Indir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

