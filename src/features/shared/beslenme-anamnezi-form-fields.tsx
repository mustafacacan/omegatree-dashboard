import { Checkbox, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import {
  BOWEL_ISSUE_OPTIONS,
  DEFECATION_OPTIONS,
  FREQUENCY_OPTIONS,
} from '@/lib/frequency-labels'
import type { BeslenmeAnamneziFormState } from '@/features/shared/beslenme-anamnezi-form.utils'

type Props = {
  form: BeslenmeAnamneziFormState
  onChange: (patch: Partial<BeslenmeAnamneziFormState>) => void
  /** Onboarding uses friendlier question labels */
  variant?: 'default' | 'onboarding'
  showNotes?: boolean
  errors?: Partial<Record<keyof BeslenmeAnamneziFormState, string>>
}

export function BeslenmeAnamneziFormFields({
  form,
  onChange,
  variant = 'default',
  showNotes = true,
  errors = {},
}: Props) {
  const set = (patch: Partial<BeslenmeAnamneziFormState>) => onChange(patch)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label={
            variant === 'onboarding'
              ? 'Günde kaç ana öğün tüketiyorsunuz? *'
              : 'Ana öğün / gün *'
          }
          type="number"
          min={0}
          max={10}
          value={form.mainMealsPerDay}
          onChange={(e) => set({ mainMealsPerDay: e.target.value })}
          error={errors.mainMealsPerDay}
        />
        <Input
          label={
            variant === 'onboarding'
              ? 'Günde kaç ara öğün tüketiyorsunuz? *'
              : 'Ara öğün / gün *'
          }
          type="number"
          min={0}
          max={10}
          value={form.snackMealsPerDay}
          onChange={(e) => set({ snackMealsPerDay: e.target.value })}
          error={errors.snackMealsPerDay}
        />
        <Input
          label={
            variant === 'onboarding'
              ? 'Haftada kaç gün dışarıdan besleniyorsunuz? *'
              : 'Dışarı gün / hafta *'
          }
          type="number"
          min={0}
          max={7}
          value={form.fastFoodDaysPerWeek}
          onChange={(e) => set({ fastFoodDaysPerWeek: e.target.value })}
          error={errors.fastFoodDaysPerWeek}
        />
        <Input
          label={
            variant === 'onboarding'
              ? 'Haftada kaç öğün dışarıdan tüketiyorsunuz? *'
              : 'Dışarı öğün / hafta *'
          }
          type="number"
          min={0}
          max={30}
          value={form.fastFoodMealsPerWeek}
          onChange={(e) => set({ fastFoodMealsPerWeek: e.target.value })}
          error={errors.fastFoodMealsPerWeek}
        />
        <Input
          label={
            variant === 'onboarding'
              ? 'Günlük su tüketiminiz ne kadar? (L) *'
              : 'Su (L) *'
          }
          type="number"
          min={0}
          max={20}
          step="0.1"
          value={form.dailyWaterLiters}
          onChange={(e) => set({ dailyWaterLiters: e.target.value })}
          error={errors.dailyWaterLiters}
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">
            {variant === 'onboarding'
              ? 'Büyük tuvalete çıkma sıklığınız hangisine daha uygundur? *'
              : 'Tuvalet sıklığı *'}
          </label>
          <Select
            value={form.defecationFrequency || undefined}
            onValueChange={(v) =>
              set({ defecationFrequency: v as BeslenmeAnamneziFormState['defecationFrequency'] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seçin..." />
            </SelectTrigger>
            <SelectContent>
              {DEFECATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.defecationFrequency && (
            <p className="text-xs text-red-600">{errors.defecationFrequency}</p>
          )}
        </div>
      </div>

      <Input
        label="Tüketmekten kaçındığınız besinler nelerdir? *"
        value={form.avoidedFoods}
        onChange={(e) => set({ avoidedFoods: e.target.value })}
        placeholder="Yoksa 'Yok' yazın"
        error={errors.avoidedFoods}
      />
      <Input
        label="Kaçınma sebebiniz nedir?"
        value={form.avoidedFoodsReason}
        onChange={(e) => set({ avoidedFoodsReason: e.target.value })}
        placeholder="Örn: alerji, intolerans"
      />
      <Input
        label={variant === 'onboarding' ? 'Gıda alerjiniz var mı?' : 'Gıda alerjisi'}
        value={form.foodAllergy}
        onChange={(e) => set({ foodAllergy: e.target.value })}
        placeholder="Yoksa 'Yok' yazın"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-surface-700">
            Diyare veya konstipasyon (kabızlık) sorununuz var mı? *
          </label>
          <Select
            value={form.bowelIssue}
            onValueChange={(v) =>
              set({
                bowelIssue: v as BeslenmeAnamneziFormState['bowelIssue'],
                bowelIssueFrequency: v === 'none' ? '' : form.bowelIssueFrequency,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOWEL_ISSUE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.bowelIssue !== 'none' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-surface-700">
              Bu sorunları ne sıklıkla yaşıyorsunuz? *
            </label>
            <Select
              value={form.bowelIssueFrequency || undefined}
              onValueChange={(v) =>
                set({ bowelIssueFrequency: v as BeslenmeAnamneziFormState['bowelIssueFrequency'] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seçin..." />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bowelIssueFrequency && (
              <p className="text-xs text-red-600">{errors.bowelIssueFrequency}</p>
            )}
          </div>
        )}
        <Input
          label="Gastrointestinal sistem hastalığınız var mı? *"
          value={form.gastrointestinalDisease}
          onChange={(e) => set({ gastrointestinalDisease: e.target.value })}
          placeholder="Yoksa 'Yok' yazın"
          error={errors.gastrointestinalDisease}
        />
      </div>

      <div className="space-y-3">
        <Checkbox
          checked={form.nightEatingHabit}
          onCheckedChange={(v) => set({ nightEatingHabit: Boolean(v) })}
          label="Gece yemek yeme alışkanlığınız var mı?"
        />
        <Checkbox
          checked={form.eatingDisorderBehaviors}
          onCheckedChange={(v) => set({ eatingDisorderBehaviors: Boolean(v) })}
          label="Zaman zaman normalden çok daha fazla yediğiniz, yemeyi durdurmakta zorlandığınız ya da yedikten sonra kendinizi suçlu hissettiğiniz durumlar oluyor mu?"
        />
        {form.eatingDisorderBehaviors && (
          <Input
            label="Ayrıntı belirtir misiniz?"
            value={form.eatingDisorderBehaviorsNote}
            onChange={(e) => set({ eatingDisorderBehaviorsNote: e.target.value })}
            placeholder="İsteğe bağlı açıklama"
          />
        )}
      </div>

      {showNotes && (
        <Input
          label="Not"
          value={form.nutritionNotes}
          onChange={(e) => set({ nutritionNotes: e.target.value })}
          placeholder="Opsiyonel"
        />
      )}
    </div>
  )
}
