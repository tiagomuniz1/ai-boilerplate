import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ProfessionalResponseDto } from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IProfessionalsRepository } from '../repositories/professionals.repository.interface'
import { Professional } from '../entities/professional.entity'

/**
 * The caller's own professional profile, or `null` when they have none.
 *
 * Exists because "do I practise here?" is a question about the professional
 * record, not about the role: an ADMIN who also treats patients has a profile,
 * and a receptionist does not. The frontend used to answer it by taking the
 * first item of `GET /professionals`, which only works for a PROFESSIONAL — for
 * an ADMIN that endpoint returns the whole clinic.
 *
 * Returns `null` rather than 404 for "no profile": React Query treats a 404 as
 * an error and retries, and having no profile is an ordinary answer, not a
 * failure.
 */
@Injectable()
export class FindMyProfessionalUseCase extends BaseUseCase {
  constructor(
    dataSource: DataSource,
    private readonly professionalsRepository: IProfessionalsRepository,
  ) {
    super(dataSource)
  }

  async execute(currentUser: ICurrentUser): Promise<ProfessionalResponseDto | null> {
    const professional = await this.professionalsRepository.findByUserId(
      currentUser.id,
      currentUser.clinicId!,
    )

    return professional ? this.toResponse(professional) : null
  }

  private toResponse(professional: Professional): ProfessionalResponseDto {
    return {
      id: professional.id,
      user: {
        id: professional.user.id,
        fullName: professional.user.fullName,
        email: professional.user.email,
        isActive: professional.user.isActive,
      },
      registrations: (professional.registrations ?? []).map((registration) => ({
        id: registration.id,
        councilType: registration.councilType,
        number: registration.number,
        state: registration.state,
        isPrimary: registration.isPrimary,
      })),
      specialties: (professional.professionalSpecialties ?? []).map((ps) => ({
        id: ps.specialty.id,
        name: ps.specialty.name,
        registryNumber: ps.registryNumber,
      })),
      bio: professional.bio,
      createdAt: professional.createdAt,
      updatedAt: professional.updatedAt,
    }
  }
}
