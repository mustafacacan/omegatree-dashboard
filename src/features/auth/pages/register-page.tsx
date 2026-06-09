import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input } from '@/components/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui'
import { UserRole } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'
import { AuthMobileBrand } from '@/components/shared/omega-tree-logo'
import { Mail, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { register as apiRegister } from '@/services/auth.service'

const registerSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir e-posta girin'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin'),
  role: z.enum([UserRole.DIETITIAN, UserRole.DANISAN]),
  gender: z.enum(['male', 'female']),
})

type RegisterForm = z.infer<typeof registerSchema>

/** Uygulama rolünü API register rolüne çevirir (API: dietician | client) */
function toApiRole(role: RegisterForm['role']): 'dietician' | 'client' {
  return role === UserRole.DANISAN ? 'client' : 'dietician'
}

export function RegisterPage() {
  const navigate = useNavigate()
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
      gender: 'male',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      await apiRegister({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: toApiRole(data.role),
        gender: data.gender,
      })
      toast.success('Hesabınız admin onayına gönderildi. Onaylandığında hesabınız aktif olacak ve telefona gelen SMS şifresi ile giriş yapabilirsiniz.')
      navigate(ROUTES.GIRIS)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, { fallback: 'Kayıt yapılamadı. Lütfen tekrar deneyin.' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <AuthMobileBrand subtitle="Kit Takip Sistemi" />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-surface-900">Kayıt Olun</h2>
        <p className="text-surface-500 mt-2">
          Sisteme erişim için hesap oluşturun
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ad"
            placeholder="Adınız"
            leftIcon={<User className="h-4 w-4" />}
            filter="personName"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Soyad"
            placeholder="Soyadınız"
            filter="personName"
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
          placeholder="05XX XXX XX XX"
          leftIcon={<Phone className="h-4 w-4" />}
          filter="phone"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700">Cinsiyet</label>
          <Select
            defaultValue="male"
            onValueChange={(val) => setValue('gender', val as 'male' | 'female')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Cinsiyet seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Erkek</SelectItem>
              <SelectItem value="female">Kadin</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-danger">{errors.gender.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-surface-700">Rol</label>
          <Select
            defaultValue={UserRole.DIETITIAN}
            onValueChange={(val) => setValue('role', val as RegisterForm['role'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Rol seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.DIETITIAN}>Diyetisyen</SelectItem>
              <SelectItem value={UserRole.DANISAN}>Danışan</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-danger">{errors.role.message}</p>}
        </div>

        <p className="text-xs text-surface-500">
          Şifreniz kayıt sonrası telefonunuza SMS ile gönderilecektir.
        </p>

        <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>
          Kayıt Ol
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-500">
        Zaten hesabınız var mı?{' '}
        <Link to={ROUTES.GIRIS} className="font-semibold text-primary-600 hover:text-primary-700">
          Giriş Yapın
        </Link>
      </p>
    </div>
  )
}
