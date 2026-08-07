import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { CouncilType, UpdateProfessionalDto } from '@app/shared'
import { Professional } from '../entities/professional.entity'
import { ProfessionalRegistration } from '../entities/professional-registration.entity'
import { ProfessionalSpecialty } from '../entities/professional-specialty.entity'
import {
  CreateProfessionalData,
  IProfessionalsRepository,
  ProfessionalRegistrationAssignment,
  ProfessionalSpecialtyAssignment,
} from './professionals.repository.interface'

const PROFESSIONAL_RELATIONS = ['user', 'registrations', 'professionalSpecialties', 'professionalSpecialties.specialty']

@Injectable()
export class ProfessionalsRepository implements IProfessionalsRepository {
  constructor(
    @InjectRepository(Professional)
    private readonly repository: Repository<Professional>,
  ) {}

  async findAll(page: number, limit: number, clinicId: string, search?: string): Promise<[Professional[], number]> {
    const qb = this.repository
      .createQueryBuilder('professional')
      .innerJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('professional.registrations', 'registration')
      .leftJoinAndSelect('professional.professionalSpecialties', 'professionalSpecialty')
      .leftJoinAndSelect('professionalSpecialty.specialty', 'specialty')
      .where('user.clinicId = :clinicId', { clinicId })
      .orderBy('professional.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)

    if (search) {
      qb.andWhere('user.fullName ILIKE :search OR specialty.name ILIKE :search', {
        search: `%${search}%`,
      })
    }

    return qb.getManyAndCount()
  }

  async findById(id: string, clinicId: string): Promise<Professional | null> {
    return this.repository
      .createQueryBuilder('professional')
      .innerJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('professional.registrations', 'registration')
      .leftJoinAndSelect('professional.professionalSpecialties', 'professionalSpecialty')
      .leftJoinAndSelect('professionalSpecialty.specialty', 'specialty')
      .where('professional.id = :id', { id })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByUserId(userId: string, clinicId: string): Promise<Professional | null> {
    return this.repository
      .createQueryBuilder('professional')
      .innerJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('professional.registrations', 'registration')
      .leftJoinAndSelect('professional.professionalSpecialties', 'professionalSpecialty')
      .leftJoinAndSelect('professionalSpecialty.specialty', 'specialty')
      .where('professional.userId = :userId', { userId })
      .andWhere('user.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async findByRegistration(councilType: CouncilType, number: string, state: string, clinicId: string): Promise<Professional | null> {
    return this.repository
      .createQueryBuilder('professional')
      .innerJoin('professional.registrations', 'registration')
      .where('registration.councilType = :councilType', { councilType })
      .andWhere('registration.number = :number', { number })
      .andWhere('registration.state = :state', { state })
      .andWhere('registration.clinicId = :clinicId', { clinicId })
      .andWhere('registration.deletedAt IS NULL')
      .getOne()
  }

  // Counts currently-registered professionals in the clinic — used to enforce the
  // subscription plan's professional cap. TypeORM's count() excludes soft-deleted
  // rows automatically, so this reflects live professionals only.
  async countByClinic(clinicId: string): Promise<number> {
    return this.repository.count({ where: { clinicId } })
  }

  async create(
    data: CreateProfessionalData,
    clinicId: string,
    registrations: ProfessionalRegistrationAssignment[],
    specialties: ProfessionalSpecialtyAssignment[],
    queryRunner?: QueryRunner,
  ): Promise<Professional> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Professional)
    const registrationRepo = manager.getRepository(ProfessionalRegistration)
    const professionalSpecialtyRepo = manager.getRepository(ProfessionalSpecialty)

    const professional = repo.create({
      userId: data.userId,
      clinicId,
      bio: data.bio ?? null,
    })
    professional.registrations = registrations.map((registration) =>
      registrationRepo.create({
        clinicId,
        councilType: registration.councilType,
        number: registration.number,
        state: registration.state,
        isPrimary: registration.isPrimary,
      }),
    )
    professional.professionalSpecialties = specialties.map((assignment) =>
      professionalSpecialtyRepo.create({ specialtyId: assignment.specialty.id, registryNumber: assignment.registryNumber }),
    )

    const saved = await repo.save(professional)
    return repo.findOne({ where: { id: saved.id }, relations: PROFESSIONAL_RELATIONS }) as Promise<Professional>
  }

  async update(
    id: string,
    data: UpdateProfessionalDto,
    registrations: ProfessionalRegistrationAssignment[] | null,
    specialties: ProfessionalSpecialtyAssignment[] | null,
    queryRunner?: QueryRunner,
  ): Promise<Professional> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    const repo = manager.getRepository(Professional)
    const registrationRepo = manager.getRepository(ProfessionalRegistration)
    const professionalSpecialtyRepo = manager.getRepository(ProfessionalSpecialty)

    const professional = await repo.findOne({ where: { id }, relations: ['registrations', 'professionalSpecialties'] })
    if (!professional) throw new Error(`Professional ${id} not found`)

    if (data.bio !== undefined) professional.bio = data.bio
    await repo.save(professional)

    if (registrations !== null) {
      await registrationRepo.delete({ professionalId: id })
      await registrationRepo.save(
        registrations.map((registration) =>
          registrationRepo.create({
            professionalId: id,
            clinicId: professional.clinicId,
            councilType: registration.councilType,
            number: registration.number,
            state: registration.state,
            isPrimary: registration.isPrimary,
          }),
        ),
      )
    }
    if (specialties !== null) {
      await professionalSpecialtyRepo.delete({ professionalId: id })
      await professionalSpecialtyRepo.save(
        specialties.map((assignment) =>
          professionalSpecialtyRepo.create({ professionalId: id, specialtyId: assignment.specialty.id, registryNumber: assignment.registryNumber }),
        ),
      )
    }

    return repo.findOne({ where: { id }, relations: PROFESSIONAL_RELATIONS }) as Promise<Professional>
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const manager = queryRunner ? queryRunner.manager : this.repository.manager
    await manager.getRepository(ProfessionalRegistration).softDelete({ professionalId: id })
    await manager.getRepository(Professional).softDelete(id)
  }
}
