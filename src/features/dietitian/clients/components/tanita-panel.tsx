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
  confirmTanita,
  createTanitaManual,
  exportTanitaXlsx,
  getTanitaById,
  listTanitaByClient,
  parseTanitaPdf,
  TANITA_FIELD_DEFS,
  updateTanita,
  type TanitaEditableFields,
  type TanitaFieldStatus,
  type TanitaMeasurement,
} from '@/services/tanita.service'
import { Download, FileUp, Loader2, Plus, Save } from 'lucide-react'

function statusBadge(status?: TanitaFieldStatus) {
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

function toFieldString(value: string | number | null | undefined, inputType: 'text' | 'number'): string {
  if (value == null) return ''
  if (inputType === 'text') return String(value)
  if (!Number.isFinite(Number(value))) return ''
  return String(value)
}

function buildDraftValues(row: TanitaMeasurement): TanitaEditableFields {
  const out: TanitaEditableFields = {}
  for (const def of TANITA_FIELD_DEFS) {
    const v = row[def.key]
    if (def.inputType === 'text') {
      out[def.key] = v != null && String(v).trim() ? String(v) : null
    } else {
      out[def.key] = v != null && Number.isFinite(Number(v)) ? Number(v) : null
    }
  }
  return out
}

export function TanitaPanel({ clientId }: { clientId: string | number }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [draft, setDraft] = useState<TanitaEditableFields>({})

  const listQuery = useQuery({
    queryKey: ['tanita-measurements', 'client', clientId],
    queryFn: () => listTanitaByClient(clientId),
    retry: 1,
  })

  const detailQuery = useQuery({
    queryKey: ['tanita-measurements', selectedId],
    queryFn: () => getTanitaById(selectedId as number),
    enabled: selectedId != null,
    retry: 1,
  })

  const measurements = listQuery.data ?? []
  const active = detailQuery.data

  useEffect(() => {
    if (!selectedId && measurements.length > 0) {
      setSelectedId(measurements[0]?.id ?? null)
    }
  }, [measurements, selectedId])

  useEffect(() => {
    if (active) setDraft(buildDraftValues(active))
  }, [active])

  const parseMutation = useMutation({
    mutationFn: (file: File) => parseTanitaPdf(clientId, file),
    onSuccess: (row) => {
      toast.success('PDF işlendi. Lütfen değerleri kontrol edin.')
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', 'client', clientId] })
      setSelectedId(row.id)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'PDF yüklenemedi.' }))
    },
  })

  const manualMutation = useMutation({
    mutationFn: () => createTanitaManual(clientId),
    onSuccess: (row) => {
      toast.success('Manuel taslak oluşturuldu.')
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', 'client', clientId] })
      setSelectedId(row.id)
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Taslak oluşturulamadı.' }))
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => updateTanita(selectedId as number, draft),
    onSuccess: () => {
      toast.success('Taslak kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', selectedId] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kaydedilemedi.' }))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmTanita(selectedId as number, draft),
    onSuccess: () => {
      toast.success('Tanita verileri onaylandı ve kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['tanita-measurements', selectedId] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Onaylanamadı.' }))
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => exportTanitaXlsx(selectedId as number),
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
          PDF Yükle
        </Button>
        <Button variant="outline" size="sm" disabled={isBusy} onClick={() => manualMutation.mutate()}>
          {manualMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Manuel Taslak
        </Button>
        {selectedId != null && (
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => exportMutation.mutate()}
          >
            {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Excel İndir
          </Button>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-surface-500 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </div>
      ) : measurements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-surface-500">
            Henüz Tanita kaydı yok. PDF yükleyerek veya manuel taslak oluşturarak başlayın.
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
                {measurements.map((m) => (
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
          </div>

          {active?.parseNotes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {active.parseNotes}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-[14px]">Ölçüm Değerleri</CardTitle>
            </CardHeader>
            <CardContent>
              {detailQuery.isLoading && !active ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 text-left text-xs text-surface-500">
                        <th className="py-2 pr-3 font-medium">Alan</th>
                        <th className="py-2 pr-3 font-medium">Değer</th>
                        <th className="py-2 font-medium">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TANITA_FIELD_DEFS.map((def) => {
                        const meta = fieldMeta[def.key]
                        const badge = statusBadge(meta?.status)
                        const value = draft[def.key]
                        return (
                          <tr key={def.key} className="border-b border-surface-100">
                            <td className="py-2.5 pr-3 text-surface-700 whitespace-nowrap">
                              {def.label}
                              {def.unit ? ` (${def.unit})` : ''}
                            </td>
                            <td className="py-2 pr-3 min-w-[140px]">
                              <Input
                                type={def.inputType === 'text' ? 'text' : 'number'}
                                inputMode={def.inputType === 'text' ? 'text' : 'decimal'}
                                value={toFieldString(
                                  value as string | number | null | undefined,
                                  def.inputType,
                                )}
                                disabled={!isDraft || isBusy}
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value.trim()
                                  setDraft((s) => ({
                                    ...s,
                                    [def.key]:
                                      raw === ''
                                        ? null
                                        : def.inputType === 'text'
                                          ? raw
                                          : Number(raw.replace(',', '.')),
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Taslağı Kaydet
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => confirmMutation.mutate()}
                  >
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
