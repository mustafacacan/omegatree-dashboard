import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { ROLE_HOME } from '@/utils/routes'
import { Shield, TreePine } from 'lucide-react'
import { toast } from 'sonner'

export function KvkkConsentPage() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuthStore()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    if (!accepted || !user) return
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      updateUser({ kvkkConsentDate: new Date().toISOString() })
      toast.success('KVKK onayi kaydedildi')
      navigate(ROLE_HOME[user.role])
    } catch {
      toast.error('Bir hata olustu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-card p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600">
            <TreePine className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900">OmegaTree</h1>
            <p className="text-sm text-surface-500">Kisisel Verilerin Korunmasi</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100 mb-6">
          <Shield className="h-5 w-5 text-primary-600 shrink-0" />
          <p className="text-sm text-primary-700">
            Sistemi kullanmaya baslamadan once asagidaki aydinlatma metnini okumaniz ve onaylamaniz gerekmektedir.
          </p>
        </div>

        <div className="h-80 overflow-y-auto rounded-xl border border-surface-200 p-6 mb-6 text-sm text-surface-600 leading-relaxed space-y-4">
          <h3 className="font-semibold text-surface-900 text-base">KVKK Aydinlatma Metni</h3>
          <p>
            OmegaTree Kit Takip Sistemi olarak, 6698 sayili Kisisel Verilerin Korunmasi Kanunu
            (&ldquo;KVKK&rdquo;) kapsaminda kisisel verilerinizin guvenligine onem vermekteyiz.
          </p>
          <h4 className="font-semibold text-surface-800">1. Veri Sorumlusu</h4>
          <p>OmegaTree Saglik Teknolojileri A.S. veri sorumlusu sifatiyla kisisel verilerinizi islemektedir.</p>
          <h4 className="font-semibold text-surface-800">2. Islenen Kisisel Veriler</h4>
          <p>Kimlik bilgileri (ad, soyad), iletisim bilgileri (e-posta, telefon), mesleki bilgiler ve sistem kullanim verileri.</p>
          <h4 className="font-semibold text-surface-800">3. Isleme Amaci</h4>
          <p>Kisisel verileriniz; hizmet sunumu, kit takibi, analiz sureci yonetimi ve yasal yukumluluklerin yerine getirilmesi amaciyla islenmektedir.</p>
          <h4 className="font-semibold text-surface-800">4. Veri Guvenligi</h4>
          <p>Verileriniz SSL sifreleme, erisim kontrolu ve duzgun denetim mekanizmalari ile korunmaktadir.</p>
          <h4 className="font-semibold text-surface-800">5. Haklariniz</h4>
          <p>KVKK&apos;nin 11. maddesi kapsaminda; verilerinize erisim, duzeltme, silme ve islemeye itiraz hakkiniz bulunmaktadir.</p>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <Checkbox
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            label="KVKK Aydinlatma Metnini okudum ve kabul ediyorum."
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={logout}
            className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
          >
            Cikis Yap
          </button>
          <Button
            variant="gradient"
            size="lg"
            disabled={!accepted}
            loading={loading}
            onClick={handleAccept}
          >
            Onayla ve Devam Et
          </Button>
        </div>
      </div>
    </div>
  )
}
