import { QueryRunner } from 'typeorm'
import { AccessRequest } from '../entities/access-request.entity'

export interface CreateAccessRequestData {
  fullName: string
  email: string
  clinicName: string
  phone?: string
}

export abstract class IAccessRequestsRepository {
  abstract create(data: CreateAccessRequestData, queryRunner?: QueryRunner): Promise<AccessRequest>
}
