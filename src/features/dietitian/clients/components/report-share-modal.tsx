import { useState } from 'react'
import {
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription,
  ModalBody, ModalFooter, Button, Input,
} from '@/components/ui'
import { Link2, Copy, Check, Clock, Shield } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

interface ReportShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportId: string
  clientName: string
}

export function ReportShareModal({ open, onOpenChange, reportId, clientName }: ReportShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [expiry, setExpiry] = useState<'24h' | '7d' | '30d'>('7d')
  const [generating, setGenerating] = useState(false)
  const [shareLink, setShareLink] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 800))
    setShareLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/paylas/${reportId}?token=sec_${Date.now().toString(36)}`)
    setGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    toast.success('Link panoya kopyalandi')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Raporu Paylas</ModalTitle>
          <ModalDescription>
            <strong>{clientName}</strong> icin guvenli paylasim linki olusturun
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Security note */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-700">Guvenli Paylasim</p>
                <p className="text-[11px] text-green-600 mt-0.5">
                  Rapor PDF sistem disindan indirilemez. Danisan sadece goruntuleme yapabilir.
                </p>
              </div>
            </div>
          </div>

          {/* Expiry selection */}
          <div>
            <label className="block text-[13px] font-medium text-surface-700 mb-2">
              <Clock className="h-3.5 w-3.5 inline mr-1" />
              Link Gecerlilik Suresi
            </label>
            <div className="flex gap-2">
              {[
                { value: '24h' as const, label: '24 Saat' },
                { value: '7d' as const, label: '7 Gun' },
                { value: '30d' as const, label: '30 Gun' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiry(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    expiry === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 text-surface-600 hover:border-surface-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate link */}
          {!shareLink ? (
            <Button variant="primary" className="w-full" onClick={handleGenerate} loading={generating}>
              <Link2 className="h-4 w-4" />
              Paylasim Linki Olustur
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Link display */}
              <div className="flex items-center gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  variant={copied ? 'success' : 'outline'}
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* QR Code – danışan bu kodu okutarak güvenli linke gider, sistem içinde görüntüler */}
              <div className="border border-surface-200 rounded-lg p-6 flex flex-col items-center gap-3">
                <QRCodeSVG value={shareLink} size={160} level="M" className="rounded-lg" />
                <p className="text-xs text-surface-500">Danisan bu QR kodu okutarak rapora guvenli link uzerinden erisir (indirme yok, sadece goruntuleme)</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); setShareLink('') }}>
            Kapat
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
