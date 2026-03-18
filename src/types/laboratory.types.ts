export interface Laboratory {
  id: string
  name: string
  companyName?: string
  address: string
  city: string
  district?: string
  postalCode?: string
  phone?: string
  email?: string
  assignedDietitians: string[]
  createdAt: string
  updatedAt: string
  cargofirm?: string
  cargoNumber?: string
  isActive?: boolean
  userId?: number
  street?: string
  neighborhood?: string
  no?: string
  fullAddress?: string
  country?: string
  addressTitle?: string
  firstName?: string
  lastName?: string
  gender?: string
}

export interface CreateLaboratoryRequest {
  name: string
  address: string
  city: string
  district?: string
  postalCode?: string
  phone?: string
  email?: string
}

export interface UpdateLaboratoryRequest {
  name?: string
  address?: string
  city?: string
  district?: string
  postalCode?: string
  phone?: string
  email?: string
  assignedDietitians?: string[]
}
