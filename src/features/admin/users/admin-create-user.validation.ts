import { validateNationalPhone } from '@/components/shared/phone-input'
import { UserRole } from '@/utils/constants'
import type { AdminCreateUserForm } from '@/features/admin/users/admin-create-user.types'
import { roleRequiresCompanyName } from '@/features/admin/users/admin-create-user.types'

export type AdminCreateUserValidationResult =
  | { ok: true }
  | { ok: false; message: string }

function requirePersonal(form: AdminCreateUserForm): AdminCreateUserValidationResult {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return { ok: false, message: 'Ad ve soyad zorunludur.' }
  }
  if (!form.phone.trim()) {
    return { ok: false, message: 'Telefon zorunludur.' }
  }
  const phoneErr = validateNationalPhone(form.phone, form.countryDialCode)
  if (phoneErr) {
    return { ok: false, message: phoneErr }
  }
  return { ok: true }
}

function validateLaboratory(form: AdminCreateUserForm): AdminCreateUserValidationResult {
  const base = requirePersonal(form)
  if (!base.ok) return base

  if (!form.companyName.trim()) {
    return { ok: false, message: 'Kurum adı zorunludur.' }
  }
  if (!form.city.trim() || !form.district.trim()) {
    return { ok: false, message: 'Şehir ve ilçe zorunludur.' }
  }
  if (!form.cargofirm.trim() || !form.cargoNumber.trim()) {
    return { ok: false, message: 'Kargo firması ve kargo numarası zorunludur.' }
  }
  return { ok: true }
}

export function validateAdminCreateUserForm(form: AdminCreateUserForm): AdminCreateUserValidationResult {
  if (form.role === UserRole.LAB) {
    return validateLaboratory(form)
  }

  const base = requirePersonal(form)
  if (!base.ok) return base

  if (roleRequiresCompanyName(form.role) && !form.companyName.trim()) {
    return { ok: false, message: 'Kurum adı zorunludur.' }
  }

  return { ok: true }
}
