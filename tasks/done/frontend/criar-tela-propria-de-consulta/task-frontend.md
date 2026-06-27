# Task — Tela própria de consulta (Frontend)

## Descrição
Mover os detalhes da consulta de um modal para uma **tela própria** (`/[slug]/appointments/[id]`). Ao clicar numa consulta na agenda continua abrindo um modal, mas **enxuto** (status, paciente, médico, data/horário) com um botão **"Ir para a consulta"** que navega para a nova tela. Na tela ficam: os **dados completos do paciente**, os detalhes da consulta, as ações de **concluir/cancelar** e a opção de **preencher/visualizar/editar o prontuário**.

A tela é montada em **seções** para servir de ponto de extensão à evolução futura (receitas, atestados, exames).

---

## Contexto
- Hoje, `AppointmentDetailsDialog` (`components/features/appointments/components/appointment-details-dialog.tsx`) concentra tudo: detalhes, concluir/cancelar e a `MedicalRecordSection` interna.
- O modal é aberto por `agenda-day-grid.tsx` e `agenda-week-grid.tsx` via estado `detailsId` → prop `appointmentId`.
- `useAppointment(id)` consome `GET /appointments/:id` (use-case `get-appointment` + service `getById`).
- **Depende da task backend `embarcar-dados-do-paciente-no-detalhe-da-consulta`**: o detalhe agora retorna o bloco `patient` (`AppointmentDetailResponseDto`).
- Padrões de tela de detalhe já existem em `app/[slug]/(authenticated)/patients/[id]/page.tsx` (back button, skeleton, `Alert`, gates por role via `auth.store`).
- Gates atuais no modal: `canManage` (ADMIN ou DOCTOR dono) e `canSeeMedicalRecord` (idem). `canAct` = `canManage && status === SCHEDULED`.

---

## Contratos (types locais)
```ts
export interface IAppointmentPatientModel {
  fullName: string
  email: string
  phoneNumber: string
  birthDate: Date
  documentNumber: string
  gender: PatientGender
}

export interface IAppointmentDetailModel extends IAppointmentModel {
  patient: IAppointmentPatientModel
}
```
- `birthDate`: converter `string (YYYY-MM-DD) → Date` no mapper.
- `IAppointmentModel` (listagem/agenda) permanece sem `patient`.

---

## Assinaturas esperadas
```ts
// Mapper
toAppointmentDetailModel(dto: AppointmentDetailResponseDto): IAppointmentDetailModel

// Use-case / service (já existem; ajustar tipo de retorno do getById para o detalhe)
getAppointmentUseCase(id): Promise<IAppointmentDetailModel>
appointmentsService.getById(id): Promise<AppointmentDetailResponseDto>

// Hook (inalterado na assinatura; passa a retornar o detalhe)
useAppointment(id): UseQueryResult<IAppointmentDetailModel>
```
Hooks de ação já existentes (reuso): `useCompleteAppointment`, `useCancelAppointment`.

---

## Fluxo principal

### Modal enxuto (na agenda)
1. Clique numa consulta → abre `AppointmentDetailsDialog` (mantido), agora **enxuto**: status badge, paciente (nome), médico, data/horário.
2. Botão primário **"Ir para a consulta"** → `router.push(\`/${slug}/appointments/${appointmentId}\`)`.
3. Remover do modal: ações de concluir/cancelar e a `MedicalRecordSection` (movidas para a tela). O modal não busca mais prontuário.

### Tela de consulta — `app/[slug]/(authenticated)/appointments/[id]/page.tsx`
1. `useParams` → `id`; `useSlug`; role/`currentDoctorId` do `auth.store`.
2. `useAppointment(id)` → estados loading (skeleton) / error (`Alert`) / success.
3. Botão "← Voltar" para `/[slug]/appointments`.
4. **Seção Dados do paciente** (`PatientInfoCard`): nome, e-mail, telefone (formatado), nascimento (`pt-BR`), documento, gênero. Visível a quem pode ver a consulta (ADMIN/USER/DOCTOR dono).
5. **Seção Detalhes da consulta**: status badge, médico, data, horário, motivo, motivo de cancelamento (quando houver).
6. **Seção Ações** (`canAct`): cancelar (abre `CancelAppointmentDialog`) e concluir. Tratar erro `422` ("Não é possível concluir uma consulta futura.").
7. **Seção Prontuário** (`canSeeMedicalRecord`): `MedicalRecordSection` extraída do modal (sem mudança de lógica) — preencher/ver/editar conforme estado e `completed`.
8. Após concluir/cancelar com sucesso: invalidação já feita pelos hooks; permanecer na tela com o status atualizado (ou voltar à agenda — **decisão:** permanecer na tela e refletir o novo status).

---

## Refactor obrigatório
- **Extrair `MedicalRecordSection`** de `appointment-details-dialog.tsx` para `components/features/appointments/components/medical-record-section.tsx`, exportada e reutilizável (mantendo `templateFieldToRecordField` e os modais internos de form/view do prontuário). A página e (se necessário) outros pontos passam a importá-la.
- O `appointment-details-dialog.tsx` deixa de depender dos hooks de prontuário e de complete/cancel.

