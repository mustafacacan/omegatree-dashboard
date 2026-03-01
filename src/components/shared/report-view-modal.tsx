import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui'
import { PdfViewer } from './pdf-viewer'
import { useWorkflowStore } from '@/stores/workflow.store'

export interface ReportViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rapor basligi (orn. danisan adi + barkod) */
  title: string
  /** Barkod; verilirse store'dan rapor icerigi ve pdfUrl alinir */
  barcode?: string
  /** Barkod yoksa dogrudan PDF URL (geri uyumluluk) */
  pdfUrl?: string | null
}

export function ReportViewModal({ open, onOpenChange, title, barcode, pdfUrl: pdfUrlProp }: ReportViewModalProps) {
  const kits = useWorkflowStore((s) => s.kits)
  const kit = barcode ? kits.find((k) => k.barcode === barcode) : null
  const content = kit?.reportContent
  const pdfUrl = content?.pdfUrl ?? pdfUrlProp
  const hasTextContent = content && (content.generalEvaluation || content.nutritionAdvice || content.supplementAdvice)
  const hasPdf = !!pdfUrl
  const isEmpty = !hasTextContent && !hasPdf

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>Rapor: {title}</ModalTitle>
        </ModalHeader>
        <ModalBody className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          {hasTextContent && (
            <div className="space-y-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
              {content!.generalEvaluation && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Genel Degerlendirme</h4>
                  <p className="text-sm text-surface-800 whitespace-pre-wrap">{content!.generalEvaluation}</p>
                </div>
              )}
              {content!.nutritionAdvice && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Beslenme Onerileri</h4>
                  <p className="text-sm text-surface-800 whitespace-pre-wrap">{content!.nutritionAdvice}</p>
                </div>
              )}
              {content!.supplementAdvice && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Takviye Onerileri</h4>
                  <p className="text-sm text-surface-800 whitespace-pre-wrap">{content!.supplementAdvice}</p>
                </div>
              )}
            </div>
          )}
          {isEmpty ? (
            <div className="flex flex-1 min-h-[280px] flex-col items-center justify-center rounded-xl border border-surface-200 bg-surface-50 p-8 text-center">
              <p className="text-sm font-medium text-surface-600">Rapor icerigi henuz yok</p>
              <p className="text-xs text-surface-500 mt-1">Uzman raporu hazirladiktan ve admin onayladiktan sonra burada gorunecek.</p>
            </div>
          ) : (
            <>
              {hasPdf && (
                <div className="flex-1 min-h-[300px]">
                  <PdfViewer file={pdfUrl} title={undefined} maxHeight="65vh" className="flex-1" />
                </div>
              )}
              {!hasPdf && hasTextContent && (
                <p className="text-xs text-surface-500">PDF eklenmemis; sadece metin yorumu gosteriliyor.</p>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
