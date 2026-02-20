export interface Laboratory {
  id: string
  name: string
  address: string
  city: string
  district?: string
  postalCode?: string
  phone?: string
  email?: string
  assignedDietitians: string[] // User IDs
  createdAt: string
  updatedAt: string
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

