import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { FFQ_FOOD_GROUPS } from '@/lib/ffq-food-keys'
import { FFQ_FREQUENCY_OPTIONS, type FfqFrequencyValue } from '@/lib/frequency-labels'
import type { FfqFieldErrors, FoodFrequencyFormState } from '@/features/shared/food-frequency-form.utils'

type Props = {
  items: FoodFrequencyFormState
  notes: string
  onItemsChange: (items: FoodFrequencyFormState) => void
  onNotesChange: (notes: string) => void
  filledCount?: number
  errors?: FfqFieldErrors
}

export function FoodFrequencyFormFields({
  items,
  notes,
  onItemsChange,
  onNotesChange,
  filledCount,
  errors = {},
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-surface-500">
        Yıldızlı alanlar zorunludur. Her besin için sıklık seçin. Tüketmiyorsanız &quot;Tüketmiyor&quot; yeterlidir; tüketiyorsanız miktarı da yazın.
        {filledCount != null ? ` (${filledCount} besin işaretlendi)` : ''}
      </p>

      {FFQ_FOOD_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <p className="text-sm font-semibold text-surface-800">{group.title}</p>
          <div className="overflow-x-auto rounded-xl border border-surface-200">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-surface-50 text-left text-xs text-surface-500">
                  <th className="py-2 px-3 font-medium">Besin *</th>
                  <th className="py-2 px-3 font-medium w-[180px]">Sıklık *</th>
                  <th className="py-2 px-3 font-medium w-[160px]">Miktar *</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((food) => {
                  const row = items[food.key] ?? { frequency: '', amount: '' }
                  const rowError = errors[food.key]
                  const amountRequired = Boolean(row.frequency) && row.frequency !== 'never'
                  return (
                    <tr key={food.key} className="border-t border-surface-100">
                      <td className="py-2 px-3 text-surface-700">{food.label} *</td>
                      <td className="py-2 px-3">
                        <Select
                          value={row.frequency || undefined}
                          onValueChange={(v) =>
                            onItemsChange({
                              ...items,
                              [food.key]: {
                                ...row,
                                frequency: v as FfqFrequencyValue,
                                amount: v === 'never' ? '' : row.amount,
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-9" error={rowError?.frequency}>
                            <SelectValue placeholder="Seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FFQ_FREQUENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={row.amount ?? ''}
                          placeholder={amountRequired ? 'Örn: 1 porsiyon *' : 'Tüketmiyorsa boş'}
                          disabled={!amountRequired}
                          error={rowError?.amount}
                          onChange={(e) =>
                            onItemsChange({
                              ...items,
                              [food.key]: { ...row, amount: e.target.value },
                            })
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Input
        label="Notlar (opsiyonel)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Ek açıklamalar..."
      />
    </div>
  )
}
