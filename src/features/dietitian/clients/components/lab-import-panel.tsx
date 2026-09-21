import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatDateTime } from '@/lib/utils'
import {
  confirmLabImport,
  createLabManual,
  exportLabImportXlsx,
  getLabImportById,
  LAB_PARAM_DEFS,
  listLabImportsByClient,
  parseLabPdf,
  updateLabImport,
  type ClientLabImport,
  type LabFieldStatus,
} from '@/services/lab-import.service'
import { Download, FileUp, Loader2, Plus, Save } from 'lucide-react'

function statusBadge(status?: LabFieldStatus) {
  switch (status) {
    case 'extracted':
      return { label: 'PDF', variant: 'success' as const }
    case 'manual':
      return { label: 'Manuel', variant: 'primary' as const }
    case 'unreliable':
      return { label: 'Güvenilmez', variant: 'warning' as const }
    case 'missing':
    default:
      return { label: 'Eksik', variant: 'outline' as const }
  }
}

function buildDraftParams(row: ClientLabImport): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const def of LAB_PARAM_DEFS) {
    out[def.code] = row.parameters[def.code] ?? null
  }
  return out
}

export function LabImportPanel({ clientId }: { clientId: string | number }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, number | null>>({})
  const [filter, setFilter] = useState<'all' | 'biochemistry' | 'hemogram'>('all')

  const listQuery = useQuery({
    queryKey: ['client-lab-imports', 'client', clientId],
    queryFn: () => listLabImportsByClient(clientId),
    retry: 1,
  })

  const detailQuery = useQuery({
    queryKey: ['client-lab-imports', selectedId],
    queryFn: () => getLabImportById(selectedId as number),
    enabled: selectedId != null,
    retry: 1,
  })

  const imports = listQuery.data ?? []
  const active = detailQuery.data

  useEffect(() => {
    if (!selectedId && imports.length > 0) {
      setSelectedId(imports[0]?.id ?? null)
    }
  }, [imports, selectedId])

  useEffect(() => {
    if (active) setDraft(buildDraftParams(active))
  }, [active])

  const parseMutation = useMutation({
    mutationFn: (file: File) => parseLabPdf(clientId, file),
    onSuccess: (row) => {
      toast.success('Laboratuvar PDF işlendi. Lütfen değerleri kontrol edin.')
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', 'client', clientId] })
      setSelectedId(row.id)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'PDF yüklenemedi.' }))
    },
  })

  const manualMutation = useMutation({
    mutationFn: () => createLabManual(clientId),
    onSuccess: (row) => {
      toast.success('Manuel taslak oluşturuldu.')
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', 'client', clientId] })
      setSelectedId(row.id)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Taslak oluşturulamadı.' }))
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => updateLabImport(selectedId as number, draft),
    onSuccess: () => {
      toast.success('Taslak kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', selectedId] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kaydedilemedi.' }))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmLabImport(selectedId as number, draft),
    onSuccess: () => {
      toast.success('Laboratuvar sonuçları onaylandı ve kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['client-lab-imports', selectedId] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Onaylanamadı.' }))
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => exportLabImportXlsx(selectedId as number),
    onSuccess: () => toast.success('Excel indirildi.'),
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Excel indirilemedi.' }))
    },
  })

  const isDraft = active?.status === 'draft'
  const isBusy =
    parseMutation.isPending ||
    manualMutation.isPending ||
    saveMutation.isPending ||
    confirmMutation.isPending ||
    exportMutation.isPending

  const fieldMeta = useMemo(() => active?.fieldMeta ?? {}, [active?.fieldMeta])

  const visibleParams = useMemo(
    () => LAB_PARAM_DEFS.filter((p) => filter === 'all' || p.category === filter),
    [filter],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) parseMutation.mutate(file)
            e.target.value = ''
          }}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {parseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          Lab PDF Yükle
        </Button>
        <Button variant="outline" size="sm" disabled={isBusy} onClick={() => manualMutation.mutate()}>
          {manualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Manuel Taslak
        </Button>
        {selectedId != null && (
          <Button variant="outline" size="sm" disabled={isBusy} onClick={() => exportMutation.mutate()}>
            {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Excel İndir
          </Button>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-surface-500 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : imports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-surface-500">
            Henüz laboratuvar kaydı yok. Biyokimya/hemogram PDF yükleyerek veya manuel taslak oluşturarak başlayın.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-surface-500">Kayıt:</span>
            <Select
              value={selectedId != null ? String(selectedId) : undefined}
              onValueChange={(v) => setSelectedId(Number(v))}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Kayıt seçin" />
              </SelectTrigger>
              <SelectContent>
                {imports.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    #{m.id} — {m.status} ({m.createdAt ? formatDateTime(m.createdAt) : '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {active && (
              <Badge variant={active.status === 'confirmed' ? 'success' : 'warning'} size="sm">
                {active.status === 'confirmed' ? 'Onaylandı' : 'Taslak'}
              </Badge>
            )}
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm parametreler</SelectItem>
                <SelectItem value="biochemistry">Biyokimya</SelectItem>
                <SelectItem value="hemogram">Hemogram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {active?.parseNotes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {active.parseNotes}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">Laboratuvar Parametreleri</CardTitle>
            </CardHeader>
            <CardContent>
              {detailQuery.isLoading && !active ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-surface-900 z-10">
                      <tr className="border-b border-surface-200 text-left text-xs text-surface-500">
                        <th className="py-2 pr-3 font-medium">Parametre</th>
                        <th className="py-2 pr-3 font-medium">Değer</th>
                        <th className="py-2 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleParams.map((def) => {
                        const meta = fieldMeta[def.code]
                        const badge = statusBadge(meta?.status)
                        const value = draft[def.code]
                        return (
                          <tr key={def.code} className="border-b border-surface-100">
                            <td className="py-2.5 pr-3 text-surface-700 whitespace-nowrap">
                              {def.label}
                            </td>
                            <td className="py-2 pr-3 min-w-[120px]">
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={value != null && Number.isFinite(value) ? String(value) : ''}
                                disabled={!isDraft || isBusy}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value.trim()
                                  setDraft((s) => ({
                                    ...s,
                                    [def.code]: raw === '' ? null : Number(raw.replace(',', '.')),
                                  }))
                                }}
                              />
                            </td>
                            <td className="py-2.5">
                              <Badge variant={badge.variant} size="sm">
                                {badge.label}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {isDraft && selectedId != null && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-200">
                  <Button variant="outline" size="sm" disabled={isBusy} onClick={() => saveMutation.mutate()}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Taslağı Kaydet
                  </Button>
                  <Button variant="primary" size="sm" disabled={isBusy} onClick={() => confirmMutation.mutate()}>
                    {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Onayla ve Kaydet
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
