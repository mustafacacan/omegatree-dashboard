import { useMemo } from 'react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { FREQUENCY_OPTIONS, type FrequencyValue } from '@/lib/frequency-labels'
import { BeslenmeAnamneziFormFields } from '@/features/shared/beslenme-anamnezi-form-fields'
import { IpaqFormFields } from '@/features/shared/ipaq-form-fields'
import { FoodFrequencyFormFields } from '@/features/shared/food-frequency-form-fields'
import {
  countFilledFfqItems,
  type FoodFrequencyFormState,
} from '@/features/shared/food-frequency-form.utils'
import type { IpaqFormState } from '@/features/shared/ipaq-form.utils'
import type { AdminCreateUserForm } from '@/features/admin/users/admin-create-user.types'

type Props = {
  form: AdminCreateUserForm
  onChange: (patch: Partial<AdminCreateUserForm>) => void
  ipaqForm: IpaqFormState
  onIpaqChange: (next: IpaqFormState) => void
  ffqItems: FoodFrequencyFormState
  ffqNotes: string
  onFfqItemsChange: (next: FoodFrequencyFormState) => void
  onFfqNotesChange: (notes: string) => void
}

export function AdminCreateUserDanisanSection({
  form,
  onChange,
  ipaqForm,
  onIpaqChange,
  ffqItems,
  ffqNotes,
  onFfqItemsChange,
  onFfqNotesChange,
}: Props) {
  const ffqFilledCount = useMemo(() => countFilledFfqItems(ffqItems), [ffqItems])

  return (
    <div className="space-y-3 pt-1 border-t border-surface-200">
      <p className="text-[12px] text-surface-500">
        Aşağıdaki sekmelerin tamamı opsiyoneldir. Boş bırakırsanız yalnızca kişisel bilgilerle kayıt oluşturulur.
      </p>
      <Tabs defaultValue="anamnez" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="anamnez" className="text-[11px] sm:text-xs">
            Anamnez
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="text-[11px] sm:text-xs">
            Beslenme
          </TabsTrigger>
          <TabsTrigger value="ipaq" className="text-[11px] sm:text-xs">
            IPAQ
          </TabsTrigger>
          <TabsTrigger value="ffq" className="text-[11px] sm:text-xs">
            Besin Sıklığı
          </TabsTrigger>
        </TabsList>

        <TabsContent value="anamnez" className="mt-4 space-y-3">
          <p className="form-section-title">Anamnez (Opsiyonel)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Yaş"
              type="number"
              value={form.age}
              onChange={(e) => onChange({ age: e.target.value })}
              placeholder="35"
            />
            <Input
              label="Boy (cm)"
              type="number"
              value={form.bodyHeight}
              onChange={(e) => onChange({ bodyHeight: e.target.value })}
              placeholder="178"
            />
            <Input
              label="Kilo (kg)"
              type="number"
              value={form.bodyWeight}
              onChange={(e) => onChange({ bodyWeight: e.target.value })}
              placeholder="82"
            />
            <Input
              label="Bel (cm)"
              type="number"
              value={form.waistCircumference}
              onChange={(e) => onChange({ waistCircumference: e.target.value })}
              placeholder="85"
            />
            <Input
              label="Kalça (cm)"
              type="number"
              value={form.hipCircumference}
              onChange={(e) => onChange({ hipCircumference: e.target.value })}
              placeholder="95"
            />
            <Input
              label="Boyun (cm)"
              type="number"
              value={form.neckCircumference}
              onChange={(e) => onChange({ neckCircumference: e.target.value })}
              placeholder="38"
            />
            <Input
              label="Meslek"
              filter="personName"
              value={form.profession}
              onChange={(e) => onChange({ profession: e.target.value })}
              placeholder="Örn: öğretmen"
            />
            <Input
              label="Eğitim"
              value={form.education}
              onChange={(e) => onChange({ education: e.target.value })}
              placeholder="Örn: Lisans"
            />
          </div>
          <Input
            label="Kronik hastalıklar"
            value={form.chronicIllness}
            onChange={(e) => onChange({ chronicIllness: e.target.value })}
            placeholder="Yoksa 'Yok' yazın"
          />
          <Input
            label="Ailede kronik hastalık"
            value={form.familyChronicIllness}
            onChange={(e) => onChange({ familyChronicIllness: e.target.value })}
            placeholder="Yoksa 'Yok' yazın"
          />
          <Input
            label="Kullanılan ilaçlar"
            value={form.medicationUsed}
            onChange={(e) => onChange({ medicationUsed: e.target.value })}
            placeholder="Yoksa 'Yok' yazın"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Sigara</label>
              <Select
                value={form.smokingFrequency || undefined}
                onValueChange={(v) => onChange({ smokingFrequency: v as FrequencyValue })}
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
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Alkol</label>
              <Select
                value={form.alcoholFrequency || undefined}
                onValueChange={(v) => onChange({ alcoholFrequency: v as FrequencyValue })}
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
            </div>
            <Input
              label="Alkol türü"
              value={form.alcoholType}
              onChange={(e) => onChange({ alcoholType: e.target.value })}
              placeholder="Opsiyonel"
            />
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="mt-4 space-y-3">
          <p className="form-section-title">Beslenme Anamnezi (Opsiyonel)</p>
          <p className="text-[12px] text-surface-500">
            Herhangi bir alan doldurulursa kaydedilir; eksik zorunlu alan varsa uyarı verilir.
          </p>
          <BeslenmeAnamneziFormFields form={form} onChange={onChange} />
        </TabsContent>

        <TabsContent value="ipaq" className="mt-4 space-y-3">
          <p className="form-section-title">IPAQ — Fiziksel Aktivite (Opsiyonel)</p>
          <IpaqFormFields form={ipaqForm} onChange={onIpaqChange} />
        </TabsContent>

        <TabsContent value="ffq" className="mt-4 space-y-3">
          <p className="form-section-title">Besin Tüketim Sıklığı (Opsiyonel)</p>
          <FoodFrequencyFormFields
            items={ffqItems}
            notes={ffqNotes}
            onItemsChange={onFfqItemsChange}
            onNotesChange={onFfqNotesChange}
            filledCount={ffqFilledCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
