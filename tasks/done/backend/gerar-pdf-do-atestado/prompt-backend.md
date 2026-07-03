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
- Espelhar `gerar-pdf-da-receita` (`GeneratePrescriptionPdfUseCase` + `PrescriptionPdfBuilderService` + `LogoFetcherService`)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Gerar PDF do Atestado (Backend)

## Descrição
Adicionar geração de PDF sob demanda para os atestados da task #1. Endpoint `GET /medical-certificates/:id/pdf` com `pdfmake` → binário `application/pdf`. O corpo alterna conforme o `type` (afastamento vs comparecimento). PDF **nunca** persistido — renderizado a cada download a partir do snapshot.

## Contexto
- Continuação da task #1: `FindMedicalCertificateByIdUseCase` (RBAC own-resource) e `MedicalCertificateSnapshot` já existem.
- Espelhar o padrão de `prescriptions`: use-case de PDF + builder (`pdfmake`, fontes Roboto em `onModuleInit`) + `LogoFetcherService`. `pdfmake`/`@types/pdfmake` já instalados.

## Assinaturas esperadas
- `GenerateMedicalCertificatePdfUseCase.execute(id, currentUser): Promise<Buffer>` — reusa `FindMedicalCertificateByIdUseCase.execute(id, currentUser)` (herda 404/403), refetcha a entidade p/ o `snapshot`, busca logo base64, delega ao builder.
- `MedicalCertificatePdfBuilderService.build(snapshot, logoBase64): Promise<Buffer>` — `@Injectable() implements OnModuleInit`; fontes Roboto no `onModuleInit`; cabeçalho + corpo condicional + rodapé.
- `LogoFetcherService.fetch(logoUrl): Promise<string | null>` — **duplicar** o do módulo `prescriptions` dentro de `medical-certificates`.

## Endpoint
`GET /medical-certificates/:id/pdf` `@Roles(ADMIN, DOCTOR)`, `@CurrentUser()`, `@Res({ passthrough: false })`. Headers `Content-Type: application/pdf` e `Content-Disposition: attachment; filename="atestado-${id}.pdf"`. Body = `Buffer`.

## Layout
**Timbre (comum):** logo (se houver), nome + endereço formatado da clínica (ignorar partes `null`), título "ATESTADO MÉDICO".

**Corpo por `snapshot.type`:**
- LEAVE: "Atesto que o(a) paciente {patient.name} (CPF {documentNumber}) necessita afastar-se de suas atividades por {daysOff} dia(s), a partir de {startDate DD/MM/AAAA}." + (se `cidCode`) "CID: {cidCode}."
- ATTENDANCE: "Atesto que o(a) paciente {patient.name} (CPF {documentNumber}) compareceu a esta consulta em {attendanceDate DD/MM/AAAA}, das {checkInTime} às {checkOutTime}."
- Após o corpo: `observations` (se presente), rotulado "Observações:".

**Rodapé (comum):** "Cidade, {issuedAt DD/MM/AAAA}" (omitir cidade se `null`); assinatura/carimbo com nome do médico, "CRM {crmNumber}", especialidade (se houver). Reusar helpers de data PT-BR do builder de receitas (replicar).

## Regras
- Acesso idêntico ao GET por ID (via `FindMedicalCertificateByIdUseCase`). PDF do snapshot, nunca persistido. Campos do tipo não usado são `null` e não aparecem. Builder seleciona o corpo por `type`.

## Restrições
- NÃO persistir PDF. NÃO expor infra em erro. NÃO acessar repository sem passar pela checagem de acesso. NÃO `process.env` fora de `env.config.ts`.

## Estrutura esperada
```
modules/medical-certificates/
  use-cases/ generate-medical-certificate-pdf.use-case.ts (+ .spec)
  services/ medical-certificate-pdf-builder.service.ts (+ .spec), logo-fetcher.service.ts
  controllers/ medical-certificates.controller.ts → + GET /:id/pdf
  medical-certificates.module.ts → + providers (use-case + 2 services)
```

## Cenários de teste
- Builder: `leave` com/sem `cidCode`; `attendance` com data/horários; `observations` presente/ausente; `logoBase64 null`; endereço/cidade com partes `null`; retorna `Buffer` não vazio.
- Use-case: herda 404/403 do find; `logoUrl null` → `logoBase64 null`.
- Integração: `GET /:id/pdf` DOCTOR próprio `200` + headers corretos; DOCTOR alheio `403`; inexistente `404`; USER `403`; sem token `401`.

## Definition of Done
- [ ] `GET /:id/pdf` → `application/pdf` + `Content-Disposition` (`atestado-<id>.pdf`)
- [ ] Corpo condicional por `type`; CID e observações condicionais; timbre + rodapé
- [ ] Acesso via `FindMedicalCertificateByIdUseCase` (404/403 herdados); PDF nunca persistido
- [ ] `LogoFetcherService` no módulo; builder com fontes Roboto em `onModuleInit`
- [ ] Testes unitários (100%) builder+use-case + integração; providers no módulo
- [ ] Naming convention e estrutura seguidas
