import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Switch } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import { Bell, Moon, Shield, MapPin, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentRole } from '@/stores/auth.store'
import { UserRole } from '@/utils/constants'
import {
  getAddresses,
  createAddress,
  updateAddress,
  getAddressLabel,
  getAddressFullLine,
  type Address,
} from '@/services/addresses.service'
import { getProvinces, getDistricts } from '@/services/turkey-addresses.service'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui'

const ADDRESSES_QUERY_KEY = ['addresses'] as const
const TITLE_OPTIONS = [
  { value: 'home', label: 'Ev' },
  { value: 'work', label: 'İş' },
  { value: 'other', label: 'Diğer' },
] as const

const PROVINCES_QUERY_KEY = ['turkey-provinces'] as const

function DietitianAddressesCard() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: 'work' as 'home' | 'work' | 'other',
    country: 'Türkiye',
    city: '',
    district: '',
    street: '',
    neighborhood: '',
    no: '',
    postalCode: '',
  })

  const { data: provinces = [] } = useQuery({
    queryKey: PROVINCES_QUERY_KEY,
    queryFn: getProvinces,
    enabled: modalOpen,
    staleTime: 1000 * 60 * 60,
  })

  const { data: districts = [] } = useQuery({
    queryKey: ['turkey-districts', selectedProvinceId],
    queryFn: () => getDistricts(selectedProvinceId!),
    enabled: modalOpen && selectedProvinceId != null,
    staleTime: 1000 * 60 * 60,
  })

  useEffect(() => {
    if (!modalOpen || !form.city || provinces.length === 0) return
    const p = provinces.find((pr) => pr.name === form.city)
    if (p && selectedProvinceId === null) setSelectedProvinceId(p.id)
  }, [modalOpen, form.city, provinces, selectedProvinceId])

  const { data: addresses = [], isLoading, isError } = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAddresses,
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY })
      toast.success('Adres eklendi.')
      setModalOpen(false)
      resetForm()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Adres eklenemedi.' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateAddress>[1] }) =>
      updateAddress(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY })
      toast.success('Adres güncellendi.')
      setModalOpen(false)
      setEditing(null)
      resetForm()
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Adres güncellenemedi.' }))
    },
  })

  const resetForm = () => {
    setSelectedProvinceId(null)
    setForm({
      title: 'work',
      country: 'Türkiye',
      city: '',
      district: '',
      street: '',
      neighborhood: '',
      no: '',
      postalCode: '',
    })
  }

  const openAdd = () => {
    setEditing(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (a: Address) => {
    setEditing(a)
    setSelectedProvinceId(null)
    setForm({
      title: a.title ?? 'work',
      country: a.country ?? 'Türkiye',
      city: a.city ?? '',
      district: a.district ?? '',
      street: a.street ?? '',
      neighborhood: a.neighborhood ?? '',
      no: (a as Address & { no?: string }).no ?? '',
      postalCode: a.postalCode ?? '',
    })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (!form.street?.trim() || !form.city?.trim() || !form.district?.trim()) {
      toast.error('Sokak, şehir ve ilçe zorunludur.')
      return
    }
    const fullAddress = [
      form.street.trim(),
      form.no.trim() ? `No: ${form.no.trim()}` : null,
      form.neighborhood.trim(),
      form.district.trim(),
      form.city.trim(),
      form.country.trim(),
    ]
      .filter(Boolean)
      .join(', ')

    const body = {
      title: form.title,
      country: form.country,
      city: form.city.trim(),
      district: form.district.trim(),
      street: form.street.trim(),
      neighborhood: form.neighborhood.trim(),
      postalCode: form.postalCode.trim(),
      ...(form.no.trim() && { no: form.no.trim() }),
      fullAddress: fullAddress || undefined,
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, body })
    } else {
      createMutation.mutate(body)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-500" /> Teslimat adresleri
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Yeni adres
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-500 mb-4">
            Sipariş verirken seçebileceğiniz adresleri buradan ekleyin veya düzenleyin.
          </p>
          {isLoading ? (
            <p className="text-sm text-surface-500">Yükleniyor...</p>
          ) : isError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Adreslere şu an erişilemiyor. Lütfen daha sonra tekrar deneyin veya destek ile iletişime geçin.
            </div>
          ) : addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-surface-200 p-6 text-center text-sm text-surface-500">
              Henüz adres eklenmedi. Sipariş verebilmek için en az bir adres ekleyin.
            </div>
          ) : (
            <ul className="space-y-3">
              {addresses.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 border border-surface-100"
                >
                  <div>
                    <p className="font-medium text-surface-800">{getAddressLabel(a)}</p>
                    <p className="text-sm text-surface-500">{getAddressFullLine(a)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent className="flex flex-col max-h-[90vh] overflow-hidden p-0">
          <ModalHeader className="flex-shrink-0">
            <ModalTitle>{editing ? 'Adresi düzenle' : 'Yeni adres ekle'}</ModalTitle>
            <ModalDescription>
              Teslimat için kullanılacak adres bilgilerini girin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="flex-1 min-h-0 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Etiket</label>
              <Select
                value={form.title}
                onValueChange={(v) => setForm((f) => ({ ...f, title: v as 'home' | 'work' | 'other' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Etiket seçin" />
                </SelectTrigger>
                <SelectContent>
                  {TITLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Ülke"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">İl</label>
              <Select
                value={selectedProvinceId != null ? String(selectedProvinceId) : ''}
                onValueChange={(v) => {
                  const id = Number(v)
                  if (Number.isNaN(id)) return
                  setSelectedProvinceId(id)
                  const prov = provinces.find((p) => p.id === id)
                  setForm((f) => ({ ...f, city: prov?.name ?? '', district: '' }))
                }}
              >
                <SelectTrigger className="w-full">
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
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">İlçe</label>
              <Select
                value={form.district}
                onValueChange={(v) => setForm((f) => ({ ...f, district: v }))}
                disabled={!selectedProvinceId || districts.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedProvinceId ? 'İlçe seçin' : 'Önce il seçin'} />
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
            <Input
              label="Mahalle"
              value={form.neighborhood}
              onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
              placeholder="Moda"
            />
            <Input
              label="Sokak / Adres"
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              placeholder="Atatürk Sokak"
            />
            <Input
              label="Kapı no"
              value={form.no}
              onChange={(e) => setForm((f) => ({ ...f, no: e.target.value }))}
              placeholder="10"
            />
            <Input
              label="Posta kodu"
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              placeholder="34710"
            />
            {(() => {
              const preview = [
                form.street.trim(),
                form.no.trim() ? `No: ${form.no.trim()}` : null,
                form.neighborhood.trim(),
                form.district.trim(),
                form.city.trim(),
                form.country.trim(),
              ]
                .filter(Boolean)
                .join(', ')
              if (!preview) return null
              return (
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                  <p className="text-xs font-medium text-surface-500 mb-1">Tam adres (fullAddress)</p>
                  <p className="text-sm text-surface-800">{preview}</p>
                </div>
              )
            })()}
          </ModalBody>
          <ModalFooter className="flex-shrink-0 border-t border-surface-200 bg-surface-50/50">
            <Button variant="outline" onClick={() => setModalOpen(false)}>İptal</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Güncelle' : 'Ekle'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export function SettingsPage() {
  const role = useCurrentRole()
  const isDietitian = role === UserRole.DIETITIAN

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      {isDietitian && <DietitianAddressesCard />}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary-500" /> Bildirimler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50">
            <div>
              <p className="text-sm font-medium text-surface-800">E-posta bildirimleri</p>
              <p className="text-xs text-surface-500">Kit durumu ve rapor bildirimleri</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50">
            <div>
              <p className="text-sm font-medium text-surface-800">SMS bildirimleri</p>
              <p className="text-xs text-surface-500">Kritik durum uyarilari</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary-500" /> Görünüm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50">
            <div>
              <p className="text-sm font-medium text-surface-800">Koyu mod</p>
              <p className="text-xs text-surface-500">Tema tercihi (yakinda)</p>
            </div>
            <Switch disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary-500" /> Guvenlik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Mevcut sifre" type="password" placeholder="••••••••" />
          <Input label="Yeni sifre" type="password" placeholder="••••••••" />
          <Input label="Yeni sifre (tekrar)" type="password" placeholder="••••••••" />
          <Button variant="primary" size="sm" onClick={() => toast.success('Sifre basariyla guncellendi')}>Sifreyi Guncelle</Button>
        </CardContent>
      </Card>
    </div>
  )
}
