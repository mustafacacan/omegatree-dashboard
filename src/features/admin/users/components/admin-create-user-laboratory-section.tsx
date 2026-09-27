import { useQuery } from '@tanstack/react-query'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { getDistricts, getProvinces } from '@/services/turkey-addresses.service'
import type { AdminCreateUserForm } from '@/features/admin/users/admin-create-user.types'

type Props = {
  form: AdminCreateUserForm
  onChange: (patch: Partial<AdminCreateUserForm>) => void
  selectedProvinceId: number | null
  onProvinceChange: (id: number | null, cityName: string) => void
  enabled: boolean
}

export function AdminCreateUserLaboratorySection({
  form,
  onChange,
  selectedProvinceId,
  onProvinceChange,
  enabled,
}: Props) {
  const { data: provinces = [] } = useQuery({
    queryKey: ['turkey', 'provinces'],
    queryFn: getProvinces,
    enabled,
  })
  const { data: districts = [], isLoading: districtsLoading } = useQuery({
    queryKey: ['turkey', 'districts', selectedProvinceId],
    queryFn: () => getDistricts(selectedProvinceId!),
    enabled: enabled && selectedProvinceId != null,
  })

  return (
    <>
      <div className="panel-section">
        <p className="form-section-title">Kargo Bilgileri</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Kargo Firması *"
            value={form.cargofirm}
            onChange={(e) => onChange({ cargofirm: e.target.value })}
            placeholder="Örn: Yurtiçi Kargo"
          />
          <Input
            label="Kargo Numarası *"
            value={form.cargoNumber}
            onChange={(e) => onChange({ cargoNumber: e.target.value })}
            placeholder="Anlaşma numarası"
          />
        </div>
      </div>

      <div className="panel-section">
        <p className="form-section-title">Adres Bilgileri</p>
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={selectedProvinceId != null ? String(selectedProvinceId) : ''}
            onValueChange={(v) => {
              const id = v ? Number(v) : null
              const province = id ? provinces.find((p) => p.id === id) : null
              onProvinceChange(id, province?.name ?? '')
            }}
          >
            <SelectTrigger label="Şehir *" className="w-full">
              <SelectValue placeholder="İl seçin" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.district}
            onValueChange={(v) => onChange({ district: v })}
            disabled={!selectedProvinceId || districtsLoading}
          >
            <SelectTrigger label="İlçe *" className="w-full">
              <SelectValue
                placeholder={
                  districtsLoading ? 'Yükleniyor...' : selectedProvinceId ? 'İlçe seçin' : 'Önce il seçin'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {districts.map((d) => (
                <SelectItem key={d.id} value={d.name}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Input
            label="Mahalle"
            value={form.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            placeholder="Mahalle"
          />
          <Input
            label="Sokak"
            value={form.street}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="Sokak adı"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Input
            label="Kapı No"
            value={form.no}
            onChange={(e) => onChange({ no: e.target.value })}
            placeholder="Örn: 10"
          />
          <Input
            label="Posta Kodu"
            value={form.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            placeholder="Opsiyonel"
          />
          <Input
            label="Ülke"
            value={form.country}
            onChange={(e) => onChange({ country: e.target.value })}
            placeholder="Turkiye"
          />
        </div>
        <div className="mt-3">
          <Input
            label="Açık Adres"
            value={form.fullAddress}
            onChange={(e) => onChange({ fullAddress: e.target.value })}
            placeholder="Tam adres (opsiyonel)"
          />
        </div>
      </div>
    </>
  )
}
