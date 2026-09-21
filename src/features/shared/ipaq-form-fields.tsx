import { Card, CardContent, Checkbox, Input } from '@/components/ui'
import type { ActivityBlock, IpaqFormState } from '@/features/shared/ipaq-form.utils'

function ActivitySection({
  title,
  block,
  onChange,
  showNoneLabel,
}: {
  title: string
  block: ActivityBlock
  onChange: (next: ActivityBlock) => void
  showNoneLabel: string
}) {
  return (
    <div className="space-y-3 rounded-xl border border-surface-200 p-4">
      <p className="text-sm font-medium text-surface-800">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Haftada kaç gün?"
          type="number"
          min={0}
          max={7}
          value={block.days}
          disabled={block.none}
          onChange={(e) => onChange({ ...block, days: e.target.value, none: false })}
        />
        <label className="flex items-center gap-2 text-sm text-surface-700 pt-6">
          <Checkbox
            checked={block.none}
            onCheckedChange={(v) =>
              onChange({
                ...block,
                none: Boolean(v),
                days: Boolean(v) ? '' : block.days,
                hours: Boolean(v) ? '' : block.hours,
                minutes: Boolean(v) ? '' : block.minutes,
              })
            }
          />
          {showNoneLabel}
        </label>
      </div>
      {!block.none && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Saat"
            type="number"
            min={0}
            max={24}
            value={block.hours}
            disabled={block.unknown}
            onChange={(e) => onChange({ ...block, hours: e.target.value, unknown: false })}
          />
          <Input
            label="Dakika"
            type="number"
            min={0}
            max={59}
            value={block.minutes}
            disabled={block.unknown}
            onChange={(e) => onChange({ ...block, minutes: e.target.value, unknown: false })}
          />
          <label className="flex items-center gap-2 text-sm text-surface-700 pt-6">
            <Checkbox
              checked={block.unknown}
              onCheckedChange={(v) =>
                onChange({
                  ...block,
                  unknown: Boolean(v),
                  hours: Boolean(v) ? '' : block.hours,
                  minutes: Boolean(v) ? '' : block.minutes,
                })
              }
            />
            Bilmiyorum / emin değilim
          </label>
        </div>
      )}
    </div>
  )
}

type Props = {
  form: IpaqFormState
  onChange: (next: IpaqFormState) => void
}

export function IpaqFormFields({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-surface-500">
        Uluslararası Fiziksel Aktivite Anketi (IPAQ — kısa form). Sorular son 7 gün içindeki aktiviteleri kapsar.
      </p>

      <ActivitySection
        title="1–2. Şiddetli fiziksel aktiviteler (ağır kaldırma, aerobik, basketbol, futbol, hızlı bisiklet vb.)"
        block={form.vigorous}
        showNoneLabel="Şiddetli fiziksel aktivite yapmadım"
        onChange={(vigorous) => onChange({ ...form, vigorous })}
      />

      <ActivitySection
        title="3–4. Orta dereceli fiziksel aktiviteler (hafif yük taşıma, normal bisiklet, dans vb. — yürüme hariç)"
        block={form.moderate}
        showNoneLabel="Orta dereceli fiziksel aktivite yapmadım"
        onChange={(moderate) => onChange({ ...form, moderate })}
      />

      <ActivitySection
        title="5–6. Yürüyüş (en az 10 dakika)"
        block={form.walk}
        showNoneLabel="Yürümedim"
        onChange={(walk) => onChange({ ...form, walk })}
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-surface-800">
            7. Oturarak geçirilen süre (iş, ev, okuma, televizyon vb.)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Saat"
              type="number"
              min={0}
              max={24}
              value={form.sitting.hours}
              disabled={form.sitting.unknown}
              onChange={(e) =>
                onChange({
                  ...form,
                  sitting: { ...form.sitting, hours: e.target.value, unknown: false },
                })
              }
            />
            <Input
              label="Dakika"
              type="number"
              min={0}
              max={59}
              value={form.sitting.minutes}
              disabled={form.sitting.unknown}
              onChange={(e) =>
                onChange({
                  ...form,
                  sitting: { ...form.sitting, minutes: e.target.value, unknown: false },
                })
              }
            />
            <label className="flex items-center gap-2 text-sm text-surface-700 pt-6">
              <Checkbox
                checked={form.sitting.unknown}
                onCheckedChange={(v) =>
                  onChange({
                    ...form,
                    sitting: {
                      ...form.sitting,
                      unknown: Boolean(v),
                      hours: Boolean(v) ? '' : form.sitting.hours,
                      minutes: Boolean(v) ? '' : form.sitting.minutes,
                    },
                  })
                }
              />
              Bilmiyorum / emin değilim
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
