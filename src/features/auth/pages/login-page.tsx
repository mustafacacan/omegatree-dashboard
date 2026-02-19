import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole, UserStatus } from '@/utils/constants'
import { TreePine, Mail, Lock, Eye, EyeOff, Shield, FlaskConical, TestTubes, Stethoscope, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUsersStore } from '@/stores/users.store'
import type { User as AppUser } from '@/types/user.types'

const loginSchema = z.object({
  email: z.string().email('Gecerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Sifre en az 6 karakter olmali'),
})

type LoginForm = z.infer<typeof loginSchema>

const demoAccounts = [
  { email: 'admin@omegatree.com', password: 'demo123', role: UserRole.ADMIN, label: 'Admin', icon: Shield, color: 'bg-surface-800 text-white hover:bg-surface-700' },
  { email: 'diyetisyen@omegatree.com', password: 'demo123', role: UserRole.DIETITIAN, label: 'Diyetisyen', icon: Stethoscope, color: 'bg-primary-500 text-white hover:bg-primary-600' },
  { email: 'lab@omegatree.com', password: 'demo123', role: UserRole.LAB, label: 'Laboratuvar', icon: TestTubes, color: 'bg-amber-600 text-white hover:bg-amber-700' },
  { email: 'uzman@omegatree.com', password: 'demo123', role: UserRole.SPECIALIST, label: 'Uzman', icon: FlaskConical, color: 'bg-orange-500 text-white hover:bg-orange-600' },
]

const danisanDemo = {
  email: 'danisan@omegatree.com',
  password: 'demo123',
}

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { authenticate } = useUsersStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingRole, setLoadingRole] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const doLogin = async (user: AppUser) => {
    setAuth(
      {
        ...user,
        status: UserStatus.ACTIVE,
      },
      'demo-token-xyz'
    )
    const displayName = `${user.firstName} ${user.lastName}`.trim()
    toast.success(`Hos geldiniz, ${displayName}!`)
    const routes: Record<UserRole, string> = {
      [UserRole.ADMIN]: '/admin',
      [UserRole.DIETITIAN]: '/dietitian',
      [UserRole.LAB]: '/lab',
      [UserRole.SPECIALIST]: '/specialist',
      [UserRole.DANISAN]: '/danisan',
    }
    navigate(routes[user.role])
  }

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setLoadingRole(account.role)
    await new Promise((resolve) => setTimeout(resolve, 600))
    const authResult = authenticate(account.email, account.password)
    if (authResult.ok) {
      await doLogin(authResult.user)
    } else {
      toast.error('Demo kullanici aktif degil veya bulunamadi')
    }
    setLoadingRole(null)
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const authResult = authenticate(data.email, data.password)
      if (authResult.ok) {
        await doLogin(authResult.user)
      } else if (authResult.reason === 'PENDING_APPROVAL') {
        toast.error('Kaydiniz admin onayi bekliyor. Onaydan sonra giris yapabilirsiniz.')
      } else if (authResult.reason === 'SUSPENDED') {
        toast.error('Hesabiniz askiya alinmis. Lutfen yonetici ile iletisime gecin.')
      } else {
        toast.error('Gecersiz e-posta veya sifre')
      }
    } catch {
      toast.error('Giris yapilamadi. Lutfen tekrar deneyin.')
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
          Hesabiniza erisim icin e-posta ve sifrenizi girin
        </p>
      </div>

      {/* Danışan Girişi */}
      <div className="mb-8 p-4 rounded-xl border border-primary-200 bg-primary-50/50">
        <p className="text-xs font-medium text-primary-700 uppercase tracking-wider mb-3">Danisan Girisi</p>
        <p className="text-sm text-surface-600 mb-3">
          Kit ve raporlariniza erismek icin danisan olarak giris yapin.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadingRole(UserRole.DANISAN)
            setTimeout(() => {
              const authResult = authenticate(danisanDemo.email, danisanDemo.password)
              if (authResult.ok) {
                doLogin(authResult.user)
              } else {
                toast.error('Danisan demo hesabi bulunamadi')
              }
              setLoadingRole(null)
            }, 500)
          }}
          disabled={loadingRole !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-all duration-200 disabled:opacity-60 w-full sm:w-auto"
        >
          {loadingRole === UserRole.DANISAN ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <User className="h-4 w-4" />
          )}
          Danisan olarak giris yap
        </button>
      </div>

      {/* Demo quick login */}
      <div className="mb-8">
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Hizli Demo Giris (Personel)</p>
        <div className="grid grid-cols-2 gap-2">
          {demoAccounts.map((account) => (
            <button
              key={account.role}
              onClick={() => handleDemoLogin(account)}
              disabled={loadingRole !== null}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 disabled:opacity-60 ${account.color}`}
            >
              {loadingRole === account.role ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <account.icon className="h-4 w-4" />
              )}
              {account.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs text-surface-400" style={{ background: '#F9F7F3' }}>veya e-posta ile</span>
        </div>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="E-posta"
          type="email"
          placeholder="ornek@omegatree.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
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
            />
            <span className="text-sm text-surface-600">Beni hatirla</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Sifremi Unuttum
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Giris Yap
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-surface-500">
        Hesabiniz yok mu?{' '}
        <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
          Kayit Olun
        </Link>
      </p>
    </div>
  )
}
