import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui'
import { PdfViewer } from './pdf-viewer'

export interface ReportViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rapor başlığı (örn. danışan adı + barkod) */
  title: string
  /** PDF URL; yoksa demo PDF gösterilir (backend’den gelecek) */
  pdfUrl?: string | null
}

export function ReportViewModal({ open, onOpenChange, title, pdfUrl }: ReportViewModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>Rapor: {title}</ModalTitle>
        </ModalHeader>
        <ModalBody className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <PdfViewer
            file={pdfUrl}
            title={undefined}
            maxHeight="65vh"
            className="flex-1"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
