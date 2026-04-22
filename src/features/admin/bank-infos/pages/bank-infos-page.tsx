import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { TablePagination } from '@/components/shared/table-pagination'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import {
  createBankInfo,
  deleteBankInfo,
  getBankInfosPage,
  updateBankInfo,
  type BankInfo,
} from '@/services/bank-infos.service'

const QUERY_KEY = ['bank-infos'] as const

function formatIban(iban: string): string {
  const raw = String(iban ?? '').replace(/\s+/g, '').toUpperCase()
  if (!raw) return '—'
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

export default function BankInfosPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const trimmedSearch = useMemo(() => search.trim(), [search])

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<BankInfo | null>(null)
  const [form, setForm] = useState({
    bankName: '',
    accountHolder: '',
    ibanNo: '',
    isActive: true,
  })

  const listQuery = useQuery({
    queryKey: [...QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () => getBankInfosPage({ page, limit: pageSize, search: trimmedSearch || undefined }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const items = listQuery.data?.items ?? []
  const totalItems = listQuery.data?.totalItems ?? items.length
  const totalPages = useMemo(() => Math.max(1, listQuery.data?.totalPages ?? 1), [listQuery.data?.totalPages])

  const createMutation = useMutation({
    mutationFn: createBankInfo,
    onSuccess: () => {
      toast.success('Banka bilgisi eklendi')
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      setEditOpen(false)
      setSelected(null)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, { fallback: 'Banka bilgisi eklenemedi' })),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateBankInfo>[1] }) =>
      updateBankInfo(id, payload),
    onSuccess: () => {
      toast.success('Banka bilgisi güncellendi')
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      setEditOpen(false)
      setSelected(null)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, { fallback: 'Güncelleme başarısız' })),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBankInfo(id),
    onSuccess: () => {
      toast.success('Banka bilgisi silindi')
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      setDeleteOpen(false)
      setSelected(null)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, { fallback: 'Silme işlemi başarısız' })),
  })

  const openNew = () => {
    setSelected(null)
    setForm({ bankName: '', accountHolder: '', ibanNo: '', isActive: true })
    setEditOpen(true)
  }

  const openEdit = (row: BankInfo) => {
    setSelected(row)
    setForm({
      bankName: row.bankName ?? '',
      accountHolder: row.accountHolder ?? '',
      ibanNo: row.ibanNo ?? '',
      isActive: Boolean(row.isActive),
    })
    setEditOpen(true)
  }

  const submit = () => {
    const payload = {
      bankName: form.bankName.trim(),
      accountHolder: form.accountHolder.trim(),
      ibanNo: form.ibanNo.trim(),
      isActive: form.isActive,
    }
    if (!payload.bankName || !payload.accountHolder || !payload.ibanNo) {
      toast.error('Banka adı, hesap sahibi ve IBAN zorunludur')
      return
    }
    if (selected) {
      updateMutation.mutate({ id: selected.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <div>
            <h3 className="text-[15px] font-semibold text-surface-900">Banka Bilgileri</h3>
            <p className="text-[12px] mt-0.5 text-surface-500">
              {listQuery.isLoading ? 'Yükleniyor...' : `Toplam ${totalItems} kayıt`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-64">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Banka / IBAN / Hesap sahibi ara..."
              />
            </div>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Yeni
            </Button>
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : listQuery.isError ? (
          <div className="p-6 text-sm text-surface-700">
            {getApiErrorMessage(listQuery.error, { fallback: 'Liste yüklenemedi' })}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-surface-700">Kayıt bulunamadı.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banka</TableHead>
                  <TableHead>Hesap Sahibi</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead className="w-[120px]">Durum</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.bankName || '—'}</TableCell>
                    <TableCell>{row.accountHolder || '—'}</TableCell>
                    <TableCell className="font-mono text-[12px]">{formatIban(row.ibanNo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(row.isActive)}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: row.id,
                              payload: { isActive: checked },
                            })
                          }
                        />
                        <span className="text-[12px] text-surface-600">{row.isActive ? 'Aktif' : 'Pasif'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelected(row)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <TablePagination
              className="px-5 py-4 border-t border-surface-100"
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              onPageChange={(next) => setPage(Math.min(Math.max(1, next), totalPages))}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
            />
          </>
        )}
      </Card>

      {/* Create / Edit */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent className="max-w-xl">
          <ModalHeader>
            <ModalTitle>{selected ? 'Banka Bilgisini Düzenle' : 'Yeni Banka Bilgisi'}</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[65vh] overflow-y-auto">
            <Input
              label="Banka adı"
              value={form.bankName}
              onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
              placeholder="Örn: Ziraat Bankası"
            />
            <Input
              label="Hesap sahibi"
              value={form.accountHolder}
              onChange={(e) => setForm((s) => ({ ...s, accountHolder: e.target.value }))}
              placeholder="Örn: OmegaTree A.Ş."
            />
            <Input
              label="IBAN"
              value={form.ibanNo}
              onChange={(e) => setForm((s) => ({ ...s, ibanNo: e.target.value }))}
              placeholder="TR..."
            />
            <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 p-3">
              <div>
                <p className="text-[12px] font-medium text-surface-800">Aktif</p>
                <p className="text-[11px] text-surface-500">Sipariş ekranında sadece aktif hesaplar gösterilir.</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete confirm */}
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Silinsin mi?</ModalTitle>
          </ModalHeader>
          <ModalBody className="text-sm text-surface-700">
            {selected ? (
              <>
                <p>Bu banka bilgisini silmek üzeresiniz:</p>
                <p className="mt-2 font-medium text-surface-900">{selected.bankName}</p>
                <p className="font-mono text-[12px] text-surface-600">{formatIban(selected.ibanNo)}</p>
              </>
            ) : (
              'Kayıt bulunamadı.'
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selected) return
                deleteMutation.mutate(selected.id)
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

