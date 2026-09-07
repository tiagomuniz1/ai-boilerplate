import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { DataSource } from 'typeorm'
import {
  AppointmentStatus,
  CreateExamRequestDto,
  ExamRequestResponseDto,
  ExamRequestSnapshot,
  ExamResultResponseDto,
  UserRole,
} from '@app/shared'
import { BaseUseCase } from '../../../common/base.use-case'
import { CacheService } from '../../../cache/cache.service'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { IAppointmentsRepository } from '../../appointments/repositories/appointments.repository.interface'
import { IProfessionalsRepository } from '../../professionals/repositories/professionals.repository.interface'
import { resolveProfessionalSigningIdentity } from '../../professionals/utils/resolve-professional-signing-identity'
import { IPatientsRepository } from '../../patients/repositories/patients.repository.interface'
import { FindClinicByIdUseCase } from '../../clinics/use-cases/find-clinic-by-id.use-case'
import { IExamRequestsRepository } from '../repositories/exam-requests.repository.interface'
import { ExamRequest } from '../entities/exam-request.entity'
import { ExamResult } from '../entities/exam-result.entity'

export function toExamResultResponse(result: ExamResult): ExamResultResponseDto {
  return {
    id: result.id,
    examRequestId: result.examRequestId,
    fileName: result.fileName,
    mimeType: result.mimeType,
    fileSizeBytes: result.fileSizeBytes,
    createdAt: result.createdAt,
  }
}

export function toExamRequestResponse(examRequest: ExamRequest, results: ExamResult[] = []): ExamRequestResponseDto {
  return {
    id: examRequest.id,
    appointmentId: examRequest.appointmentId,
    patientId: examRequest.patientId,
    patientName: examRequest.snapshot.patient.name,
    professionalId: examRequest.professionalId,
    professionalName: examRequest.snapshot.professional.name,
    items: examRequest.snapshot.items.map((item) => ({
      name: item.name,
      observations: item.observations ?? null,
    })),
    notes: examRequest.snapshot.notes,
    status: examRequest.status,
    results: results.map(toExamResultResponse),
    issuedAt: examRequest.issuedAt,
    createdAt: examRequest.createdAt,
  }
}

@Injectable()
export class CreateExamRequestUseCase extends BaseUseCase {
  private readonly logger = new Logger(CreateExamRequestUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly examRequestsRepository: IExamRequestsRepository,
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly professionalsRepository: IProfessionalsRepository,
    private readonly patientsRepository: IPatientsRepository,
    private readonly findClinicByIdUseCase: FindClinicByIdUseCase,
    private readonly cacheService: CacheService,
  ) {
    super(dataSource)
  }

  async execute(dto: CreateExamRequestDto, currentUser: ICurrentUser): Promise<ExamRequestResponseDto> {
    const clinicId = currentUser.clinicId!

    const appointment = await this.appointmentsRepository.findById(dto.appointmentId, clinicId)
    if (!appointment) throw new NotFoundException('Appointment not found')

    // Exercer vem da ficha de profissional, não do cargo: um ADMIN que também
    // atende emite normalmente, um ADMIN sem ficha não emite nada. E emitir
    // exige ser o profissional DA CONSULTA para todo mundo — o documento sai com
    // nome, conselho e registro de quem assina, então emitir sobre consulta
    // alheia poria o registro de uma pessoa num documento que ela não redigiu.
    // (A receita acrescenta o QR verificável; aqui não há, e a regra vale igual.)
    const professional = await this.professionalsRepository.findByUserId(currentUser.id, clinicId)
    if (!professional || professional.id !== appointment.professionalId) {
      throw new ForbiddenException('Insufficient permissions')
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new UnprocessableEntityException('Cannot request exams for a cancelled appointment')
    }

    const clinic = await this.findClinicByIdUseCase.execute(clinicId)

    const { councilType, registrationNumber, registryNumber, specialtyName } = resolveProfessionalSigningIdentity(
      professional,
      appointment.specialtyId,
      dto.registrationId,
      dto.specialtyId,
    )

    const patient = await this.patientsRepository.findById(appointment.patientId, clinicId)
    if (!patient) throw new NotFoundException('Patient not found')

    const issuedAt = new Date()

    const snapshot: ExamRequestSnapshot = {
      issuedAt: issuedAt.toISOString(),
      clinic: {
        name: clinic.name,
        address: clinic.address
          ? {
              street: clinic.address.street,
              number: clinic.address.number,
              complement: clinic.address.complement ?? null,
              neighborhood: clinic.address.neighborhood,
              city: clinic.address.city,
              state: clinic.address.state,
              zipCode: clinic.address.zipCode,
            }
          : null,
        logoUrl: clinic.logoUrl,
      },
      professional: {
        name: professional.user.fullName,
        councilType,
        registrationNumber,
        registryNumber,
        specialtyName,
      },
      patient: {
        name: patient.user.fullName,
        documentNumber: patient.documentNumber,
      },
      items: dto.items.map((item) => ({
        name: item.name,
        observations: item.observations ?? null,
      })),
      notes: dto.notes ?? null,
    }

    const examRequest = await this.examRequestsRepository.create({
      clinicId,
      appointmentId: dto.appointmentId,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      snapshot,
      issuedAt,
    })

    try {
      await this.cacheService.del(`exam-requests:appointment:${dto.appointmentId}`)
    } catch {
      this.logger.warn('Cache invalidation failed', { context: CreateExamRequestUseCase.name })
    }

    return toExamRequestResponse(examRequest)
  }
}
