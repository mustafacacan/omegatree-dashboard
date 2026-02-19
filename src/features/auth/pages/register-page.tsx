import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui'
import { UserRole } from '@/utils/constants'
import { TreePine, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUsersStore } from '@/stores/users.store'

const registerSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmali'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmali'),
  email: z.string().email('Gecerli bir e-posta girin'),
  phone: z.string().min(10, 'Gecerli bir telefon numarasi girin'),
  password: z.string().min(6, 'Sifre en az 6 karakter olmali'),
  confirmPassword: z.string(),
  role: z.enum([UserRole.DIETITIAN, UserRole.LAB, UserRole.SPECIALIST]),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Sifreler eslesmiyor',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { submitRegistration } = useUsersStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: UserRole.DIETITIAN,
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      const result = submitRegistration({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      navigate('/login')
    } catch {
      toast.error('Kayit yapilamadi. Lutfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600">
          <TreePine className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-surface-900">OmegaTree</h1>
          <p className="text-xs text-surface-400">Kit Takip Sistemi</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-surface-900">Kayit Olun</h2>
        <p className="text-surface-500 mt-2">
          Sisteme erisim icin hesap olusturun
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ad"
            placeholder="Adiniz"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Soyad"
            placeholder="Soyadiniz"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Telefon"
          type="tel"
          placeholder="05XX XXX XX XX"
          leftIcon={<Phone className="h-4 w-4" />}
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700">Rol</label>
          <Select
            defaultValue={UserRole.DIETITIAN}
            onValueChange={(val) => setValue('role', val as RegisterForm['role'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rol secin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.DIETITIAN}>Diyetisyen / Doktor</SelectItem>
              <SelectItem value={UserRole.LAB}>Laboratuvar</SelectItem>
              <SelectItem value={UserRole.SPECIALIST}>Raporlama Uzmani</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-danger">{errors.role.message}</p>}
        </div>

        <Input
          label="Sifre"
          type={showPassword ? 'text' : 'password'}
          placeholder="En az 6 karakter"
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

        <Input
          label="Sifre Tekrar"
          type="password"
          placeholder="Sifrenizi tekrar girin"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>
          Kayit Ol
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500">
        Zaten hesabiniz var mi?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          Giris Yapin
        </Link>
      </p>
    </div>
  )
}
