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
# Task — Seleção de Especialidade no Agendamento (Frontend)

## Descrição
Ajustar o formulário de marcação de consulta (`book-appointment-dialog.tsx`) para selecionar a **especialidade** da consulta entre as especialidades do médico. Quando o médico tem apenas uma especialidade, marcar automaticamente nela (sem fricção); com mais de uma, exigir a escolha. A especialidade é necessária para resolver o template de prontuário e para a herança da especialidade pelo prontuário.

---

## Contexto
- Hoje o `book-appointment-dialog.tsx` coleta apenas `patientId` e `reason`; `doctorId` vem do contexto da agenda; data/horário do slot.
- Backend (task B3) passou a aceitar `specialtyId?` em `CreateAppointmentDto` e a validar/auto-resolver no use-case; `AppointmentResponseDto` passou a expor `specialtyId`/`specialtyName`.
- As especialidades do médico vêm de `doctor.specialties` (via `GET /doctors/:id`, que já retorna `specialties`).
- DTOs/tipos: `IBookAppointmentInput` (em `appointment-input.types.ts`), mapper `to-book-appointment-dto`, hook `useBookAppointment`.

---

## Mudanças

### Tipos
- `IBookAppointmentInput`: adicionar `specialtyId?: string`.

### Dados do médico
- Obter as especialidades do médico selecionado. Reusar/registrar um hook do módulo de doctors (ex: `useDoctor(doctorId)`), retornando `specialties: { id, name }[]`. Buscar apenas quando o diálogo está aberto e há `doctorId`.

### Formulário (`book-appointment-dialog.tsx`)
1. Ao abrir, carregar as especialidades do médico.
2. Renderização do campo de especialidade:
   - **1 especialidade** → pré-selecionar automaticamente; campo oculto ou exibido como somente-leitura (sem exigir ação).
   - **>1** → `<select>` obrigatório (zod), placeholder "Selecione a especialidade".
   - **0** → bloquear submit e exibir alerta "Este médico não possui especialidade cadastrada".
3. Incluir `specialtyId` no payload do `mutate`.
4. Mapear erro `422` ("especialidade obrigatória"/"não pertence ao médico") para o campo/alerta.

### Schema (Zod)
- Adicionar `specialtyId` condicional: obrigatório quando há mais de uma especialidade; opcional/auto quando há uma.

### Mapper
- `to-book-appointment-dto`: incluir `specialtyId` no DTO quando presente.

---

## Estados e feedbacks
- Loading das especialidades do médico → desabilitar submit até carregar.
- `422` → alerta no diálogo / erro no campo de especialidade.
- Manter os feedbacks atuais (`409` slot já reservado, `422` horário inválido).
- Submit desabilitado enquanto `isPending` ou enquanto carrega especialidades.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Origem das especialidades | `doctor.specialties` via React Query (`useDoctor`) |
| Auto-seleção | quando `specialties.length === 1`, setar valor e ocultar campo |
| Bloqueio | quando `specialties.length === 0`, impedir submit com alerta |
| Estado | React Query para dados; react-hook-form para o campo |

---

## Restrições
- NÃO importar axios fora do API Client.
- NÃO armazenar especialidades do médico em Zustand.
- NÃO usar `useState` para o campo de especialidade — usar react-hook-form.
- NÃO quebrar os fluxos existentes do diálogo (paciente, motivo, slot, erros 409/422).
- NÃO duplicar o serviço de doctors — reutilizar o existente.

---

## Estrutura esperada (arquivos tocados/novos)
```
components/features/appointments/
  types/appointment-input.types.ts                 (+ specialtyId?)
  mappers/to-book-appointment-dto.mapper.ts        (+ specialtyId; + .spec atualizado)
  components/book-appointment-dialog.tsx           (campo de especialidade + auto-seleção)
  components/book-appointment-dialog.integration.spec.tsx (novos casos)
components/features/doctors/hooks/
  use-doctor.hook.ts                               (reutilizar/registrar se necessário)
cypress/e2e/appointments/appointments-book.cy.ts  (casos de especialidade)
```

---

## Cenários de teste adicionais
### Integração
- Médico com 1 especialidade → campo oculto/readonly, valor pré-selecionado, submit envia `specialtyId`.
- Médico com 2+ → `<select>` exibido; submit sem escolher → erro de validação; escolher → envia `specialtyId`.
- Médico com 0 → alerta e submit bloqueado.
- Erro `422` do backend → exibido no diálogo.
- Fluxos existentes (paciente obrigatório, 409, 422 de horário) seguem funcionando.
### E2E
- ADMIN agenda com médico multi-especialidade escolhendo a especialidade → consulta criada.
- ADMIN agenda com médico de especialidade única → não precisa escolher, consulta criada.

---

## Definition of Done
- [ ] `IBookAppointmentInput.specialtyId?` adicionado
- [ ] Especialidades do médico carregadas via React Query
- [ ] Auto-seleção quando única; obrigatório quando múltiplas; bloqueio quando nenhuma
- [ ] `specialtyId` no payload e no mapper
- [ ] Tratamento de `422` no diálogo
- [ ] Fluxos existentes preservados
- [ ] Testes de integração cobrindo 1/2+/0 especialidades e erros
- [ ] E2E atualizado
- [ ] Sem axios fora do API Client; nada em Zustand
- [ ] Naming convention seguida
