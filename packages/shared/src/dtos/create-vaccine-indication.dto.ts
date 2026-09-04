import { ArrayMinSize, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateVaccineIndicationItemDto {
  // Sempre do catálogo, sem escape para texto livre — ao contrário da receita,
  // que aceita princípio ativo digitado. São dezenas de vacinas curadas, e o
  // nome livre quebraria a ligação com a caderneta e com o calendário.
  @IsUUID()
  vaccineId: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  doseLabel?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string
}

export class CreateVaccineIndicationDto {
  @IsUUID()
  appointmentId: string

  // Qual registro do profissional assina. Padrão: o principal.
  @IsOptional()
  @IsUUID()
  registrationId?: string

  // Qual especialidade assina (carrega RQE e título). Padrão: a da consulta.
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @ValidateNested({ each: true })
  @Type(() => CreateVaccineIndicationItemDto)
  @ArrayMinSize(1)
  items: CreateVaccineIndicationItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
