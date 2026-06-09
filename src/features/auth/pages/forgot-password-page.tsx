import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { ROUTES } from '@/utils/routes'
import { TreePine, Phone, Lock, Eye, EyeOff, ArrowLeft, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { forgotPassword, resetPassword, validateResetToken } from '@/services/auth.service'

const phoneSchema = z.object({
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin'),
})

const resetSchema = z.object({
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  rePassword: z.string(),
}).refine((d) => d.newPassword === d.rePassword, { message: 'Şifreler eşleşmiyor', path: ['rePassword'] })

type PhoneForm = z.infer<typeof phoneSchema>
type ResetForm = z.infer<typeof resetSchema>

type Step = 'phone' | 'sent' | 'reset' | 'invalid'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')?.trim() ?? ''

  const [step, setStep] = useState<Step>(tokenFromUrl ? 'reset' : 'phone')
  const [resetToken, setResetToken] = useState(tokenFromUrl)
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(Boolean(tokenFromUrl))
  const [showPassword, setShowPassword] = useState(false)

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) })
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  useEffect(() => {
    if (!tokenFromUrl) return

    let cancelled = false

    const verify = async () => {
      setValidatingToken(true)
      try {
        await validateResetToken(tokenFromUrl)
        if (!cancelled) {
          setResetToken(tokenFromUrl)
          setStep('reset')
        }
      } catch {
        if (!cancelled) {
          setStep('invalid')
        }
      } finally {
        if (!cancelled) {
          setValidatingToken(false)
        }
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [tokenFromUrl])

  const onPhoneSubmit = async (data: PhoneForm) => {
    setLoading(true)
    try {
      await forgotPassword(data.phone)
      setStep('sent')
      toast.success('Şifre sıfırlama bağlantısı SMS ile gönderildi.')
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, { fallback: 'İşlem tamamlanamadı. Telefon numaranızı kontrol edin.' }))
    } finally {
      setLoading(false)
    }
  }

  const onResetSubmit = async (data: ResetForm) => {
    if (!resetToken) {
      toast.error('Geçersiz sıfırlama bağlantısı.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(resetToken, data.newPassword, data.rePassword)
      toast.success('Şifreniz güncellendi. Giriş yapabilirsiniz.')
      navigate(ROUTES.GIRIS)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, { fallback: 'Şifre sıfırlanamadı. Bağlantının süresi dolmuş olabilir.' }))
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm text-surface-600">Sıfırlama bağlantısı doğrulanıyor...</p>
      </div>
    )
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
          {step === 'phone' && 'Şifremi Unuttum'}
          {step === 'sent' && 'SMS Gönderildi'}
          {step === 'reset' && 'Yeni Şifre Belirle'}
          {step === 'invalid' && 'Bağlantı Geçersiz'}
        </h2>
        <p className="text-surface-500 mt-1.5 text-[15px]">
          {step === 'phone' && 'Kayıtlı telefon numaranızı girin. Size şifre sıfırlama bağlantısı SMS ile gönderilecek.'}
          {step === 'sent' && 'Telefonunuza gelen bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz.'}
          {step === 'reset' && 'Yeni şifrenizi girin ve kaydedin.'}
          {step === 'invalid' && 'Bu bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden talep edin.'}
        </p>
      </div>

      {step === 'phone' && (
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
          <Input
            label="Telefon"
            placeholder="05XX XXX XX XX"
            leftIcon={<Phone className="h-4 w-4" />}
            filter="phone"
            error={phoneForm.formState.errors.phone?.message}
            {...phoneForm.register('phone')}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Sıfırlama Bağlantısı Gönder
          </Button>
        </form>
      )}

      {step === 'sent' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-primary-200 bg-primary-50/60 dark:bg-primary-900/20 dark:border-primary-800 p-4 flex gap-3">
            <Link2 className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
            <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
              Kayıtlı numaranıza şifre sıfırlama linki gönderildi. SMS&apos;teki bağlantıya tıklayın; açılan sayfada yeni şifrenizi belirleyin.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setStep('phone')}
          >
            <ArrowLeft className="h-4 w-4" />
            Başka numara dene
          </Button>
        </div>
      )}

      {step === 'reset' && (
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
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
        </form>
      )}

      {step === 'invalid' && (
        <div className="space-y-4">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              setResetToken('')
              setStep('phone')
              navigate(ROUTES.SIFREMI_UNUTTUM, { replace: true })
            }}
          >
            Yeni bağlantı iste
          </Button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-surface-500">
        <Link to={ROUTES.GIRIS} className="font-semibold text-primary-600 hover:text-primary-700">
          ← Giriş sayfasına dön
        </Link>
      </p>
    </div>
  )
}
