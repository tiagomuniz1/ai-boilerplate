import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateProfessionalDto,
  PaginatedProfessionalsResponseDto,
  ProfessionalResponseDto,
  UpdateProfessionalDto,
  UserRole,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { ListProfessionalsQueryDto } from '../dto/list-professionals-query.dto'
import { CreateProfessionalUseCase } from '../use-cases/create-professional.use-case'
import { DeleteProfessionalUseCase } from '../use-cases/delete-professional.use-case'
import { FindAllProfessionalsUseCase } from '../use-cases/find-all-professionals.use-case'
import { FindProfessionalByIdUseCase } from '../use-cases/find-professional-by-id.use-case'
import { FindMyProfessionalUseCase } from '../use-cases/find-my-professional.use-case'
import { UpdateProfessionalUseCase } from '../use-cases/update-professional.use-case'

@Controller('professionals')
export class ProfessionalsController {
  constructor(
    private readonly createProfessionalUseCase: CreateProfessionalUseCase,
    private readonly findAllProfessionalsUseCase: FindAllProfessionalsUseCase,
    private readonly findProfessionalByIdUseCase: FindProfessionalByIdUseCase,
    private readonly findMyProfessionalUseCase: FindMyProfessionalUseCase,
    private readonly updateProfessionalUseCase: UpdateProfessionalUseCase,
    private readonly deleteProfessionalUseCase: DeleteProfessionalUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(201)
  create(
    @Body() dto: CreateProfessionalDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ProfessionalResponseDto> {
    return this.createProfessionalUseCase.execute(dto, currentUser)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findAll(
    @Query() query: ListProfessionalsQueryDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PaginatedProfessionalsResponseDto> {
    return this.findAllProfessionalsUseCase.execute(query, currentUser)
  }

  // Declarada acima de @Get(':id') de propósito: na ordem inversa, 'me' seria
  // capturado como um id e o Postgres estouraria com uuid inválido.
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  findMine(@CurrentUser() currentUser: ICurrentUser): Promise<ProfessionalResponseDto | null> {
    return this.findMyProfessionalUseCase.execute(currentUser)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER)
  findById(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ProfessionalResponseDto> {
    return this.findProfessionalByIdUseCase.execute(id, currentUser)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<ProfessionalResponseDto> {
    return this.updateProfessionalUseCase.execute(id, dto, currentUser)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(204)
  delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<void> {
    return this.deleteProfessionalUseCase.execute(id, currentUser)
  }
}
