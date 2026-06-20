Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Especialidade na Consulta + Regra de Exclusão de Especialidade (Backend)

## Descrição
Duas mudanças relacionadas e necessárias para a feature de prontuários:
1. **Vincular especialidade à consulta:** adicionar `specialty_id` à entidade `Appointment` e fazer o agendamento escolher a especialidade entre as do médico (auto-resolver quando ele tem apenas uma).
2. **Endurecer a exclusão de especialidade:** impedir excluir uma `Specialty` que esteja vinculada a clínica ou tenha consultas atreladas (a regra de médicos vinculados já existe).

---

## Contexto
- Hoje `appointments` não guarda especialidade; `create-appointment.use-case.ts` cria sem ela.
- `Doctor` tem `specialties` ManyToMany (`doctor_specialties`).
- O prontuário herdará `specialty_id` da consulta — por isso a consulta precisa carregá-la.
- O médico pode atender em mais de uma especialidade → é preciso escolher qual no agendamento.
- `delete-specialty.use-case.ts` já bloqueia exclusão quando há médicos vinculados (`countLinkedDoctors`). Falta clínicas e consultas.

---

## Parte 1 — Especialidade na consulta

### DTO
- `CreateAppointmentDto`: adicionar `specialtyId?` (`@IsOptional() @IsUUID()`). Opcional no DTO; obrigatoriedade tratada no use-case.
- `AppointmentResponseDto`: adicionar `specialtyId: string | null` e `specialtyName: string | null`.

### Entidade
- `Appointment`: adicionar `@ManyToOne(() => Specialty)` + `@Column({ name:'specialty_id', type:'uuid', nullable:true }) specialtyId: string | null`.

### Use-case `create-appointment` (ajuste)
1. Após resolver o `doctor`, **carregar as especialidades do médico** (relação `specialties`).
2. Resolução da especialidade da consulta:
   - `specialtyId` informado → validar que pertence a `doctor.specialties` → senão `UnprocessableEntityException('Specialty does not belong to this doctor')`.
   - omitido e médico tem **exatamente 1** → usar essa.
   - omitido e médico tem **>1** → `UnprocessableEntityException('specialtyId is required')`.
   - médico sem especialidade ativa → `UnprocessableEntityException('Doctor has no active specialty')`.
3. Persistir `specialtyId` no appointment; incluir `specialtyId`/`specialtyName` no response.
- Repository: garantir que `findById`/`findByUserId` do doctor tragam `specialties` (innerJoin/leftJoin conforme padrão), e que o appointments repository persista `specialtyId`.

---

## Parte 2 — Regra de exclusão de especialidade

### Repository `ISpecialtiesRepository` (somar métodos)
- `countLinkedClinics(id: string): Promise<number>` — COUNT em `clinic_specialties` por `specialty_id`.
- `countLinkedAppointments(id: string): Promise<number>` — COUNT em `appointments` por `specialty_id` (qualquer status, inclui canceladas/concluídas).

### Use-case `delete-specialty` (somar checagens, após a de médicos)
```ts
const linkedClinics = await this.specialtiesRepository.countLinkedClinics(id)
if (linkedClinics > 0) throw new ConflictException(`Specialty is linked to ${linkedClinics} clinic(s) and cannot be deleted`)

const linkedAppointments = await this.specialtiesRepository.countLinkedAppointments(id)
if (linkedAppointments > 0) throw new ConflictException(`Specialty has ${linkedAppointments} appointment(s) and cannot be deleted`)
```
Mensagens distintas por motivo (médico/clínica/consulta).

---

## Fluxos alternativos
- specialtyId não pertence ao médico → `422`
- specialtyId omitido com médico multi-especialidade → `422`
- médico sem especialidade ativa → `422`
- excluir especialidade com clínica vinculada → `409`
- excluir especialidade com consulta atrelada → `409`
- (mantido) excluir especialidade com médico vinculado → `409`

---

## Permissões
- Agendamento: inalterado (ADMIN, DOCTOR criam).
- Exclusão de especialidade: inalterado (ADMIN).

---

## Dependências
- `IDoctorsRepository` (carregar specialties).
- `clinic_specialties` e `appointments` (queries de contagem).
- Migration desta task deve rodar **antes** de a contagem de consultas funcionar.

---

## Decisões técnicas da task
- **Transação:** o fluxo de criação de consulta já usa distributed lock + transação; manter, apenas somando `specialtyId` no insert.
- **Nullable:** `appointments.specialty_id` nullable para não quebrar dados existentes; novas consultas sempre resolvem uma.
- **Contagem de consultas:** COUNT simples por `specialty_id` (não filtrar por status — é integridade histórica).

---

## Restrições
- NÃO tornar `specialty_id` NOT NULL (dados legados).
- NÃO alterar o cálculo de slots/lock existente — só somar a especialidade.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada (arquivos tocados)
```
packages/shared/src/dtos/
  create-appointment.dto.ts        (+ specialtyId?)
  appointment-response.dto.ts      (+ specialtyId, specialtyName)
apps/backend/src/modules/appointments/
  entities/appointment.entity.ts   (+ specialty relation/column)
  use-cases/create-appointment.use-case.ts   (resolução de especialidade)
  repositories/appointments.repository.ts     (persistir specialtyId; trazer nome)
apps/backend/src/modules/specialties/
  repositories/specialties.repository.interface.ts (+ countLinkedClinics, countLinkedAppointments)
  repositories/specialties.repository.ts
  use-cases/delete-specialty.use-case.ts            (+ 2 checagens)
apps/backend/src/database/migrations/
  1750800000000-add-specialty-id-to-appointments.ts
```

---

## Migration
`1750800000000-add-specialty-id-to-appointments.ts`:
```sql
ALTER TABLE "appointments" ADD COLUMN "specialty_id" uuid NULL REFERENCES "specialties"("id");
CREATE INDEX "IDX_appointments_specialty" ON "appointments" ("specialty_id");
```
`down`: dropar índice e coluna.

---

## Cenários de teste adicionais
- Criar consulta sem specialtyId, médico com 1 especialidade → usa a única, `201`.
- Criar consulta sem specialtyId, médico com 2 → `422`.
- Criar consulta com specialtyId que não é do médico → `422`.
- Criar consulta com specialtyId válido → `201` com `specialtyId`/`specialtyName` no response.
- Response inclui specialtyName correto.
- Atualizar/ajustar specs existentes de create-appointment que quebrarem.
- delete-specialty: com clínica vinculada → `409`; com consulta atrelada → `409`; com médico vinculado → `409` (mantido); sem vínculos → `204`.
- Novos métodos do repository testados em unit + integração.

---

## Definition of Done
- [ ] `CreateAppointmentDto.specialtyId?` e `AppointmentResponseDto.specialtyId/specialtyName` no `@app/shared`
- [ ] `Appointment` com relação/coluna `specialty_id`
- [ ] Resolução de especialidade no create-appointment (validação + auto-resolução)
- [ ] Migration add-specialty-id-to-appointments criada e executada
- [ ] `countLinkedClinics` e `countLinkedAppointments` no repository de especialidades
- [ ] `delete-specialty` bloqueando por clínica e por consulta (mensagens distintas)
- [ ] Specs existentes de appointments atualizadas e passando
- [ ] Testes unitários (100%) + integração para os dois fluxos
- [ ] Naming convention seguida
