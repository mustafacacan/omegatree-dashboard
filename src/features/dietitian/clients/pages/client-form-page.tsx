import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui'
import {
  Save, ArrowLeft, User, Phone, Mail, Calendar,
  Ruler, Weight, Heart,
  BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { ROUTES, danisanDetayPath } from '@/utils/routes'
import { useClientsStore } from '@/stores/clients.store'
import { useCurrentUser } from '@/stores/auth.store'

/* ──────────── Schema ──────────── */
const optionalNumber = z
  .preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number()
  )
  .optional()

const clientSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalidir'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalidir'),
  phone: z.string().min(10, 'Gecerli bir telefon numarasi girin'),
  email: z.string().email('Gecerli bir e-posta adresi girin').optional().or(z.literal('')),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  // Anamnez (Step 2) tamamen opsiyonel
  height: optionalNumber,
  weight: optionalNumber,
  waistCircumference: optionalNumber,
  hipCircumference: optionalNumber,
  profession: z.string().optional(),
  education: z.string().optional(),
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
  const currentUser = useCurrentUser()
  const isEdit = Boolean(clientId)

  const [step, setStep] = useState<1 | 2>(1)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as unknown as Resolver<ClientFormData>,
    defaultValues: isEdit ? {
      firstName: 'Ahmet',
      lastName: 'Yildiz',
      phone: '0532 111 11 11',
      email: 'ahmet.yildiz@email.com',
      address: 'Kadikoy, Istanbul',
      birthDate: '1990-05-15',
      gender: 'male',
      bloodType: 'A Rh+',
      height: 178,
      weight: 82,
      waistCircumference: 85.5,
      hipCircumference: 95.5,
      profession: 'Yazilim Gelistirici',
      education: "Lisans",
      allergies: 'Gluten, Findik',
      medications: 'Vitamin D3, Omega-3',
      chronicDiseases: 'Tip 2 Diyabet (kontrol altinda)',
      notes: 'Haftada 3 gun agirlik calisiyor.',
    } : {},
  })

  const onSubmit = async (data: ClientFormData) => {
    if (isEdit) {
      toast.success('Danisan bilgileri guncellendi')
      navigate(ROUTES.DIYETISYEN_DANISANLAR)
    } else {
      try {
        const anamnezForm = (() => {
          const chronicIllness = data.chronicDiseases?.trim()
          const medicationUsed = data.medications?.trim()
          const foodAllergy = data.allergies?.trim()
          const profession = data.profession?.trim()
          const education = data.education?.trim()

          const bodyHeight = typeof data.height === 'number' && !Number.isNaN(data.height) ? data.height : undefined
          const bodyWeight = typeof data.weight === 'number' && !Number.isNaN(data.weight) ? data.weight : undefined
          const waistCircumference = typeof data.waistCircumference === 'number' && !Number.isNaN(data.waistCircumference)
            ? data.waistCircumference
            : undefined
          const hipCircumference = typeof data.hipCircumference === 'number' && !Number.isNaN(data.hipCircumference)
            ? data.hipCircumference
            : undefined

          const partial: {
            chronicIllness?: string
            medicationUsed?: string
            foodAllergy?: string
            bodyWeight?: number
            bodyHeight?: number
            waistCircumference?: number
            hipCircumference?: number
            profession?: string
            education?: string
          } = {}

          if (chronicIllness) partial.chronicIllness = chronicIllness
          if (medicationUsed) partial.medicationUsed = medicationUsed
          if (foodAllergy) partial.foodAllergy = foodAllergy
          if (profession) partial.profession = profession
          if (education) partial.education = education
          if (bodyHeight !== undefined) partial.bodyHeight = bodyHeight
          if (bodyWeight !== undefined) partial.bodyWeight = bodyWeight
          if (waistCircumference !== undefined) partial.waistCircumference = waistCircumference
          if (hipCircumference !== undefined) partial.hipCircumference = hipCircumference

          return Object.keys(partial).length ? partial : undefined
        })()

        const { id } = await addClient({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || undefined,
          gender: data.gender === 'female' ? 'female' : 'male',
          dieticianId: currentUser?.id ? Number(currentUser.id) : undefined,
          ...(anamnezForm ? { anamnezForm } : {}),
        })
        toast.success(`Danisan eklendi — ID: ${id}`)
        navigate(danisanDetayPath(id))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Danışan oluşturulamadı'
        toast.error(msg)
      }
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Geri
          </Button>
        }
      />

    

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Dogum Tarihi"
                  type="date"
                  leftIcon={<Calendar className="h-4 w-4" />}
                  {...register('birthDate')}
                />
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger label="Cinsiyet" className="w-full">
                        <SelectValue placeholder="Secin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Erkek</SelectItem>
                        <SelectItem value="female">Kadin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              
              </div>
              

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)}>
                  Anamnez (Opsiyonel)
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Degisiklikleri Kaydet' : 'Danisani Kaydet'}
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
                  // error={errors.height?.message}
                  {...register('height')}
                />
                <Input
                  label="Kilo (kg)"
                  type="number"
                  placeholder="82"
                  leftIcon={<Weight className="h-4 w-4" />}
                  // error={errors.weight?.message}
                  {...register('weight')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Bel Olcusu (cm)"
                  type="number"
                  placeholder="85.5"
                  // error={errors.waistCircumference?.message}
                  {...register('waistCircumference')}
                />
                <Input
                  label="Kalca Olcusu (cm)"
                  type="number"
                  placeholder="95.5"
                  // error={errors.hipCircumference?.message}
                  {...register('hipCircumference')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Meslek"
                  placeholder="Orn: Yazilim gelistirici"
                  error={errors.profession?.message}
                  {...register('profession')}
                />
                <Input
                  label="Egitim"
                  placeholder="Orn: Lisans"
                  error={errors.education?.message}
                  {...register('education')}
                />
              </div>

              <Textarea
                label="Alerjiler"
                placeholder="Bilinen alerjiler (orn: Gluten, Findik...)"
                error={errors.allergies?.message}
                {...register('allergies')}
              />
              <Textarea
                label="Kullanilan Ilaclar"
                placeholder="Duzenli kullanilan ilaclar ve takviyeler..."
                error={errors.medications?.message}
                {...register('medications')}
              />
              <Textarea
                label="Kronik Hastaliklar"
                placeholder="Bilinen kronik hastaliklar..."
                error={errors.chronicDiseases?.message}
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
