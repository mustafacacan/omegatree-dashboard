import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { ROLE_HOME, ROUTES } from '@/utils/routes'
import { TreePine, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { login as apiLogin } from '@/services/auth.service'

const loginSchema = z.object({
  loginKey: z
    .string()
    .min(1, 'E-posta veya telefon girin')
    .transform((v) => v.trim())
    .refine((v) => {
      if (!v) return false
      // Email
      if (v.includes('@')) return z.string().email().safeParse(v).success
      // Phone (digits, spaces, +, parentheses, dashes allowed)
      const digits = v.replace(/[^\d]/g, '')
      return digits.length >= 10
    }, 'Gecerli bir e-posta veya telefon girin'),
  password: z.string().min(6, 'Sifre en az 6 karakter olmali'),
  rememberMe: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const key = 'omegatree-auth-expired'
      const flagged = window.sessionStorage?.getItem(key)
      if (flagged) {
        window.sessionStorage?.removeItem(key)
        toast.error('Oturum süreniz doldu. Lütfen tekrar giriş yapınız.')
      }
    } catch {
      // ignore
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const { user, token } = await apiLogin(data.loginKey, data.password, Boolean(data.rememberMe))
      setAuth(user, token)
      const displayName = `${user.firstName} ${user.lastName}`.trim()
      toast.success(`Hoş geldiniz, ${displayName}!`)
      navigate(ROLE_HOME[user.role])
    } catch (err: unknown) {
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined

      if (status === 401) {
        toast.error('Geçersiz e-posta/telefon veya şifre. Hesap onay bekliyor olabilir.')
      } else {
        toast.error(
          getApiErrorMessage(err, {
            fallback: 'Giriş yapılamadı. API bağlantısını ve bilgilerinizi kontrol edin.',
          })
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Mobile logo */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary-500">
          <TreePine className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-surface-900">OmegaTree</h1>
          <p className="text-[11px] text-surface-400">Kit Takip Sistemi</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-surface-900">Kullanici Girisi</h2>
        <p className="text-surface-500 mt-1.5 text-[15px]">
          Hesabiniza erisim icin e-posta/telefon ve sifrenizi girin
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="E-posta veya Telefon"
          type="text"
          placeholder="ornek@omegatree.com veya 05xx xxx xx xx"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.loginKey?.message}
          {...register('loginKey')}
        />

        <Input
          label="Sifre"
          type={showPassword ? 'text' : 'password'}
          placeholder="Sifrenizi girin"
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
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              {...register('rememberMe')}
            />
            <span className="text-sm text-surface-600">Beni hatirla</span>
          </label>
          <Link
            to={ROUTES.SIFREMI_UNUTTUM}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Şifremi Unuttum
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Giris Yap
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-surface-500">
        Hesabiniz yok mu?{' '}
        <Link to={ROUTES.KAYIT} className="font-semibold text-primary-600 hover:text-primary-700">
          Kayit Olun
        </Link>
      </p>
    </div>
  )
}
