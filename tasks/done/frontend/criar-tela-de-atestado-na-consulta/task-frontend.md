# Task — Atestado na Tela da Consulta (Frontend)

## Descrição
Implementar a **emissão e o download de atestados** na tela de detalhe da consulta (`/[slug]/appointments/[id]`), na **aba "Atestados"** (hoje um placeholder). O médico escolhe o **tipo** (afastamento ou comparecimento), preenche os campos do tipo, escreve observações e **emite**. Os atestados emitidos ficam listados, cada um com **Visualizar**, **Baixar PDF** e **Excluir**. Espelha a feature `prescriptions` e a `PrescriptionSection`.

---

## Contexto
- Backend (tasks #1 e #2) expõe:
  - `POST /medical-certificates` (DOCTOR) — body `{ appointmentId, type, ...campos do tipo, observations? }`
  - `GET /medical-certificates?appointmentId=` (ADMIN, DOCTOR) → `MedicalCertificateResponseDto[]`
  - `GET /medical-certificates/:id` (ADMIN, DOCTOR)
  - `GET /medical-certificates/:id/pdf` (ADMIN, DOCTOR) → **binário** `application/pdf`
  - `DELETE /medical-certificates/:id` (ADMIN, DOCTOR) → `204`
- `type`: `MedicalCertificateType` de `@app/shared` (`leave` | `attendance`).
- Roteamento por clínica: `app/[slug]/(authenticated)/...` (usar `useSlug`).
- **Pontos de integração já preparados:**
  - `app/[slug]/(authenticated)/appointments/[id]/page.tsx` — a aba `'atestados'` renderiza `AtestadosPlaceholder` (stub local a **remover**); a aba está no `tabItems` sem `count` e sem gating.
  - `components/features/appointments/components/resumo-tab.tsx` — `DocumentRow` "Atestados" com `count={0}` fixo.
- Reuso: `apiClient.getBlob` (já existe, criado nas receitas) para o download.
- DTOs do `@app/shared`: `MedicalCertificateResponseDto`, `CreateMedicalCertificateDto`, `MedicalCertificateType`, `UserRole`.

---

## Contratos (types locais)
```ts
export interface IAtestadoModel {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  type: MedicalCertificateType
  daysOff: number | null
  startDate: Date | null
  cidCode: string | null
  attendanceDate: Date | null
  checkInTime: string | null
  checkOutTime: string | null
  observations: string | null
  issuedAt: Date
  createdAt: Date
}

// Input do formulário (não reutilizar DTO do shared)
export interface ICreateAtestadoInput {
  appointmentId: string
  type: MedicalCertificateType
  // leave
  daysOff?: number
  startDate?: string
  cidCode?: string
  // attendance
  attendanceDate?: string
  checkInTime?: string
  checkOutTime?: string
  observations?: string
}
```

---

## Assinaturas esperadas
```ts
// Hooks
useAtestados(appointmentId: string): UseQueryResult<IAtestadoModel[]>
useCreateAtestado(): UseMutationResult<IAtestadoModel, IApiError, ICreateAtestadoInput>
useDeleteAtestado(appointmentId: string): UseMutationResult<void, IApiError, string>
useDownloadAtestadoPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>

// Use-cases
listAtestadosUseCase(appointmentId): Promise<IAtestadoModel[]>
createAtestadoUseCase(input): Promise<IAtestadoModel>
deleteAtestadoUseCase(id): Promise<void>
downloadAtestadoPdfUseCase(id, fileName?): Promise<void>   // dispara o download no navegador

// Service
atestadosService.{ getByAppointment(appointmentId), getById(id), create(dto), remove(id), downloadPdf(id) }
```

- `useCreateAtestado`/`useDeleteAtestado` invalidam `['atestados', appointmentId]` (delete recebe `appointmentId` como argumento do hook, como em `useDeletePrescription`).
- `downloadAtestadoPdfUseCase` usa `apiClient.getBlob('/medical-certificates/${id}/pdf')`, cria `URL.createObjectURL`, dispara `<a download>` e faz `revokeObjectURL`.

---

## Fluxo principal

### Seção na consulta (`AtestadoSection`, props `{ appointmentId, canManage, userRole }`)
1. `useAtestados(appointmentId)` → lista (ordenada por `issuedAt` desc pelo backend).
2. Estado vazio: "Nenhum atestado emitido". Loading: skeleton. Erro: alerta amigável.
3. Para cada atestado: rótulo do tipo (Afastamento/Comparecimento), data de emissão, resumo (ex.: "N dia(s) a partir de DD/MM" ou "Comparecimento em DD/MM"), botões **Visualizar**, **Baixar PDF**, **Excluir** (com confirmação).
4. Botão **Novo atestado** (apenas `isDoctor && canManage`) → abre o modal.

### Modal de emissão (`AtestadoForm`)
1. **Seletor de tipo** (`type`): Afastamento | Comparecimento. Alterna os campos exibidos.
2. **Afastamento:** `daysOff` (número, min 1, max 365), `startDate` (date), `cidCode` (texto, opcional).
3. **Comparecimento:** `attendanceDate` (date), `checkInTime` e `checkOutTime` (time "HH:MM").
4. **Observações:** textarea opcional (`observations`, max 2000).
5. Validação (zod) condicional por `type` (discriminated union): campos do tipo selecionado obrigatórios; horários no formato "HH:MM"; `checkOutTime >= checkInTime` (opcional, recomendável).
6. Submit → `useCreateAtestado` → invalida `['atestados', appointmentId]`, fecha o modal, feedback. Botão desabilitado enquanto `isPending`. Erros `422`/`403` mapeados para mensagem amigável.

### Visualizar (`AtestadoPreviewModal`)
- Modal read-only com o conteúdo renderizado conforme o `type` (texto do afastamento/comparecimento + observações).

### Baixar PDF / Excluir
- Download: `useDownloadAtestadoPdf({ id, fileName: 'atestado-<id>.pdf' })`, loading no botão, erro → alerta.
- Excluir: `AtestadoDeleteDialog` de confirmação → `useDeleteAtestado(id)` → invalida a key, feedback.

---

## Ligação nas telas existentes

### `appointments/[id]/page.tsx`
- Importar `useAtestados` e `AtestadoSection`; `const { data: atestados } = useAtestados(id)`.
- No `tabItems`, gatear a aba `atestados` atrás de `canManage` (como "Receitas") e adicionar `count: atestados?.length ?? 0`.
- Substituir `{activeTab === 'atestados' && <AtestadosPlaceholder />}` por
  `{activeTab === 'atestados' && canManage && <AtestadoSection appointmentId={id} canManage={canManage} userRole={role} />}`.
- **Remover** o stub `AtestadosPlaceholder`.
- Passar `certificateCount`/`showCertificates` ao `ResumoTab`.

### `appointments/components/resumo-tab.tsx`
- Adicionar props `certificateCount?: number` e `showCertificates: boolean`.
- Ligar a `DocumentRow` "Atestados" existente ao `count={certificateCount ?? 0}` e gateá-la por `showCertificates` (espelhando a linha "Receitas").

---

## Permissões na UI
- Renderizar `AtestadoSection` apenas para `canManage` (DOCTOR própria consulta / ADMIN) — mesmo critério do prontuário/receitas.
- Botão **Novo atestado** somente para DOCTOR (quem assina). ADMIN vê a lista, visualiza, baixa o PDF e pode excluir, mas não emite.
- Backend é a fonte de verdade — a UI apenas esconde ações.

---

## Estados e feedbacks
- Loading → skeleton; spinner nos botões de download/submit.
- Erro → `Alert`/`ErrorMessage` amigável (nunca `detail` técnico).
- Vazio → "Nenhum atestado emitido".
- Sucesso emitir/excluir → feedback + invalidação de `['atestados', appointmentId]`.
- Submit/Download desabilitados enquanto `isPending`. Confirmação obrigatória ao excluir.

---

## Decisões técnicas
| Decisão | Escolha |
|---|---|
| Dados da API | React Query — nunca Zustand |
| Form | react-hook-form + zod (discriminated union por `type`) |
| Download de PDF | `apiClient.getBlob` + `createObjectURL` (axios só no API Client) |
| Modelo | vários atestados por consulta; cada um imutável |
| Acesso | DOCTOR emite (própria); ADMIN vê/baixa/exclui |

---

## Restrições
- NÃO importar axios fora do API Client (incluindo o download binário).
- NÃO armazenar dados da API em Zustand.
- NÃO mapear DTO em componentes/hooks — usar mappers.
- NÃO usar `useState` para campos do form (só UI/seleção de tipo se necessário via `watch`).
- NÃO reutilizar DTOs do shared como tipo do formulário.
- NÃO renderizar emissão para quem não é DOCTOR da consulta.

---

## Estrutura esperada
```
components/features/atestados/
  types/ atestado-model.types.ts, atestado-input.types.ts
  services/ atestados.service.ts (+ .spec)
  mappers/ to-atestado-model.mapper.ts, to-create-atestado-dto.mapper.ts (+ .spec)
  use-cases/ list-atestados, create-atestado, delete-atestado, download-atestado-pdf (+ .spec)
  hooks/ use-atestados, use-create-atestado, use-delete-atestado, use-download-atestado-pdf (+ .spec)
  components/
    atestado-section.tsx (+ integration.spec)
    atestado-form.tsx (+ integration.spec)
    atestado-list-skeleton.tsx
    atestado-delete-dialog.tsx
    atestado-preview-modal.tsx

app/[slug]/(authenticated)/appointments/[id]/page.tsx      → aba Atestados real + count + remover placeholder
components/features/appointments/components/resumo-tab.tsx  → DocumentRow "Atestados" com count real

cypress/e2e/atestados/
  atestados-create.cy.ts, atestados-download.cy.ts, atestados-delete.cy.ts
cypress/fixtures/atestados.json
```

---

## Cenários de teste

### Unitários
- Mappers DTO↔Model: `issuedAt`/`createdAt`/`startDate`/`attendanceDate` → `Date` (datas `null` preservadas); campos do tipo não usado `null`.
- `to-create-atestado-dto` monta o body por `type` (só os campos do tipo; omite `cidCode`/`observations` vazios).
- Use-cases chamam service + mapper; `downloadAtestadoPdfUseCase` cria e revoga objectURL.
- Hooks invalidam `['atestados', appointmentId]`.

### Integração
- `AtestadoSection`: loading→skeleton; vazio→mensagem; lista renderiza (rótulo do tipo + resumo); ADMIN não vê "Novo atestado"; DOCTOR vê.
- `AtestadoForm`: alterna campos ao trocar o tipo; validação por tipo (afastamento exige `daysOff`/`startDate`; comparecimento exige data + horários); submit chama a mutation; `422`/`403` exibem mensagem.
- Download chama o service e dispara o objectURL; erro → alerta.
- Excluir pede confirmação e chama a mutation.
- `resumo-tab`: `count` de atestados reflete a lista; oculto quando `showCertificates=false`.

### E2E
- DOCTOR emite atestado de **afastamento** (dias + data + CID) → aparece na lista e no `count` da aba.
- DOCTOR emite atestado de **comparecimento** (data + horários) → aparece na lista.
- DOCTOR baixa o PDF de um atestado.
- DOCTOR exclui um atestado → some da lista.
- ADMIN vê a lista e baixa o PDF, sem botão de emitir.

---

## Definition of Done
- [ ] Aba "Atestados" real na página da consulta com `AtestadoSection` (visível p/ DOCTOR própria / ADMIN); placeholder removido; `count` na aba
- [ ] `DocumentRow` "Atestados" no resumo ligado ao count real
- [ ] Emissão (DOCTOR): seletor de tipo + campos condicionais + observações + validação por tipo
- [ ] Lista com Visualizar, Baixar PDF e Excluir (confirmação)
- [ ] Download binário via `apiClient.getBlob` (axios só no API Client) + `createObjectURL`
- [ ] Estados loading/error/empty/success + skeleton
- [ ] Botão de emitir só para DOCTOR; ADMIN somente lê/visualiza/baixa/exclui
- [ ] Mappers DTO→Model; service só via apiClient
- [ ] Dados via React Query (nunca Zustand)
- [ ] Testes unitários 100% (mappers/use-cases/hooks)
- [ ] Testes de integração por componente (loading/error/success)
- [ ] E2E dos fluxos críticos com `data-testid` (os dois tipos)
- [ ] Naming convention e estrutura seguidas