---

## Permissões (UI espelha o backend)
| Elemento | ADMIN | DOCTOR dono | DOCTOR não-dono | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|:---:|
| Abrir a tela / ver detalhes + paciente | ✓ | ✓ | ✗ (backend 403) | ✓ (leitura) | ✗ |
| Concluir / Cancelar | ✓ | ✓ (SCHEDULED) | ✗ | ✗ | ✗ |
| Prontuário (preencher/ver/editar) | ✓ | ✓ | ✗ | ✗ | ✗ |

- Reutilizar `canManage` / `canSeeMedicalRecord` / `canAct` da lógica atual do modal.
- USER vê paciente + detalhes em leitura; não vê prontuário nem ações.

---

## Estados e feedbacks
- Loading: skeleton da tela (cabeçalho + grid de campos), igual padrão de `patients/[id]`.
- Erro ao carregar: `Alert` amigável.
- Concluir `422`: "Não é possível concluir uma consulta futura."
- Prontuário: `409` "Esta consulta já possui prontuário."; `422` "Prontuário não pode ser editado após a conclusão da consulta." (comportamento atual da `MedicalRecordSection`).
- Botões desabilitados enquanto `isPending`.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Navegação | `router.push` para a tela; modal apenas como atalho |
| Bloco paciente | vem do detalhe da consulta (`patient`) — **não** chamar `/patients` |
| Reuso de prontuário | `MedicalRecordSection` extraída para componente próprio |
| Conversão de tipos | mapper converte `birthDate` string→Date |
| Role | own-resource respeitado; UI esconde o que o backend bloquearia |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar dados da consulta/paciente em Zustand.
- NÃO chamar `/patients` para obter dados do paciente (usar o bloco `patient` do detalhe).
- NÃO mapear DTO em componentes/hooks — usar mapper.
- NÃO exibir prontuário ou ações para USER/PATIENT.
- NÃO duplicar a lógica da `MedicalRecordSection` — extrair e reutilizar.

---

## Estrutura esperada
```
app/[slug]/(authenticated)/appointments/[id]/
  page.tsx                                            # nova tela (+ integration spec)

components/features/appointments/
  types/appointment-model.types.ts                   # + IAppointmentDetailModel, IAppointmentPatientModel
  mappers/to-appointment-detail-model.mapper.ts       # novo (+ .spec)
  use-cases/get-appointment.use-case.ts               # retorno → IAppointmentDetailModel
  services/appointments.service.ts                    # getById → AppointmentDetailResponseDto
  components/
    appointment-details-dialog.tsx                    # enxuto + botão "Ir para a consulta"
    medical-record-section.tsx                        # EXTRAÍDO do dialog (+ integration spec)
    patient-info-card.tsx                             # novo (+ integration spec)
    appointment-detail-actions.tsx                    # (opcional) concluir/cancelar da tela

cypress/e2e/appointments/
  appointment-detail.cy.ts                            # fluxo: clique → modal → tela → prontuário
```

---

## Cenários de teste adicionais
### Unitários
- `toAppointmentDetailModel`: mapeia bloco `patient`; converte `birthDate` string→Date.
- `getAppointmentUseCase` chama service + mapper de detalhe.
### Integração (componentes)
- Página: loading→skeleton; erro→`Alert`; success renderiza paciente + detalhes.
- `PatientInfoCard` exibe os campos formatados (telefone, nascimento pt-BR).
- Gates: ADMIN/DOCTOR dono veem ações + prontuário; USER vê só leitura (sem prontuário/ações).
- `MedicalRecordSection` (no novo arquivo) mantém os fluxos preencher/ver/editar + `409`/`422`.
- Modal enxuto: renderiza resumo + botão "Ir para a consulta" que navega (mock do router).
### E2E
- Clique na consulta → modal → "Ir para a consulta" → tela com dados do paciente.
- DOCTOR preenche prontuário na tela → reflete no histórico do paciente.
- Concluir consulta passada → status atualiza; concluir futura → mensagem de erro.

---

## Definition of Done
- [ ] Nova rota `/[slug]/appointments/[id]` com seções paciente/detalhes/ações/prontuário
- [ ] Modal enxuto com botão "Ir para a consulta" (sem ações/prontuário)
- [ ] `MedicalRecordSection` extraída para componente próprio e reutilizada
- [ ] `IAppointmentDetailModel` + mapper convertendo `birthDate`
- [ ] Dados do paciente vindos do bloco `patient` do detalhe (sem chamar `/patients`)
- [ ] Gates por role (ADMIN/DOCTOR dono/USER) espelhando o backend
- [ ] Estados loading/error/success + skeleton
- [ ] Tratamento de `422` (concluir) e `409`/`422` (prontuário)
- [ ] Testes unitários 100% (mapper/use-case) + integração por componente
- [ ] E2E do fluxo crítico com `data-testid`
- [ ] Sem axios fora do API Client; nada da consulta/paciente em Zustand
- [ ] Naming convention e estrutura seguidas
