import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { FoodFrequencyFormFields } from '@/features/shared/food-frequency-form-fields'
import {
  buildEmptyFfqItems,
  countFilledFfqItems,
  mergeFfqItems,
  type FoodFrequencyFormState,
} from '@/features/shared/food-frequency-form.utils'
import {
  getFoodFrequencyForClient,
  getMyFoodFrequencyRecord,
  upsertFoodFrequencyRecord,
} from '@/services/food-frequency.service'
import { Loader2, Save } from 'lucide-react'

function resolveClientId(clientId: string | number): number | undefined {
  const n = typeof clientId === 'number' ? clientId : Number(clientId)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function FoodFrequencyPanel({ clientId }: { clientId: string | number }) {
  const queryClient = useQueryClient()
  const resolvedClientId = resolveClientId(clientId)
  const [items, setItems] = useState<FoodFrequencyFormState>(() => buildEmptyFfqItems())
  const [notes, setNotes] = useState('')

  const query = useQuery({
    queryKey: ['food-frequency-records', 'client', clientId],
    queryFn: () =>
      resolvedClientId != null
        ? getFoodFrequencyForClient(resolvedClientId)
        : getMyFoodFrequencyRecord(),
    retry: 1,
  })

  useEffect(() => {
    if (query.data !== undefined) {
      setItems(mergeFfqItems(query.data?.items))
      setNotes(query.data?.notes ?? '')
    }
  }, [query.data])

  const mutation = useMutation({
    mutationFn: () =>
      upsertFoodFrequencyRecord({
        ...(resolvedClientId != null ? { clientId: resolvedClientId } : {}),
        items,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Besin tüketim sıklığı kaydedildi.')
      queryClient.invalidateQueries({ queryKey: ['food-frequency-records', 'client', clientId] })
      queryClient.invalidateQueries({ queryKey: ['food-frequency-records', 'me'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kayıt kaydedilemedi.' }))
    },
  })

  const filledCount = useMemo(() => countFilledFfqItems(items), [items])

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-surface-500 py-8 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <FoodFrequencyFormFields
        items={items}
        notes={notes}
        onItemsChange={setItems}
        onNotesChange={setNotes}
        filledCount={filledCount}
      />
      <Button variant="primary" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Kaydet
      </Button>
    </div>
  )
}
