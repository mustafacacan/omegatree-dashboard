import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { IpaqFormFields } from '@/features/shared/ipaq-form-fields'
import {
  buildIpaqPayload,
  EMPTY_IPAQ_FORM,
  recordToIpaqForm,
  type IpaqFormState,
} from '@/features/shared/ipaq-form.utils'
import { getIpaqForClient, getMyIpaqRecord, upsertIpaqRecord } from '@/services/ipaq.service'
import { Loader2, Save } from 'lucide-react'

function resolveClientId(clientId: string | number): number | undefined {
  const n = typeof clientId === 'number' ? clientId : Number(clientId)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function IpaqPanel({ clientId }: { clientId: string | number }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<IpaqFormState>(EMPTY_IPAQ_FORM)
  const resolvedClientId = resolveClientId(clientId)

  const query = useQuery({
    queryKey: ['ipaq-records', 'client', clientId],
    queryFn: () => (resolvedClientId != null ? getIpaqForClient(resolvedClientId) : getMyIpaqRecord()),
    retry: 1,
  })

  useEffect(() => {
    if (query.data !== undefined) setForm(recordToIpaqForm(query.data))
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () => upsertIpaqRecord(buildIpaqPayload(form, resolvedClientId)),
    onSuccess: () => {
      toast.success('IPAQ kaydı kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['ipaq-records', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['ipaq-records', 'me'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'IPAQ kaydedilemedi.' }))
    },
  })

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-500 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <IpaqFormFields form={form} onChange={setForm} />
      <Button variant="primary" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Kaydet
      </Button>
    </div>
  )
}
