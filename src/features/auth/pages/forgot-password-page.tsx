import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { ROUTES } from '@/utils/routes'
import { TreePine, Phone, Lock, Eye, EyeOff, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { forgotPassword, resetPassword } from '@/services/auth.service'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin'),
})

const resetSchema = z.object({
  code: z.string().min(4, 'Kod en az 4 karakter olmalı'),
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  rePassword: z.string(),
}).refine((d) => d.newPassword === d.rePassword, { message: 'Şifreler eşleşmiyor', path: ['rePassword'] })

type PhoneForm = z.infer<typeof phoneSchema>
type ResetForm = z.infer<typeof resetSchema>

type Step = 'phone' | 'reset'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) })
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  const onPhoneSubmit = async (data: PhoneForm) => {
    setLoading(true)
    try {
      await forgotPassword(data.phone)
      setPhone(data.phone)
      setStep('reset')
      toast.success('SMS kodu telefonunuza gönderildi.')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, { fallback: 'Kod gönderilemedi. Telefon numaranızı kontrol edin.' }))
    } finally {
      setLoading(false)
    }
  }

  const onResetSubmit = async (data: ResetForm) => {
    setLoading(true)
    try {
      await resetPassword(phone, data.code, data.newPassword, data.rePassword)
      toast.success('Şifreniz güncellendi. Giriş yapabilirsiniz.')
      navigate(ROUTES.GIRIS)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, { fallback: 'Şifre sıfırlanamadı. Kodu kontrol edip tekrar deneyin.' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary-500">
          <TreePine className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-surface-900">OmegaTree</h1>
          <p className="text-[11px] text-surface-400">Şifre Sıfırlama</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900">
          {step === 'phone' ? 'Şifremi Unuttum' : 'Şifre Değiştir'}
        </h2>
        <p className="text-surface-500 mt-1.5 text-[15px]">
          {step === 'phone'
            ? 'Kayıtlı telefon numaranızı girin, size SMS ile kod gönderelim.'
            : 'SMS ile gelen kodu ve yeni şifrenizi girin.'}
        </p>
      </div>

      {step === 'phone' && (
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
          <Input
            label="Telefon"
            type="tel"
            placeholder="05XX XXX XX XX"
            leftIcon={<Phone className="h-4 w-4" />}
            error={phoneForm.formState.errors.phone?.message}
            {...phoneForm.register('phone')}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Kod Gönder
          </Button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
          <Input
            label="SMS Kodu"
            type="text"
            placeholder="Örn: 123456"
            leftIcon={<Mail className="h-4 w-4" />}
            error={resetForm.formState.errors.code?.message}
            {...resetForm.register('code')}
          />
          <Input
            label="Yeni Şifre"
            type={showPassword ? 'text' : 'password'}
            placeholder="En az 8 karakter"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-surface-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={resetForm.formState.errors.newPassword?.message}
            {...resetForm.register('newPassword')}
          />
          <Input
            label="Şifre Tekrar"
            type="password"
            placeholder="Şifrenizi tekrar girin"
            leftIcon={<Lock className="h-4 w-4" />}
            error={resetForm.formState.errors.rePassword?.message}
            {...resetForm.register('rePassword')}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Şifreyi Sıfırla
          </Button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Numara değiştir
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-surface-500">
        <Link to={ROUTES.GIRIS} className="font-semibold text-primary-600 hover:text-primary-700">
          ← Giriş sayfasına dön
        </Link>
      </p>
    </div>
  )
}
