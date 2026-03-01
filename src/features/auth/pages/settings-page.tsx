import { useNavigate, useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Switch } from '@/components/ui'
import { getBasePath } from '@/utils/routes'
import { ArrowLeft, Bell, Moon, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = getBasePath(location.pathname)

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
