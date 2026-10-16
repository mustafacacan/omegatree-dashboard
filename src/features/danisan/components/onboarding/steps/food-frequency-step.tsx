import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { FoodFrequencyFormFields } from '@/features/shared/food-frequency-form-fields'
import {
  buildEmptyFfqItems,
  countFilledFfqItems,
  getFfqFieldErrors,
  validateFfqForm,
  type FoodFrequencyFormState,
} from '@/features/shared/food-frequency-form.utils'
import { upsertFoodFrequencyRecord } from '@/services/food-frequency.service'

export function FoodFrequencyStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [items, setItems] = useState<FoodFrequencyFormState>(() => buildEmptyFfqItems())
  const [notes, setNotes] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const filledCount = useMemo(() => countFilledFfqItems(items), [items])
  const fieldErrors = useMemo(() => (showErrors ? getFfqFieldErrors(items) : {}), [items, showErrors])

  const mutation = useMutation({
    mutationFn: () =>
      upsertFoodFrequencyRecord({
        items,
        notes: notes.trim() || null,
      }),
    onSuccess: async () => {
      toast.success('Besin tüketim sıklığı kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Besin tüketim sıklığı kaydedilemedi.' }))
    },
  })

  const handleSave = () => {
    const err = validateFfqForm(items)
    if (err) {
      setShowErrors(true)
      toast.error(err)
      return
    }
    mutation.mutate()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-surface-800">Besin Tüketim Sıklığı</p>
      <FoodFrequencyFormFields
        items={items}
        notes={notes}
        onItemsChange={setItems}
        onNotesChange={setNotes}
        filledCount={filledCount}
        errors={fieldErrors}
      />
      <div className="pt-2">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          Kaydet ve Devam Et
        </Button>
      </div>
    </div>
  )
}
