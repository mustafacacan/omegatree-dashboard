import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
} from '@/components/ui'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Onayla',
  cancelLabel = 'Iptal',
  variant = 'default',
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <div className="flex items-center gap-3">
            {variant !== 'default' && (
              <div
                className={
                  variant === 'danger'
                    ? 'flex items-center justify-center h-10 w-10 rounded-full bg-red-50 text-danger shrink-0 dark:bg-danger/20'
                    : 'flex items-center justify-center h-10 w-10 rounded-full bg-amber-50 text-warning shrink-0 dark:bg-warning/20'
                }
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div>
              <ModalTitle>{title}</ModalTitle>
              <ModalDescription>{description}</ModalDescription>
            </div>
          </div>
        </ModalHeader>
        <ModalBody />
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
