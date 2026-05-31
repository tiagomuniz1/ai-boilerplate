export class DoctorUserDto {
  id!: string
  fullName!: string
  email!: string
  isActive!: boolean
}

export class DoctorSpecialtyDto {
  id!: string
  name!: string
}

export class DoctorResponseDto {
  id!: string
  user!: DoctorUserDto
  crmNumber!: string
  specialties!: DoctorSpecialtyDto[]
  bio!: string | null
  createdAt!: Date
  updatedAt!: Date
}
