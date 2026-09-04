import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateVaccineDecisionDto,
  CreateVaccineScheduleRuleDto,
  PatientVaccineStatusResponseDto,
  UpdateVaccineScheduleRuleDto,
  UserRole,
  VaccineScheduleRuleResponseDto,
} from '@app/shared'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { Roles } from '../../auth/decorators/roles.decorator'
import { ICurrentUser } from '../../auth/types/current-user.type'
import { CreateScheduleRuleUseCase } from '../use-cases/create-schedule-rule.use-case'
import { DeleteScheduleRuleUseCase } from '../use-cases/delete-schedule-rule.use-case'
import { FindScheduleRulesUseCase } from '../use-cases/find-schedule-rules.use-case'
import { GetPatientVaccineStatusUseCase } from '../use-cases/get-patient-vaccine-status.use-case'
import { RecordVaccineDecisionUseCase } from '../use-cases/record-vaccine-decision.use-case'
import { UpdateScheduleRuleUseCase } from '../use-cases/update-schedule-rule.use-case'

@Controller('vaccine-schedules')
export class VaccineSchedulesController {
  constructor(
    private readonly findScheduleRulesUseCase: FindScheduleRulesUseCase,
    private readonly createScheduleRuleUseCase: CreateScheduleRuleUseCase,
    private readonly updateScheduleRuleUseCase: UpdateScheduleRuleUseCase,
    private readonly deleteScheduleRuleUseCase: DeleteScheduleRuleUseCase,
    private readonly getPatientVaccineStatusUseCase: GetPatientVaccineStatusUseCase,
    private readonly recordVaccineDecisionUseCase: RecordVaccineDecisionUseCase,
  ) {}

  // A situação vacinal vem ANTES de `/rules/:id` de propósito: uma rota estática
  // declarada depois de uma paramétrica que a case seria engolida por ela.
  @Get('patients/:patientId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  getPatientStatus(
    @Param('patientId') patientId: string,
    @CurrentUser() currentUser: ICurrentUser,
  ): Promise<PatientVaccineStatusResponseDto> {
    return this.getPatientVaccineStatusUseCase.execute(patientId, currentUser)
  }

  @Post('decisions')
  @Roles(UserRole.ADMIN, UserRole.PROFESSIONAL)
  @HttpCode(201)
  recordDecision(
    @Body() dto: CreateVaccineDecisionDto,
    @CurrentUser() currentUser: ICurrentUser,
  ) {
    return this.recordVaccineDecisionUseCase.execute(dto, currentUser)
  }

  // O calendário é curadoria da plataforma; a clínica lê para exibir a situação.
  @Get('rules')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.ADMIN, UserRole.PROFESSIONAL)
  findRules(@Query('vaccineId') vaccineId?: string): Promise<VaccineScheduleRuleResponseDto[]> {
    return this.findScheduleRulesUseCase.execute(vaccineId)
  }

  @Post('rules')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  createRule(@Body() dto: CreateVaccineScheduleRuleDto): Promise<VaccineScheduleRuleResponseDto> {
    return this.createScheduleRuleUseCase.execute(dto)
  }

  @Patch('rules/:id')
  @Roles(UserRole.PLATFORM_ADMIN)
  updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateVaccineScheduleRuleDto,
  ): Promise<VaccineScheduleRuleResponseDto> {
    return this.updateScheduleRuleUseCase.execute(id, dto)
  }

  @Delete('rules/:id')
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  deleteRule(@Param('id') id: string): Promise<void> {
    return this.deleteScheduleRuleUseCase.execute(id)
  }
}
