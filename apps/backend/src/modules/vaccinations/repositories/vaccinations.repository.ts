import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { QueryRunner, Repository } from 'typeorm'
import { Vaccination } from '../entities/vaccination.entity'
import {
  CreateVaccinationData,
  IVaccinationsRepository,
  UpdateVaccinationData,
} from './vaccinations.repository.interface'

@Injectable()
export class VaccinationsRepository implements IVaccinationsRepository {
  constructor(
    @InjectRepository(Vaccination)
    private readonly repository: Repository<Vaccination>,
  ) {}

  /**
   * `innerJoinAndSelect` na vacina porque a relação é obrigatória: uma dose sem
   * imunobiológico no catálogo não tem o que exibir, e o INNER exclui o registro
   * em vez de devolver `vaccine` nulo e quebrar na leitura.
   */
  async findByPatient(
    patientId: string,
    clinicId: string,
    page: number,
    limit: number,
  ): Promise<[Vaccination[], number]> {
    return this.repository
      .createQueryBuilder('vaccination')
      .innerJoinAndSelect('vaccination.vaccine', 'vaccine')
      .innerJoinAndSelect('vaccination.recordedByProfessional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
      .where('vaccination.patientId = :patientId', { patientId })
      .andWhere('vaccination.clinicId = :clinicId', { clinicId })
      .orderBy('vaccination.appliedAt', 'DESC')
      .addOrderBy('vaccination.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()
  }

  async findByAppointment(appointmentId: string, clinicId: string): Promise<Vaccination[]> {
    return this.repository
      .createQueryBuilder('vaccination')
      .innerJoinAndSelect('vaccination.vaccine', 'vaccine')
      .innerJoinAndSelect('vaccination.recordedByProfessional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
      .where('vaccination.appointmentId = :appointmentId', { appointmentId })
      .andWhere('vaccination.clinicId = :clinicId', { clinicId })
      .orderBy('vaccination.appliedAt', 'DESC')
      .getMany()
  }

  async findById(id: string, clinicId: string): Promise<Vaccination | null> {
    return this.repository
      .createQueryBuilder('vaccination')
      .innerJoinAndSelect('vaccination.vaccine', 'vaccine')
      .innerJoinAndSelect('vaccination.recordedByProfessional', 'professional')
      .innerJoinAndSelect('professional.user', 'professionalUser')
      .where('vaccination.id = :id', { id })
      .andWhere('vaccination.clinicId = :clinicId', { clinicId })
      .getOne()
  }

  async create(data: CreateVaccinationData, queryRunner?: QueryRunner): Promise<Vaccination> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccination) : this.repository
    const saved = await repository.save(repository.create(data))
    return this.findById(saved.id, data.clinicId) as Promise<Vaccination>
  }

  async update(
    id: string,
    data: UpdateVaccinationData,
    queryRunner?: QueryRunner,
  ): Promise<Vaccination> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccination) : this.repository
    await repository.update(id, data)
    const updated = await repository.findOne({
      where: { id },
      relations: ['vaccine', 'recordedByProfessional', 'recordedByProfessional.user'],
    })
    return updated as Vaccination
  }

  async delete(id: string, queryRunner?: QueryRunner): Promise<void> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Vaccination) : this.repository
    await repository.softDelete(id)
  }
}
