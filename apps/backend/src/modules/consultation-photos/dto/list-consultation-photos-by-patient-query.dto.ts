import { PaginationDto } from '../../../common/dto/pagination.dto'

// Deliberately does not expose a `professionalId` field — the PROFESSIONAL/patient
// isolation is enforced entirely server-side (see FindConsultationPhotosByPatientUseCase).
export class ListConsultationPhotosByPatientQueryDto extends PaginationDto {}
