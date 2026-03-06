import { useEffect, useState } from 'react'
import { useCurrentUser, useAuthStore } from '@/stores/auth.store'
import { getProfile, changePassword } from '@/services/auth.service'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button, Avatar, Badge, Input } from '@/components/ui'
import { USER_ROLE_LABELS } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { Mail, Shield, Calendar, Edit2, User, Lock, Phone } from 'lucide-react'
import { toast } from 'sonner'

export function ProfilePage() {
  const user = useCurrentUser()
  const updateUser = useAuthStore((s) => s.updateUser)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
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
  }, [])

  if (!user) return null

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
      setShowPasswordForm(false)
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

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-4 shrink-0">
              <Avatar
                name={`${user.firstName} ${user.lastName}`}
                src={user.avatarUrl}
                size="xl"
              />
              <div>
                <h2 className="text-lg font-semibold text-surface-900">
                  {user.firstName} {user.lastName}
                </h2>
                <Badge variant="primary" size="sm" className="mt-1">
                  {USER_ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <Mail className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">E-posta</p>
                  <p className="text-sm font-medium text-surface-800">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <Phone className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Telefon</p>
                  <p className="text-sm font-medium text-surface-800">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <Shield className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Rol</p>
                  <p className="text-sm font-medium text-surface-800">{USER_ROLE_LABELS[user.role]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <Calendar className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Kayit Tarihi</p>
                  <p className="text-sm font-medium text-surface-800">{user.createdAt ? formatDate(user.createdAt) : '—'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-100 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success('Profil duzenleme modu acildi')}>
              <Edit2 className="h-3.5 w-3.5" /> Bilgileri Duzenle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              <Lock className="h-3.5 w-3.5" /> Sifre Degistir
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPasswordForm && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-semibold text-surface-900">Şifre Değiştir</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Mevcut Şifre"
                type="password"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                label="Yeni Şifre"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Yeni Şifre (Tekrar)"
                type="password"
                placeholder="••••••••"
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPasswordForm(false)
                  setOldPassword('')
                  setNewPassword('')
                  setRePassword('')
                }}
              >
                İptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={changingPassword}
                onClick={handleChangePassword}
              >
                Şifreyi Değiştir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
