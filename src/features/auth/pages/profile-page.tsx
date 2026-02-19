import { useNavigate, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@/stores/auth.store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button, Avatar, Badge } from '@/components/ui'
import { USER_ROLE_LABELS } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Mail, Shield, Calendar, Edit2, User } from 'lucide-react'
import toast from 'react-hot-toast'

function getBasePath(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin'
  if (pathname.startsWith('/dietitian')) return '/dietitian'
  if (pathname.startsWith('/lab')) return '/lab'
  if (pathname.startsWith('/specialist')) return '/specialist'
  if (pathname.startsWith('/danisan')) return '/danisan'
  return '/'
}

export function ProfilePage() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = getBasePath(location.pathname)

  if (!user) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </Button>
        }
      />

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
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-50">
                <User className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Durum</p>
                  <p className="text-sm font-medium text-surface-800">Aktif</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-surface-100">
            <Button variant="outline" size="sm" onClick={() => toast.success('Profil duzenleme modu acildi')}>
              <Edit2 className="h-3.5 w-3.5" /> Bilgileri Duzenle
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
