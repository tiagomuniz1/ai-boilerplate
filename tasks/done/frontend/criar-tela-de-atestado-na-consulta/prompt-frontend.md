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
- Espelhar a feature `prescriptions` e a `PrescriptionSection`

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Atestado na Tela da Consulta (Frontend)

## Descrição
Implementar emissão e download de atestados na tela da consulta (`/[slug]/appointments/[id]`), na aba "Atestados" (hoje placeholder). Dois tipos (`leave` = afastamento, `attendance` = comparecimento) selecionados no formulário, alternando os campos. Lista com Visualizar / Baixar PDF / Excluir. Espelha `prescriptions`/`PrescriptionSection`.

## Contexto
- Backend (tasks #1/#2): `POST /medical-certificates` (DOCTOR, body `{ appointmentId, type, ...campos do tipo, observations? }`), `GET ?appointmentId=` (ADMIN,DOCTOR) → `MedicalCertificateResponseDto[]`, `GET /:id`, `GET /:id/pdf` (binário `application/pdf`), `DELETE /:id` → `204`.
- `MedicalCertificateType` de `@app/shared` (`leave` | `attendance`). Roteamento por clínica (`useSlug`).
- Integração já preparada: `appointments/[id]/page.tsx` tem a aba `'atestados'` com `AtestadosPlaceholder` (remover) e `resumo-tab.tsx` tem `DocumentRow` "Atestados" com `count={0}`.
- Reuso: `apiClient.getBlob` já existe.

## Types locais
```ts
interface IAtestadoModel {
  id; appointmentId; patientId; patientName; doctorId; doctorName
  type: MedicalCertificateType
  daysOff: number | null; startDate: Date | null; cidCode: string | null
  attendanceDate: Date | null; checkInTime: string | null; checkOutTime: string | null
  observations: string | null; issuedAt: Date; createdAt: Date
}
interface ICreateAtestadoInput {
  appointmentId; type: MedicalCertificateType
  daysOff?; startDate?; cidCode?
  attendanceDate?; checkInTime?; checkOutTime?
  observations?
}
```

## Assinaturas esperadas
```ts
useAtestados(appointmentId): UseQueryResult<IAtestadoModel[]>
useCreateAtestado(): UseMutationResult<IAtestadoModel, IApiError, ICreateAtestadoInput>
useDeleteAtestado(appointmentId): UseMutationResult<void, IApiError, string>
useDownloadAtestadoPdf(): UseMutationResult<void, IApiError, { id: string; fileName?: string }>

listAtestadosUseCase(appointmentId): Promise<IAtestadoModel[]>
createAtestadoUseCase(input): Promise<IAtestadoModel>
deleteAtestadoUseCase(id): Promise<void>
downloadAtestadoPdfUseCase(id, fileName?): Promise<void>

atestadosService.{ getByAppointment, getById, create, remove, downloadPdf }
```
- Create/Delete invalidam `['atestados', appointmentId]` (delete recebe `appointmentId` no hook).
- `downloadAtestadoPdfUseCase` usa `apiClient.getBlob('/medical-certificates/${id}/pdf')` + `createObjectURL` + `<a download>` + `revokeObjectURL`.

## Fluxo

### `AtestadoSection` (props `{ appointmentId, canManage, userRole }`)
- `useAtestados` → lista; estados loading(skeleton)/error(alerta)/empty("Nenhum atestado emitido").
- Cada item: rótulo do tipo, data de emissão, resumo (afastamento "N dia(s) a partir de DD/MM" | comparecimento "Comparecimento em DD/MM"), botões Visualizar / Baixar PDF / Excluir (confirmação).
- Botão "Novo atestado" só para `isDoctor && canManage`.

### `AtestadoForm` (react-hook-form + zod, discriminated union por `type`)
- Seletor de tipo (Afastamento | Comparecimento) alterna campos.
- Afastamento: `daysOff` (min 1, max 365), `startDate` (date), `cidCode` (opcional).
- Comparecimento: `attendanceDate` (date), `checkInTime`/`checkOutTime` ("HH:MM").
- `observations` opcional (max 2000). Validação condicional por tipo; horários "HH:MM".
- Submit → `useCreateAtestado` → invalida a key, fecha modal, feedback; `isPending` desabilita; `422`/`403` → mensagem amigável.

### Visualizar / Download / Excluir
- `AtestadoPreviewModal` read-only (texto conforme o tipo + observações).
- Download `useDownloadAtestadoPdf({ id, fileName: 'atestado-<id>.pdf' })`; loading no botão; erro → alerta.
- `AtestadoDeleteDialog` → `useDeleteAtestado(id)`.

## Ligação nas telas
- `appointments/[id]/page.tsx`: `const { data: atestados } = useAtestados(id)`; aba `atestados` gated por `canManage` + `count: atestados?.length ?? 0`; trocar placeholder por `<AtestadoSection appointmentId={id} canManage={canManage} userRole={role} />` (só quando `canManage`); remover `AtestadosPlaceholder`; passar `certificateCount`/`showCertificates` ao `ResumoTab`.
- `resumo-tab.tsx`: novas props `certificateCount?`/`showCertificates`; ligar a `DocumentRow` "Atestados" ao count real e gatear por `showCertificates`.

## Permissões UI
- `AtestadoSection` só para `canManage`. "Novo atestado" só DOCTOR. ADMIN vê/visualiza/baixa/exclui, não emite.

## Decisões técnicas
React Query (nunca Zustand); react-hook-form + zod (discriminated union); download via `apiClient.getBlob` + `createObjectURL` (axios só no API Client); vários atestados por consulta, imutáveis.

## Restrições
- NÃO axios fora do API Client. NÃO dados de API em Zustand. NÃO mapear DTO em componentes/hooks. NÃO `useState` para campos do form. NÃO reutilizar DTOs do shared como tipo do form. NÃO renderizar emissão p/ quem não é DOCTOR da consulta.

## Estrutura esperada
```
components/features/atestados/
  types/ atestado-model.types.ts, atestado-input.types.ts
  services/ atestados.service.ts (+ .spec)
  mappers/ to-atestado-model.mapper.ts, to-create-atestado-dto.mapper.ts (+ .spec)
  use-cases/ list-atestados, create-atestado, delete-atestado, download-atestado-pdf (+ .spec)
  hooks/ use-atestados, use-create-atestado, use-delete-atestado, use-download-atestado-pdf (+ .spec)
  components/ atestado-section.tsx (+ integration.spec), atestado-form.tsx (+ integration.spec),
              atestado-list-skeleton.tsx, atestado-delete-dialog.tsx, atestado-preview-modal.tsx
app/[slug]/(authenticated)/appointments/[id]/page.tsx      → aba real + count + remover placeholder
components/features/appointments/components/resumo-tab.tsx  → DocumentRow "Atestados" com count real
cypress/e2e/atestados/ atestados-create.cy.ts, atestados-download.cy.ts, atestados-delete.cy.ts
cypress/fixtures/atestados.json
```

## Cenários de teste
- Unit: mappers DTO↔Model (datas → Date, `null` preservados, campos do outro tipo `null`); `to-create-atestado-dto` por tipo (omite vazios); use-cases (service+mapper, objectURL create/revoke); hooks invalidam `['atestados', appointmentId]`.
- Integração: `AtestadoSection` (loading/empty/lista; ADMIN sem "Novo atestado", DOCTOR com); `AtestadoForm` (alterna campos por tipo, validação por tipo, submit, `422`/`403`); download dispara objectURL; excluir confirma; `resumo-tab` count reflete lista.
- E2E: DOCTOR emite afastamento e comparecimento; baixa PDF; exclui; ADMIN vê/baixa sem emitir.

## Definition of Done
- [ ] Aba "Atestados" real (visível DOCTOR própria/ADMIN); placeholder removido; `count` na aba e no resumo
- [ ] Emissão DOCTOR: seletor de tipo + campos condicionais + observações + validação por tipo
- [ ] Lista com Visualizar / Baixar PDF / Excluir (confirmação)
- [ ] Download via `apiClient.getBlob` + `createObjectURL`; estados loading/error/empty/success
- [ ] Botão emitir só DOCTOR; ADMIN lê/visualiza/baixa/exclui
- [ ] Mappers DTO→Model; service só via apiClient; dados via React Query
- [ ] Testes unitários 100%, integração por componente, E2E dos dois tipos
- [ ] Naming convention e estrutura seguidas
