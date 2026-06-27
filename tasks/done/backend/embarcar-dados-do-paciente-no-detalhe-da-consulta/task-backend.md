# Task — Embarcar dados do paciente no detalhe da consulta (Backend)

## Descrição
Estender o endpoint de **detalhe** da consulta (`GET /appointments/:id`) para retornar um bloco `patient` com os dados completos do paciente (nome, e-mail, telefone, nascimento, documento, gênero), além dos campos já existentes. Isso habilita a nova **tela própria de consulta** no frontend a exibir os dados do paciente **sem** acessar `/patients` diretamente — respeitando a regra de que DOCTOR vê o paciente **apenas via vínculo da consulta**.

A mudança é **somente no endpoint de detalhe** (`:id`). A **listagem** (`GET /appointments`) permanece magra, retornando apenas `patientName` — não embarca o bloco `patient`.

---

## Contexto
- `FindAppointmentByIdUseCase` (`modules/appointments/use-cases/find-appointment-by-id.use-case.ts`) já resolve `doctorName`, `patientName` e `specialtyName` via queries raw pontuais (`fetchDoctorName`, `fetchPatientName`, `fetchSpecialtyName`) com `innerJoin` em `users`/`patients`/`specialties` filtrando `deleted_at IS NULL`.
- A validação own-resource do DOCTOR já acontece neste use-case (`ForbiddenException` se a consulta não for dele). **Nada muda** nessa regra.
- Entidade `Patient` (`modules/patients/entities/patient.entity.ts`): `userId` (→ `users.full_name`, `users.email`), `documentNumber`, `phoneNumber`, `birthDate` (`date`, string), `gender` (`PatientGender`).
- A listagem usa `AppointmentResponseDto`; o detalhe passará a usar um DTO próprio que o estende.
- **Sem migration** — nenhuma coluna nova; é só agregação de leitura.

---

## Contratos

### Novos DTOs (shared) — `packages/shared/src/dtos/`
```ts
// appointment-patient.dto.ts
export class AppointmentPatientDto {
  fullName: string
  email: string
  phoneNumber: string
  birthDate: string        // YYYY-MM-DD
  documentNumber: string
  gender: PatientGender
}

// appointment-detail-response.dto.ts
export class AppointmentDetailResponseDto extends AppointmentResponseDto {
  patient: AppointmentPatientDto
}
```
- `AppointmentResponseDto` permanece **inalterado** (usado pela listagem).
- Exportar ambos no `index.ts` do shared.

---

## Assinaturas esperadas
**Use-case:**
- `FindAppointmentByIdUseCase.execute(id: string, currentUser: ICurrentUser): Promise<AppointmentDetailResponseDto>`

**Helpers internos (mesmo padrão dos existentes):**
- Substituir `fetchPatientName(patientId): Promise<string>` por:
  - `fetchPatientDetails(patientId): Promise<AppointmentPatientDto | null>` — raw query com `innerJoin` em `users` (`u.id = p.user_id AND u.deleted_at IS NULL`), selecionando `u.full_name`, `u.email`, `p.phone_number`, `p.birth_date`, `p.document_number`, `p.gender`, com `p.deleted_at IS NULL`.
- `toResponse(...)` passa a montar e incluir o bloco `patient`.

> Todas as queries são read-only, parametrizadas via query builder — nunca concatenar SQL.

---

## Fluxo principal

**GET /appointments/:id** (ADMIN, DOCTOR own-resource, USER leitura)
1. `clinicId = currentUser.clinicId!`.
2. `findById(id, clinicId)`; se não houver → `NotFoundException`.
3. DOCTOR → resolve o próprio `doctor` e valida `appointment.doctorId === doctor.id`; senão `ForbiddenException` (regra atual, mantida).
4. Resolve em paralelo `doctorName`, `patientDetails` (novo) e `specialtyName`.
5. Monta e retorna `AppointmentDetailResponseDto` (campos atuais + `patient`).
6. Se `fetchPatientDetails` retornar `null` (paciente soft-deleted / inconsistência), manter o comportamento atual de degradação graciosa dos demais campos: `patient` montado com strings vazias/defaults — **não** derrubar a request. (Decisão: alinhar ao padrão atual em que `patientName` cai para `''`.)

