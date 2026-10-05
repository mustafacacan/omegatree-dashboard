import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Mail, Loader2, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { TablePagination } from '@/components/shared/table-pagination'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Button, Card, Input, Modal, ModalBody, ModalContent, ModalDescription,
  ModalFooter, ModalHeader, ModalTitle, Table, TableBody, TableCell, TableHead, TableHeader,
  TableRow,
} from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  deleteContactMessage,
  getContactMessages,
  type ContactMessage,
} from '@/services/contact-messages.service'

const QUERY_KEY = ['contact-messages'] as const

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function createReplyMailto(message: ContactMessage) {
  const subject = message.subject.toLowerCase().startsWith('re:')
    ? message.subject
    : `Re: ${message.subject}`
  const body = [
    '',
    '',
    '--- Original mesaj ---',
    `Gönderen: ${message.fullname} <${message.email}>`,
    `Konu: ${message.subject}`,
    '',
    message.message,
  ].join('\n')

  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function ContactMessagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selected, setSelected] = useState<ContactMessage | null>(null)
  const [toDelete, setToDelete] = useState<ContactMessage | null>(null)
  const trimmedSearch = useMemo(() => search.trim(), [search])

  const listQuery = useQuery({
    queryKey: [...QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () => getContactMessages({ page, limit: pageSize, search: trimmedSearch || undefined }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteContactMessage(id),
    onSuccess: () => {
      toast.success('Mesaj silindi')
      setToDelete(null)
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, { fallback: 'Mesaj silinemedi' })),
  })

  const messages = listQuery.data?.items ?? []
  const totalItems = listQuery.data?.totalItems ?? 0

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Mesajlar" description="Web sitesi iletişim formundan gelen mesajları yönetin." />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 p-5">
          <div className="flex items-center gap-2 text-sm text-surface-600">
            <Mail className="h-4 w-4 text-primary-500" />
            <span>{listQuery.isLoading ? 'Yükleniyor...' : `${totalItems} mesaj`}</span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="İsim, e-posta veya konu ara..."
            />
          </div>
        </div>
        {listQuery.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
        ) : listQuery.isError ? (
          <div className="p-6 text-sm text-danger">{getApiErrorMessage(listQuery.error, { fallback: 'Mesajlar yüklenemedi' })}</div>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center text-sm text-surface-500">Henüz mesaj bulunmuyor.</div>
        ) : (
          <>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Gönderen</TableHead><TableHead>Konu</TableHead><TableHead>Mesaj</TableHead>
                <TableHead>Tarih</TableHead><TableHead className="w-[130px]" />
              </TableRow></TableHeader>
              <TableBody>{messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <button className="text-left" onClick={() => setSelected(message)}>
                      <div className="font-medium text-surface-900">{message.fullname}</div>
                      <div className="text-xs text-surface-500">{message.email}</div>
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{message.subject}</TableCell>
                  <TableCell className="max-w-[360px] truncate">{message.message}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(message.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Mesajı görüntüle"
                        title="Mesajı görüntüle"
                        onClick={() => setSelected(message)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Mesajı sil"
                        title="Mesajı sil"
                        onClick={() => setToDelete(message)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
            <TablePagination
              totalItems={totalItems} page={page} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }}
            />
          </>
        )}
      </Card>

      <Modal open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>{selected?.subject ?? 'Mesaj detayı'}</ModalTitle>
            <ModalDescription>{selected?.fullname} · {selected?.email}</ModalDescription>
          </ModalHeader>
          <ModalBody><p className="whitespace-pre-wrap text-sm leading-6 text-surface-700">{selected?.message}</p></ModalBody>
          <ModalFooter>
            {selected && (
              <Button
                variant="primary"
                leftIcon={<Mail className="h-4 w-4" />}
                onClick={() => { window.location.href = createReplyMailto(selected) }}
              >
                Yanıtla
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Mesaj silinsin mi?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  )
}
