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
- Espelhar `gerar-pdf-do-atestado`/`gerar-pdf-da-receita` já implementados (`GeneratePrescriptionPdfUseCase`/`PrescriptionPdfBuilderService`, `GenerateMedicalCertificatePdfUseCase`/`MedicalCertificatePdfBuilderService`)

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Gerar PDF do Pedido de Exames (Backend)

## Descrição
Adicionar geração de PDF sob demanda para as solicitações de exames, a partir do `snapshot` persistido na task de CRUD. Endpoint `GET /exam-requests/:id/pdf`, `pdfmake`, retorna `application/pdf`. Corpo lista os itens solicitados (nome + observação). PDF nunca é armazenado.

## Contexto
Continuação de `criar-modulo-de-solicitacao-de-exames`, que expõe `FindExamRequestByIdUseCase` (RBAC own-resource) e persiste `ExamRequestSnapshot`. Espelhar exatamente o padrão de `prescriptions`/`medical-certificates`: use-case reusa a busca-com-RBAC, builder com `pdfmake` + fontes Roboto em `onModuleInit`, `LogoFetcherService` duplicado dentro do módulo.

## Assinaturas esperadas
- `GenerateExamRequestPdfUseCase.execute(id, currentUser): Promise<Buffer>` — reusa `FindExamRequestByIdUseCase` (404/403), refetcha para obter `snapshot`, busca logo base64, delega ao builder.
- `ExamRequestPdfBuilderService.build(snapshot: ExamRequestSnapshot, logoBase64: string | null): Promise<Buffer>` — `@Injectable() implements OnModuleInit`; fontes Roboto no `onModuleInit`.
- `LogoFetcherService.fetch(logoUrl): Promise<string | null>` — duplicar dentro de `exams`.

## Endpoint
```
GET /exam-requests/:id/pdf   @Roles(ADMIN, DOCTOR)
```
`@CurrentUser()`; `@Res({ passthrough: false })`. Headers: `Content-Type: application/pdf`; `Content-Disposition: attachment; filename="pedido-exames-${id}.pdf"`. Body: `Buffer`.

## Layout do PDF
**Timbre:** logo (se presente) + nome/endereço da clínica + título "SOLICITAÇÃO DE EXAMES".
**Corpo:** lista numerada de `snapshot.items` (nome + observação se presente), na ordem do snapshot; se `snapshot.notes`, seção "Observações gerais:" após a lista.
**Rodapé:** "Cidade, {issuedAt DD/MM/AAAA}" (cidade do endereço; omitir se `null`); assinatura/carimbo: nome do médico, "CRM {crmNumber}", especialidade se presente.

Reutilizar helpers de formatação de data PT-BR já existentes nos builders de `prescriptions`/`medical-certificates`.

## Regras de negócio
Acesso idêntico ao GET por ID (herdado). PDF sempre do snapshot, nunca persistido. Não reflete status de resultado (isso é só na UI).

## Restrições
NÃO persistir PDF. NÃO expor infra em erro. NÃO repository direto sem checagem de acesso. NÃO axios fora de services previstos. NÃO `process.env` fora de `env.config.ts`.

## Estrutura esperada
```
modules/exams/
  use-cases/ generate-exam-request-pdf.use-case.ts (+ .spec)
  services/ exam-request-pdf-builder.service.ts (+ .spec), logo-fetcher.service.ts
  controllers/ exam-requests.controller.ts → + GET /:id/pdf
  exams.module.ts → + providers
```

## Cenários de teste
- Builder: 1 item sem observação; 3 itens com observação; `notes` presente/ausente; `logoBase64=null`; endereço com partes `null`; retorna `Buffer` não vazio.
- Use-case: reusa `FindExamRequestByIdUseCase` (404/403); `logoUrl=null` → `logoBase64=null`.
- Integração: `GET /:id/pdf` DOCTOR próprio → `200` + headers corretos; DOCTOR alheio → `403`; inexistente → `404`; USER → `403`; sem token → `401`.

## Definition of Done
- [ ] Endpoint retorna `application/pdf` com `Content-Disposition` correto
- [ ] Corpo lista todos os itens; "Observações gerais" condicional
- [ ] Timbre e rodapé (assinatura/CRM/especialidade)
- [ ] Acesso via `FindExamRequestByIdUseCase` (404/403 herdados)
- [ ] PDF nunca persistido
- [ ] Testes unitários (100%) + integração
- [ ] Providers registrados no `ExamsModule`
- [ ] Naming convention e estrutura seguidas