---

## Regras de negócio / definições
- `patient` só é retornado no **detalhe** (`:id`). A listagem segue com `AppointmentResponseDto`.
- `birthDate` retornado como string `YYYY-MM-DD` (coluna `date`), sem conversão de timezone.
- Nenhum dado sensível adicional além do já modelado no paciente; sem logs de PII.
- Escopo por `clinicId` preservado (já garantido por `findById`).

---

## Permissões
| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| `GET /appointments/:id` (com bloco `patient`) | ✓ | só a própria | ✓ (leitura) | ✗ |

Sem alteração na matriz de permissões — apenas enriquecimento do payload de detalhe. (Consistente com `permissions.md`: "Dados do paciente são acessados via vínculo com a consulta".)

---

## Dependências
- `IAppointmentsRepository` (`findById` já existente).
- `IDoctorsRepository` (resolução do doctor do currentUser — já injetado).
- `DataSource` para as raw queries de nome/detalhe (já injetado).

---

## Decisões técnicas da task
- **Camada:** a montagem do bloco `patient` fica no **use-case** (como os demais `fetch*Name`). Não criar repository novo só para isto.
- **Sem transação** (read-only).
- **Cache:** se houver cache de detalhe por `appointment:<id>`, invalidar/forma da chave permanece; o payload maior não muda a estratégia. (Não introduzir cache novo nesta task.)
- **DTO:** herança (`extends AppointmentResponseDto`) para não duplicar campos.

---

## Restrições
- NÃO criar tabela/migration.
- NÃO alterar `AppointmentResponseDto` nem a listagem.
- NÃO embarcar `patient` na listagem paginada.
- NÃO afrouxar a regra own-resource do DOCTOR.
- NÃO logar dados do paciente (PII).
- NÃO concatenar SQL — query builder parametrizado.
- NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
packages/shared/src/dtos/
  appointment-patient.dto.ts            # novo
  appointment-detail-response.dto.ts    # novo (extends AppointmentResponseDto)
  (index.ts exporta ambos)

apps/backend/src/modules/appointments/
  use-cases/find-appointment-by-id.use-case.ts        # fetchPatientDetails + toResponse com patient
  tests/find-appointment-by-id.use-case.spec.ts       # atualizar mocks/asserts
  tests/appointments.integration.spec.ts              # asserir bloco patient no GET :id
```

---

## Cenários de teste adicionais
### Unitários (use-case, repo/dataSource mockados)
- Retorna `AppointmentDetailResponseDto` com bloco `patient` preenchido (todos os campos).
- DOCTOR dono → retorna detalhe; DOCTOR não-dono → `ForbiddenException` (regra mantida).
- Consulta inexistente → `NotFoundException`.
- `fetchPatientDetails` retornando vazio → `patient` com defaults, sem lançar.
- `birthDate` propagado como string `YYYY-MM-DD`.
### Integração (banco de teste, seed via faker)
- `GET /appointments/:id` retorna a forma completa incluindo `patient` (fullName, email, phoneNumber, birthDate, documentNumber, gender).
- `GET /appointments` (listagem) **não** retorna `patient`.
- DOCTOR só acessa a própria consulta (own-resource); USER recebe leitura; PATIENT → bloqueado.
- Escopo por clínica: consulta de outra clínica não é acessível.

---

## Definition of Done
- [ ] `AppointmentPatientDto` e `AppointmentDetailResponseDto` exportados no `@app/shared`
- [ ] `FindAppointmentByIdUseCase` montando e retornando o bloco `patient`
- [ ] `fetchPatientDetails` com `innerJoin` em `users` e filtros de `deleted_at`
- [ ] Listagem inalterada (sem `patient`)
- [ ] Own-resource do DOCTOR preservado
- [ ] Sem migration, sem mutation, sem PII em logs
- [ ] Testes unitários (100%) + integração cobrindo os cenários
- [ ] Naming convention e arquitetura seguidas
