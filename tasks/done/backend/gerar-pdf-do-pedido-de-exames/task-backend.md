# Task — Gerar PDF do Pedido de Exames (Backend)

## Descrição
Adicionar a geração de PDF sob demanda para as solicitações de exames, a partir do **snapshot** persistido na task #1 (`criar-modulo-de-solicitacao-de-exames`). Endpoint `GET /exam-requests/:id/pdf` que renderiza o documento com `pdfmake` e retorna o binário `application/pdf`. O corpo lista os **itens solicitados** (nome + observação). Espelha `gerar-pdf-do-atestado`/`gerar-pdf-da-receita`.

**O PDF nunca é armazenado** — é renderizado a cada download a partir do snapshot.

---

## Contexto
- Continuação da task #1 (`criar-modulo-de-solicitacao-de-exames`), que já expõe `FindExamRequestByIdUseCase` (com RBAC own-resource) e persiste `ExamRequestSnapshot`.
- Os módulos `prescriptions`/`medical-certificates` já implementam o mesmo padrão: `Generate<X>PdfUseCase` + `<X>PdfBuilderService` (`pdfmake`, fontes Roboto em `onModuleInit`) + `LogoFetcherService`. Espelhar.
- `pdfmake` + `@types/pdfmake` já são dependências do backend (adicionadas nas receitas).

---

## Assinaturas esperadas
- `GenerateExamRequestPdfUseCase.execute(id, currentUser): Promise<Buffer>`
  - Reusa `FindExamRequestByIdUseCase.execute(id, currentUser)` para a checagem de acesso (404/403), refetcha a entidade para obter o `snapshot`, busca o logo em base64 e delega ao builder.
- `ExamRequestPdfBuilderService.build(snapshot: ExamRequestSnapshot, logoBase64: string | null): Promise<Buffer>`
  - `@Injectable() implements OnModuleInit`; registra fontes Roboto no `onModuleInit`; compõe cabeçalho (timbre) + lista de itens + rodapé.
- `LogoFetcherService.fetch(logoUrl: string | null): Promise<string | null>` — **duplicar** o serviço já existente em `prescriptions`/`medical-certificates` dentro de `exams` (serviço pequeno, sem estado — a arquitetura exporta use-cases, não services, entre módulos).

---

## Endpoint
```
GET /exam-requests/:id/pdf   @Roles(ADMIN, DOCTOR)
```
- `@CurrentUser()`; `@Res({ passthrough: false })`.
- Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="pedido-exames-${id}.pdf"`.
- Body: o `Buffer` retornado pelo use-case.

---

## Layout do PDF

### Timbre
- Logo da clínica (se `logoBase64` presente), nome da clínica, endereço formatado (`street, number - neighborhood, city/state - zipCode`, ignorando partes `null`).
- Título "SOLICITAÇÃO DE EXAMES".

### Corpo
- Lista numerada dos itens do `snapshot.items`, na ordem em que foram cadastrados: nome do exame + observação (se presente).
- Se `snapshot.notes` presente, seção "Observações gerais:" após a lista.

### Rodapé (comum)
- Linha "Cidade, {issuedAt DD/MM/AAAA}" (cidade do endereço da clínica; se `null`, omitir a cidade).
- Área de assinatura/carimbo: nome do médico, "CRM {crmNumber}", especialidade (se presente).

> Reutilizar helpers de formatação de data em português já existentes no `PrescriptionPdfBuilderService`/`MedicalCertificatePdfBuilderService` (nomes de mês PT-BR) — replicar no novo builder.

---

## Regras de negócio
- Acesso idêntico ao GET por ID: ADMIN qualquer da clínica; DOCTOR só os próprios (via `FindExamRequestByIdUseCase`).
- PDF sempre renderizado do snapshot — nunca persistido.
- A lista de itens no PDF vem sempre do snapshot (imutável) — o PDF do pedido **não reflete** o status de resultado (isso é tratado só na tela, não neste documento).

---

## Restrições
- NÃO persistir o PDF. NÃO expor detalhes de infra em erro. NÃO acessar repository direto no use-case sem passar pela checagem de acesso. NÃO importar `axios` fora de adapters/services já previstos. NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/exams/
  use-cases/ generate-exam-request-pdf.use-case.ts (+ .spec)
  services/
    exam-request-pdf-builder.service.ts (+ .spec)
    logo-fetcher.service.ts
  controllers/ exam-requests.controller.ts → + GET /:id/pdf
  exams.module.ts → + providers (use-case + 2 services)
```

---

## Cenários de teste

### `ExamRequestPdfBuilderService`
- 1 item sem observação → corpo lista o nome só.
- 3 itens, alguns com observação → cada um formatado corretamente, na ordem do snapshot.
- `notes` presente → seção "Observações gerais"; ausente → sem a seção.
- `logoBase64 = null` → renderiza sem logo (sem quebrar).
- Endereço com partes `null` → formatação ignora as ausentes; cidade `null` → rodapé sem cidade.
- Retorna `Buffer` não vazio.

### `GenerateExamRequestPdfUseCase`
- Reusa `FindExamRequestByIdUseCase` (herda 404/403).
- Busca logo e passa `logoBase64` ao builder; `logoUrl = null` → `logoBase64 = null`.

### Integração
- `GET /:id/pdf` DOCTOR próprio → `200`, `Content-Type: application/pdf`, `Content-Disposition` com `pedido-exames-<id>.pdf`.
- `GET /:id/pdf` DOCTOR alheio → `403`; inexistente → `404`; USER → `403`; sem token → `401`.

---

## Definition of Done
- [ ] `GET /exam-requests/:id/pdf` retorna `application/pdf` com `Content-Disposition` correto
- [ ] Corpo lista todos os itens do snapshot (nome + observação); "Observações gerais" condicional
- [ ] Timbre (logo + endereço) e rodapé (assinatura/CRM/especialidade)
- [ ] Acesso reusando `FindExamRequestByIdUseCase` (404/403 herdados)
- [ ] PDF nunca persistido
- [ ] `LogoFetcherService` presente no módulo; builder com fontes Roboto em `onModuleInit`
- [ ] Testes unitários (100%) do builder e do use-case + integração do endpoint
- [ ] Providers registrados no `ExamsModule`
- [ ] Naming convention e estrutura seguidas
