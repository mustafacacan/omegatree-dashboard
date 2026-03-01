import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { FileText, Upload, Eye, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const demoTemplates = [
  { id: '1', name: 'Standart Omega-3 Rapor Sablonu', version: 'v2.1', updatedAt: '2025-06-10', active: true },
  { id: '2', name: 'Premium Analiz Rapor Sablonu', version: 'v1.3', updatedAt: '2025-05-28', active: true },
  { id: '3', name: 'Ozet Rapor Sablonu', version: 'v1.0', updatedAt: '2025-04-15', active: false },
]

export function TemplatesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <div className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3 border border-surface-200 bg-white">
        <div>
          <h3 className="text-[15px] font-semibold text-surface-900">Sablon Listesi</h3>
          <p className="text-[13px] text-surface-500 mt-0.5">Aktif ve pasif rapor sablonlari</p>
        </div>
        <Button variant="gradient" size="sm" onClick={() => toast('Sablon yukleme ozelligi yakinda eklenecek', { icon: '📄' })}>
          <Upload className="h-4 w-4" />
          Sablon Yukle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {demoTemplates.map((tmpl) => (
          <Card key={tmpl.id} className="group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <Badge variant={tmpl.active ? 'success' : 'default'} dot>
                  {tmpl.active ? 'Aktif' : 'Pasif'}
                </Badge>
              </div>
              <h3 className="font-semibold text-surface-800 mb-1">{tmpl.name}</h3>
              <div className="flex items-center gap-2 text-xs text-surface-400 mb-4">
                <span>{tmpl.version}</span>
                <span>·</span>
                <span>{formatDate(tmpl.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast('Onizleme ozelligi yakinda eklenecek', { icon: '👁' })}>
                  <Eye className="h-3.5 w-3.5" /> Onizle
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast('Duzenleme ozelligi yakinda eklenecek', { icon: '✏️' })}>
                  <Pencil className="h-3.5 w-3.5" /> Duzenle
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
