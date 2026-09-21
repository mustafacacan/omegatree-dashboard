import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { IpaqFormFields } from '@/features/shared/ipaq-form-fields'
import {
  buildIpaqPayload,
  EMPTY_IPAQ_FORM,
  validateIpaqForm,
  type IpaqFormState,
} from '@/features/shared/ipaq-form.utils'
import { upsertIpaqRecord } from '@/services/ipaq.service'

export function IpaqStep({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const [form, setForm] = useState<IpaqFormState>(EMPTY_IPAQ_FORM)

  const mutation = useMutation({
    mutationFn: () => upsertIpaqRecord(buildIpaqPayload(form)),
    onSuccess: async () => {
      toast.success('IPAQ kaydı kaydedildi.')
      await onSaved()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'IPAQ kaydedilemedi.' }))
    },
  })

  const handleSave = () => {
    const err = validateIpaqForm(form)
    if (err) {
      toast.error(err)
      return
    }
    mutation.mutate()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-surface-800">Fiziksel Aktivite Anketi (IPAQ)</p>
      <IpaqFormFields form={form} onChange={setForm} />
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
