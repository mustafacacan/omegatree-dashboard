import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser, useAuthStore } from '@/stores/auth.store'
import { getProfile, changePassword, updateProfile } from '@/services/auth.service'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button,
  Avatar,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui'
import { USER_ROLE_LABELS, UserRole as USER_ROLE } from '@/utils/constants'
import type { UserRole } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { Mail, Shield, Calendar, Edit2, Lock, Phone, User } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import type { components } from '@/types/openapi'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

function toDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function limitDigits(value: string, max: number): string {
  const digits = toDigits(value)
  return digits.length > max ? digits.slice(0, max) : digits
}

function validate11Digits(value: string): string | null {
  if (!value) return null
  if (value.length !== 11) return '11 haneli olmalidir'
  return null
}

export function ProfilePage() {
  const user = useCurrentUser()
  const updateUser = useAuthStore((s) => s.updateUser)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    email: '',
    identityNumber: '',
  })

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [rePassword, setRePassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    getProfile()
      .then((freshUser) => {
        updateUser(freshUser)
      })
      .catch(() => {})
  }, [updateUser])

  const updateProfileMutation = useMutation({
    mutationFn: async ({ payload, role }: { payload: components['schemas']['UpdateUser']; role: UserRole }) =>
      updateProfile(payload, role),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success('Profil bilgileri guncellendi')
      setEditModalOpen(false)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Profil guncellenemedi'
      toast.error(msg)
    },
  })

  const phoneError = useMemo(() => validate11Digits(editForm.phone), [editForm.phone])
  const identityError = useMemo(() => validate11Digits(editForm.identityNumber), [editForm.identityNumber])

  if (!user) return null

  const shouldShowCompanyName =
    user.role === USER_ROLE.DIETITIAN ||
    user.role === USER_ROLE.LAB ||
    user.role === USER_ROLE.SPECIALIST

  const openEditModal = () => {
    setEditForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      companyName: user.companyName ?? '',
      phone: limitDigits(user.phone ?? '', 11),
      email: user.email ?? '',
      identityNumber: limitDigits(user.identityNumber ?? '', 11),
    })
    setEditModalOpen(true)
  }

  const canSaveProfile =
    editForm.firstName.trim().length > 0 &&
    editForm.lastName.trim().length > 0 &&
    (editForm.phone.trim().length > 0 || editForm.email.trim().length > 0) &&
    phoneError == null &&
    identityError == null

  const submitProfileUpdate = () => {
    if (!canSaveProfile) {
      toast.error('Ad, soyad ve en az bir iletisim bilgisi girin')
      return
    }

    const payload: components['schemas']['UpdateUser'] = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      ...(shouldShowCompanyName ? { companyName: editForm.companyName.trim() || undefined } : {}),
      phone: editForm.phone.trim() || undefined,
      email: editForm.email.trim() || undefined,
      identityNumber: editForm.identityNumber.trim() || undefined,
    }

    updateProfileMutation.mutate({ payload, role: user.role })
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !rePassword) {
      toast.error('Tüm alanları doldurun')
      return
    }
    if (newPassword !== rePassword) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(oldPassword, newPassword, rePassword)
      toast.success('Şifre başarıyla değiştirildi')
      setOldPassword('')
      setNewPassword('')
      setRePassword('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şifre değiştirilemedi'
      toast.error(msg)
    } finally {
      setChangingPassword(false)
    }
  }

  const infoRows = [
    ...(shouldShowCompanyName
      ? [{ icon: User, label: 'Kurum Adı', value: user.companyName || '—' }]
      : []),
    { icon: Mail, label: 'E-posta', value: user.email },
    { icon: Phone, label: 'Telefon', value: user.phone || '—' },
    { icon: User, label: 'T.C. Kimlik No', value: user.identityNumber || '—' },
    { icon: Shield, label: 'Rol', value: USER_ROLE_LABELS[user.role] },
    { icon: Calendar, label: 'Kayıt tarihi', value: user.createdAt ? formatDate(user.createdAt) : '—' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      {/* İki kart: Profil bilgileri + Şifre değiştir (dashboard panel tarzı) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profil bilgileri paneli */}
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
          <div className="panel p-5">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-surface-200">
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                src={user.avatarUrl}
                size="xl"
              />
              <div>
                <h2 className="text-lg font-semibold text-surface-900">
                  {user.firstName} {user.lastName}
                </h2>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-primary-100 text-primary-700">
                  <User className="h-3.5 w-3.5" />
                  {USER_ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>
            <h3 className="text-card-title text-surface-800 mb-3">Hesap bilgileri</h3>
            <ul className="space-y-3">
              {infoRows.map((row) => {
                const Icon = row.icon
                return (
                  <li key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-200">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-surface-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider">{row.label}</p>
                      <p className="text-sm font-semibold text-surface-800 truncate">{row.value}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 pt-4 border-t border-surface-200">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={openEditModal}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Bilgileri düzenle
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Şifre değiştir - direkt form (dashboard panel) */}
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="panel p-5">
            <h3 className="text-card-title text-surface-800 flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-surface-500" />
              Şifre değiştir
            </h3>
            <p className="text-[12px] text-text-secondary mb-5">
              Mevcut şifrenizi girip yeni şifrenizi belirleyin.
            </p>
            <div className="space-y-4">
              <Input
                label="Mevcut şifre"
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                label="Yeni şifre"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Yeni şifre (tekrar)"
                type="password"
                placeholder="••••••••"
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOldPassword('')
                  setNewPassword('')
                  setRePassword('')
                }}
              >
                Temizle
              </Button>
              <Button variant="primary" size="sm" loading={changingPassword} onClick={handleChangePassword}>
                Şifreyi güncelle
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Profil düzenleme modali */}
      <Modal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!updateProfileMutation.isPending) setEditModalOpen(open)
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Profil bilgilerini duzenle</ModalTitle>
            <ModalDescription>
              Bilgilerinizi guncelleyip kaydedebilirsiniz.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Ad"
                filter="personName"
                value={editForm.firstName}
                onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
              />
              <Input
                label="Soyad"
                filter="personName"
                value={editForm.lastName}
                onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
              />
            </div>

            {shouldShowCompanyName ? (
              <Input
                label="Kurum Adı"
                value={editForm.companyName}
                onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="(opsiyonel)"
              />
            ) : null}

            <Input
              label="Telefon"
              filter="phone"
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="0555 555 55 55"
              maxLength={11}
              error={phoneError ?? undefined}
            />

            <Input
              label="E-posta"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="ornek@site.com"
            />

            <Input
              label="T.C. Kimlik No"
              filter="nationalId"
              value={editForm.identityNumber}
              onChange={(e) => setEditForm((p) => ({ ...p, identityNumber: e.target.value }))}
              placeholder="(opsiyonel)"
              error={identityError ?? undefined}
            />

            <Input
              label="Rol"
              value={USER_ROLE_LABELS[user.role]}
              disabled
            />
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updateProfileMutation.isPending}
            >
              Iptal
            </Button>
            <Button
              variant="primary"
              onClick={submitProfileUpdate}
              loading={updateProfileMutation.isPending}
              disabled={!canSaveProfile}
            >
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
