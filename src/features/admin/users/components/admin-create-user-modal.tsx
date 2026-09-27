import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { PhoneInput } from '@/components/shared/phone-input'
import { USER_ROLE_LABELS, UserRole } from '@/utils/constants'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { getDieticians } from '@/services/kits.service'
import { invalidateAdminSidebarCounts } from '@/lib/admin-sidebar-counts'
import { createAdminUserByRole } from '@/features/admin/users/admin-create-user.api'
import {
  ADMIN_CREATABLE_ROLES,
  emptyAdminCreateUserForm,
  roleUsesCompanyName,
  type AdminCreateUserForm,
} from '@/features/admin/users/admin-create-user.types'
import { AdminCreateUserLaboratorySection } from '@/features/admin/users/components/admin-create-user-laboratory-section'
import { AdminCreateUserDanisanSection } from '@/features/admin/users/components/admin-create-user-danisan-section'
import { EMPTY_IPAQ_FORM } from '@/features/shared/ipaq-form.utils'
import { buildEmptyFfqItems } from '@/features/shared/food-frequency-form.utils'
import type { FoodFrequencyFormState } from '@/features/shared/food-frequency-form.utils'
import type { IpaqFormState } from '@/features/shared/ipaq-form.utils'

const USERS_QUERY_KEY = ['users'] as const
const DIETICIAN_NONE_VALUE = '__none__'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRole?: UserRole
}

export function AdminCreateUserModal({ open, onOpenChange, initialRole }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AdminCreateUserForm>(() => emptyAdminCreateUserForm(initialRole))
  const [labProvinceId, setLabProvinceId] = useState<number | null>(null)
  const [danisanIpaq, setDanisanIpaq] = useState<IpaqFormState>(EMPTY_IPAQ_FORM)
  const [danisanFfqItems, setDanisanFfqItems] = useState<FoodFrequencyFormState>(() => buildEmptyFfqItems())
  const [danisanFfqNotes, setDanisanFfqNotes] = useState('')

  const danisanExtras = useMemo(
    () => ({
      ipaqForm: danisanIpaq,
      ffqItems: danisanFfqItems,
      ffqNotes: danisanFfqNotes,
    }),
    [danisanIpaq, danisanFfqItems, danisanFfqNotes],
  )

  useEffect(() => {
    if (!open) return
    setForm(emptyAdminCreateUserForm(initialRole ?? UserRole.ADMIN))
    setLabProvinceId(null)
    setDanisanIpaq(EMPTY_IPAQ_FORM)
    setDanisanFfqItems(buildEmptyFfqItems())
    setDanisanFfqNotes('')
  }, [open, initialRole])

  const { data: dieticianOptions = [], isLoading: dieticiansLoading } = useQuery({
    queryKey: ['admin', 'dieticians', 'options'],
    queryFn: () => getDieticians(),
    enabled: open && form.role === UserRole.DANISAN,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminUserByRole(form, form.role === UserRole.DANISAN ? danisanExtras : undefined),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['dieticians'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['laboratories'] })
      queryClient.invalidateQueries({ queryKey: ['experts'] })
      invalidateAdminSidebarCounts(queryClient)
      onOpenChange(false)
      toast.success('Kullanıcı oluşturuldu')
      result?.followUpErrors?.forEach((msg) => toast.error(msg))
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kullanıcı oluşturulamadı' }))
    },
  })

  const patch = (p: Partial<AdminCreateUserForm>) => setForm((s) => ({ ...s, ...p }))

  const handleRoleChange = (role: UserRole) => {
    setForm(emptyAdminCreateUserForm(role))
    setLabProvinceId(null)
    setDanisanIpaq(EMPTY_IPAQ_FORM)
    setDanisanFfqItems(buildEmptyFfqItems())
    setDanisanFfqNotes('')
  }

  const submitLabel =
    form.role === UserRole.LAB
      ? 'Laboratuvar Oluştur'
      : form.role === UserRole.DANISAN
        ? 'Danışan Oluştur'
        : form.role === UserRole.DIETITIAN
          ? 'Diyetisyen Oluştur'
          : form.role === UserRole.SPECIALIST
            ? 'Uzman Oluştur'
            : 'Kullanıcı Oluştur'

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl w-[calc(100vw-1.5rem)] sm:w-full">
        <ModalHeader>
          <ModalTitle>Yeni Kullanıcı Ekle</ModalTitle>
          <ModalDescription>
            Rol seçin ve ilgili alanları doldurun. Şifre kullanıcıya SMS ile iletilir.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-surface-700">Rol *</label>
            <Select value={form.role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_CREATABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="form-section-title">Kişisel Bilgiler</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ad *"
              filter="personName"
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              placeholder="Ad"
            />
            <Input
              label="Soyad *"
              filter="personName"
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              placeholder="Soyad"
            />
          </div>
          <PhoneInput
            label="Telefon *"
            value={form.phone}
            countryDialCode={form.countryDialCode}
            onValueChange={(phone) => patch({ phone })}
            onCountryChange={(countryDialCode) => patch({ countryDialCode })}
          />
          <Input
            label="E-posta"
            type="email"
            value={form.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="ornek@email.com"
            hint="Boş bırakılabilir."
          />
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-surface-700">Cinsiyet *</label>
            <Select value={form.gender} onValueChange={(v) => patch({ gender: v as 'male' | 'female' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Erkek</SelectItem>
                <SelectItem value="female">Kadın</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {roleUsesCompanyName(form.role) && (
            <Input
              label={form.role === UserRole.LAB ? 'Kurum Adı *' : 'Kurum Adı'}
              value={form.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
              placeholder={form.role === UserRole.LAB ? 'Laboratuvar adı' : 'Kurum adı'}
              hint={form.role === UserRole.LAB ? undefined : 'Opsiyonel'}
            />
          )}

          {form.role === UserRole.DIETITIAN && (
            <Input
              label="VKN"
              filter="digits"
              value={form.vkn}
              onChange={(e) => patch({ vkn: e.target.value })}
              placeholder="Vergi kimlik numarası (opsiyonel)"
            />
          )}

          {form.role === UserRole.DANISAN && (
            <>
              <Input
                label="T.C. Kimlik No"
                filter="nationalId"
                value={form.identityNumber}
                onChange={(e) => patch({ identityNumber: e.target.value })}
                placeholder="Opsiyonel"
              />
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-surface-700">Diyetisyen (Opsiyonel)</label>
                <Select
                  value={form.dieticianId || DIETICIAN_NONE_VALUE}
                  onValueChange={(v) => patch({ dieticianId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dieticiansLoading ? 'Yükleniyor...' : 'Seçin...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DIETICIAN_NONE_VALUE}>Seçilmedi</SelectItem>
                    {dieticianOptions.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AdminCreateUserDanisanSection
                form={form}
                onChange={patch}
                ipaqForm={danisanIpaq}
                onIpaqChange={setDanisanIpaq}
                ffqItems={danisanFfqItems}
                ffqNotes={danisanFfqNotes}
                onFfqItemsChange={setDanisanFfqItems}
                onFfqNotesChange={setDanisanFfqNotes}
              />
            </>
          )}

          {form.role === UserRole.LAB && (
            <AdminCreateUserLaboratorySection
              form={form}
              onChange={patch}
              selectedProvinceId={labProvinceId}
              onProvinceChange={(id, cityName) => {
                setLabProvinceId(id)
                patch({ city: cityName, district: '' })
              }}
              enabled={open}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>
            İptal
          </Button>
          <Button
            variant="primary"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            loading={createMutation.isPending}
          >
            {submitLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
