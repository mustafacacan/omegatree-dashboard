import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  ImageIcon,
  MessageSquareText,
  Paperclip,
  Send,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Checkbox,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import type { SupportTicket } from '@/services/support-tickets.service'

type ChatMessage = NonNullable<SupportTicket['messages']>[number]

type SupportTicketChatProps = {
  messages: ChatMessage[]
  currentUserId?: number | string | null
  isClient: boolean
  isAdmin: boolean
  disabled?: boolean
  loading?: boolean
  closed?: boolean
  fillHeight?: boolean
  className?: string
  onSend: (payload: { body: string; isInternal?: boolean; file?: File | null }) => void
}

function formatAuthorLabel(
  msg: ChatMessage,
  isClient: boolean,
  isMine: boolean,
): string {
  if (msg.isInternal) return 'Dahili Not'
  if (isClient) return isMine ? 'Siz' : 'Destek Ekibi'
  const name = `${msg.author?.firstName ?? ''} ${msg.author?.lastName ?? ''}`.trim()
  return name || 'Kullanıcı'
}

function isImageMime(mimetype?: string | null): boolean {
  return Boolean(mimetype?.startsWith('image/'))
}

function MessageMedia({ media }: { media: NonNullable<ChatMessage['media']> }) {
  const url = resolveMediaUrl(media.url, media.filename)
  if (!url) return null

  if (isImageMime(media.mimetype)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        <img
          src={url}
          alt={media.filename}
          className="max-h-48 max-w-full rounded-lg border border-surface-200 object-cover"
        />
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-primary-700 hover:bg-surface-50"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[200px]">{media.filename}</span>
    </a>
  )
}

export function SupportTicketChat({
  messages,
  currentUserId,
  isClient,
  isAdmin,
  disabled = false,
  loading = false,
  closed = false,
  fillHeight = false,
  className,
  onSend,
}: SupportTicketChatProps) {
  const [reply, setReply] = useState('')
  const [isInternalReply, setIsInternalReply] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const visibleMessages = messages.filter((msg) => !msg.isInternal || !isClient)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [visibleMessages.length, loading])

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null)
      return
    }
    if (attachment.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(attachment)
      setAttachmentPreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setAttachmentPreview(null)
  }, [attachment])

  const canSend = !disabled && !loading && (reply.trim().length > 0 || attachment != null)

  const handleFileChange = (file: File | undefined) => {
    if (!file) return
    setAttachment(file)
  }

  const clearAttachment = () => {
    setAttachment(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = () => {
    if (!canSend) return
    onSend({
      body: reply.trim(),
      isInternal: isAdmin ? isInternalReply : false,
      file: attachment,
    })
    setReply('')
    setIsInternalReply(false)
    clearAttachment()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card
      className={`overflow-hidden border-surface-200 shadow-sm ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : ''
      } ${className ?? ''}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-surface-100 bg-surface-50 px-4 py-3">
        <MessageSquareText className="h-4 w-4 text-primary-600" />
        <p className="text-sm font-semibold text-surface-800">
          {isClient ? 'Yazışmalar' : 'Mesajlaşma'}
        </p>
        <span className="ml-auto text-xs text-surface-500">
          {visibleMessages.length} mesaj
        </span>
      </div>

      <CardContent className={`flex min-h-0 flex-1 flex-col p-0 ${fillHeight ? '' : ''}`}>
        <div
          ref={scrollRef}
          className={`flex flex-col gap-3 overflow-y-auto px-4 py-4 ${
            fillHeight ? 'min-h-0 flex-1' : 'max-h-[420px] min-h-[280px]'
          }`}
        >
          {visibleMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="rounded-full bg-surface-100 p-3">
                <MessageSquareText className="h-6 w-6 text-surface-400" />
              </div>
              <p className="text-sm text-surface-500">
                {isClient
                  ? 'Henüz yanıt yok. Ekibimiz en kısa sürede size dönüş yapacaktır.'
                  : 'Henüz mesaj yok. İlk yanıtı siz gönderebilirsiniz.'}
              </p>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const isMine =
                currentUserId != null && msg.author?.id === Number(currentUserId)
              const isInternal = msg.isInternal

              return (
                <div
                  key={msg.id}
                  className={`flex ${isInternal ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isInternal
                        ? 'border border-amber-200 bg-amber-50/80'
                        : isMine
                          ? 'rounded-br-md bg-primary-600 text-white'
                          : 'rounded-bl-md border border-surface-100 bg-surface-50'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-medium ${
                        isInternal
                          ? 'text-amber-700'
                          : isMine
                            ? 'text-primary-100'
                            : 'text-surface-500'
                      }`}
                    >
                      {formatAuthorLabel(msg, isClient, isMine)}
                      {isInternal ? '' : ' · '}
                      {!isInternal && (
                        <span className="font-normal opacity-80">
                          {new Date(msg.createdAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </p>

                    {msg.body.trim() ? (
                      <p
                        className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                          isMine && !isInternal ? 'text-white' : 'text-surface-800'
                        }`}
                      >
                        {msg.body}
                      </p>
                    ) : null}

                    {msg.media ? (
                      <div className={isMine && !isInternal ? '[&_a]:text-white' : ''}>
                        <MessageMedia media={msg.media} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!closed ? (
          <div className="shrink-0 space-y-2 border-t border-surface-100 bg-white p-4">
            {attachment ? (
              <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                {attachmentPreview ? (
                  <img
                    src={attachmentPreview}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-200">
                    {attachment.type === 'application/pdf' ? (
                      <FileText className="h-5 w-5 text-surface-600" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-surface-600" />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-surface-800">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-surface-500">
                    {(attachment.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearAttachment}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            <div
              className={cn(
                'flex items-center gap-1 rounded-xl border border-surface-200 bg-white px-1.5 py-1',
                'transition-[border-color,box-shadow] focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/15',
                (disabled || loading) && 'opacity-60',
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-9 w-9 shrink-0 text-surface-500 hover:text-surface-700"
                disabled={disabled || loading}
                onClick={() => fileInputRef.current?.click()}
                title="Dosya ekle"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <textarea
                placeholder={
                  isClient ? 'Mesajınızı yazın...' : 'Yanıt yazın... (Enter ile gönder)'
                }
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={disabled || loading}
                className="min-h-[36px] max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
              />

              <Button
                type="button"
                variant="primary"
                size="icon-sm"
                className="h-9 w-9 shrink-0"
                loading={loading}
                disabled={!canSend}
                onClick={handleSend}
                title="Gönder"
              >
                {!loading && <Send className="h-4 w-4" />}
              </Button>
            </div>

            {isAdmin ? (
              <Checkbox
                checked={isInternalReply}
                onCheckedChange={(v) => setIsInternalReply(v === true)}
                label="Dahili not olarak gönder"
                disabled={disabled || loading}
              />
            ) : null}

            <p className="text-[11px] text-surface-400">
              JPEG, PNG, GIF, WebP veya PDF · en fazla 25 MB
            </p>
          </div>
        ) : (
          <div className="shrink-0 border-t border-surface-100 bg-surface-50 px-4 py-3 text-center text-sm text-surface-500">
            Bu talep kapatıldı; yeni mesaj gönderilemez.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
