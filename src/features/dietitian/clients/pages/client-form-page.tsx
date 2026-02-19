import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button, Input, Textarea, Badge } from '@/components/ui'
import {
  Save, ArrowLeft, User, Phone, Mail, MapPin, Calendar,
  Ruler, Weight, Droplets, Heart,
  Hash, BadgeCheck, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useClientsStore } from '@/stores/clients.store'

/* ──────────── Schema ──────────── */
const clientSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalidir'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalidir'),
  phone: z.string().min(10, 'Gecerli bir telefon numarasi girin'),
  email: z.string().email('Gecerli bir e-posta adresi girin').optional().or(z.literal('')),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  chronicDiseases: z.string().optional(),
  familyHistory: z.string().optional(),
  dietaryHabits: z.string().optional(),
  exerciseHabits: z.string().optional(),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

/* ──────────── Component ──────────── */
export function ClientFormPage() {
  const navigate = useNavigate()
  const { clientId } = useParams()
  const { addClient } = useClientsStore()
  const isEdit = Boolean(clientId)

  const autoIdExample = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}${m}${day}XXX`
  }, [])

  const [step, setStep] = useState<1 | 2>(1)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: isEdit ? {
      firstName: 'Ahmet',
      lastName: 'Yildiz',
      phone: '0532 111 11 11',
      email: 'ahmet.yildiz@email.com',
      address: 'Kadikoy, Istanbul',
      birthDate: '1990-05-15',
      gender: 'Erkek',
      bloodType: 'A Rh+',
      height: '178',
      weight: '82',
      allergies: 'Gluten, Findik',
      medications: 'Vitamin D3, Omega-3',
      chronicDiseases: 'Tip 2 Diyabet (kontrol altinda)',
      notes: 'Haftada 3 gun agirlik calisiyor.',
    } : {},
  })

  const firstName = watch('firstName')
  const lastName = watch('lastName')

  const onSubmit = async (data: ClientFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    if (isEdit) {
      toast.success('Danisan bilgileri guncellendi')
      navigate('/dietitian/clients')
    } else {
      const { id } = addClient({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        birthDate: data.birthDate,
      })
      toast.success(`Danisan eklendi — ID: ${id}`)
      // Wait a bit for store to persist before navigating
      await new Promise((resolve) => setTimeout(resolve, 200))
      navigate(`/dietitian/clients/${id}`)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </Button>
        }
      />

      {/* Auto-ID Card */}
      {!isEdit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Hash className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">Otomatik Danisan ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-bold font-mono text-surface-600">{autoIdExample}</code>
                  <Badge variant="primary" size="sm">
                    <Sparkles className="h-3 w-3" /> Kayit sirasinda olusturulacak
                  </Badge>
                </div>
              </div>
              {firstName && lastName && (
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] text-surface-400">Danisan</p>
                  <p className="text-sm font-semibold text-surface-800">{firstName} {lastName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 1
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-surface-500 hover:bg-surface-50'
          }`}
        >
          <User className="h-4 w-4" />
          <span>1. Kisisel Bilgiler</span>
          {step > 1 && <BadgeCheck className="h-4 w-4 text-primary-500" />}
        </button>
        <div className="h-px w-6 bg-surface-200" />
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            step === 2
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-surface-500 hover:bg-surface-50'
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>2. Anamnez Bilgileri</span>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ═══ STEP 1: Personal Info ═══ */}
        {step === 1 && (
          <Card>
            <div className="p-5 pb-2 border-b border-surface-100">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <User className="h-4 w-4 text-primary-500" /> Kisisel Bilgiler
              </h3>
              <p className="text-[13px] text-surface-500 mt-0.5">Zorunlu alanlari (*) doldurun</p>
            </div>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Ad *"
                  placeholder="Danisan adi"
                  leftIcon={<User className="h-4 w-4" />}
                  error={errors.firstName?.message}
                  {...register('firstName')}
                />
                <Input
                  label="Soyad *"
                  placeholder="Danisan soyadi"
                  error={errors.lastName?.message}
                  {...register('lastName')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Telefon *"
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  leftIcon={<Phone className="h-4 w-4" />}
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <Input
                  label="E-posta"
                  type="email"
                  placeholder="ornek@email.com"
                  leftIcon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Dogum Tarihi"
                  type="date"
                  leftIcon={<Calendar className="h-4 w-4" />}
                  {...register('birthDate')}
                />
                <Input
                  label="Cinsiyet"
                  placeholder="Erkek / Kadin"
                  {...register('gender')}
                />
                <Input
                  label="Kan Grubu"
                  placeholder="A Rh+"
                  leftIcon={<Droplets className="h-4 w-4" />}
                  {...register('bloodType')}
                />
              </div>
              <Input
                label="Adres"
                placeholder="Tam adres bilgisi"
                leftIcon={<MapPin className="h-4 w-4" />}
                {...register('address')}
              />

              <div className="flex justify-end pt-2">
                <Button type="button" variant="primary" size="sm" onClick={() => setStep(2)}>
                  Devam Et — Anamnez
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ STEP 2: Anamnesis ═══ */}
        {step === 2 && (
          <Card>
            <div className="p-5 pb-2 border-b border-surface-100">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary-500" /> Anamnez Bilgileri
              </h3>
              <p className="text-[13px] text-surface-500 mt-0.5">Saglik ve beslenme gecmisi</p>
            </div>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Boy (cm)"
                  type="number"
                  placeholder="178"
                  leftIcon={<Ruler className="h-4 w-4" />}
                  {...register('height')}
                />
                <Input
                  label="Kilo (kg)"
                  type="number"
                  placeholder="82"
                  leftIcon={<Weight className="h-4 w-4" />}
                  {...register('weight')}
                />
              </div>

              <Textarea
                label="Alerjiler"
                placeholder="Bilinen alerjiler (orn: Gluten, Findik...)"
                {...register('allergies')}
              />
              <Textarea
                label="Kullanilan Ilaclar"
                placeholder="Duzenli kullanilan ilaclar ve takviyeler..."
                {...register('medications')}
              />
              <Textarea
                label="Kronik Hastaliklar"
                placeholder="Bilinen kronik hastaliklar..."
                {...register('chronicDiseases')}
              />
              <Textarea
                label="Aile Gecmisi"
                placeholder="Ailede bilinen hastaliklar..."
                {...register('familyHistory')}
              />
              <Textarea
                label="Beslenme Aliskanliklari"
                placeholder="Gunluk beslenme duezeni, diyet gecmisi..."
                {...register('dietaryHabits')}
              />
              <Textarea
                label="Egzersiz Aliskanliklari"
                placeholder="Haftalik spor rutini..."
                {...register('exerciseHabits')}
              />
              <Textarea
                label="Ek Notlar"
                placeholder="Dikkat edilmesi gereken diger bilgiler..."
                {...register('notes')}
              />

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Geri
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Degisiklikleri Kaydet' : 'Danisani Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  )
}
