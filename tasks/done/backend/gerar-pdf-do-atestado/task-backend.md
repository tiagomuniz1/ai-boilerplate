# Task — Gerar PDF do Atestado (Backend)

## Descrição
Adicionar a geração de PDF sob demanda para os atestados emitidos, a partir do **snapshot** persistido na task #1. Endpoint `GET /medical-certificates/:id/pdf` que renderiza o documento com `pdfmake` e retorna o binário `application/pdf`. O **corpo do documento alterna conforme o `type`** do atestado (afastamento vs comparecimento). Espelha `gerar-pdf-da-receita`.

**O PDF nunca é armazenado** — é renderizado a cada download a partir do snapshot.

---

## Contexto
- Continuação da task #1 (`criar-modulo-de-atestados`), que já expõe `FindMedicalCertificateByIdUseCase` (com RBAC own-resource) e persiste `MedicalCertificateSnapshot`.
- O módulo `prescriptions` já implementou o mesmo padrão: `GeneratePrescriptionPdfUseCase` + `PrescriptionPdfBuilderService` (`pdfmake`, fontes Roboto em `onModuleInit`) + `LogoFetcherService`. Espelhar.
- `pdfmake` + `@types/pdfmake` já são dependências do backend (adicionadas nas receitas).

---

## Assinaturas esperadas
- `GenerateMedicalCertificatePdfUseCase.execute(id, currentUser): Promise<Buffer>`
  - Reusa `FindMedicalCertificateByIdUseCase.execute(id, currentUser)` para a checagem de acesso (404/403), refetcha a entidade para obter o `snapshot`, busca o logo em base64 e delega ao builder.
- `MedicalCertificatePdfBuilderService.build(snapshot: MedicalCertificateSnapshot, logoBase64: string | null): Promise<Buffer>`
  - `@Injectable() implements OnModuleInit`; registra fontes Roboto no `onModuleInit`; compõe cabeçalho (timbre) + corpo condicional + rodapé.
- `LogoFetcherService.fetch(logoUrl: string | null): Promise<string | null>` — **duplicar** o serviço do módulo `prescriptions` dentro de `medical-certificates` (serviço pequeno, sem estado, para manter os módulos desacoplados — a arquitetura exporta use-cases, não services).

---

## Endpoint
```
GET /medical-certificates/:id/pdf   @Roles(ADMIN, DOCTOR)
```
- `@CurrentUser()`; `@Res({ passthrough: false })`.
- Headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="atestado-${id}.pdf"`.
- Body: o `Buffer` retornado pelo use-case.

---

## Layout do PDF

### Timbre (comum aos dois tipos)
- Logo da clínica (se `logoBase64` presente), nome da clínica, endereço formatado (`street, number - neighborhood, city/state - zipCode`, ignorando partes `null`).
- Título "ATESTADO MÉDICO".

### Corpo — condicional por `snapshot.type`

**LEAVE (afastamento):**
> Atesto, para os devidos fins, que o(a) paciente **{patient.name}** (CPF {documentNumber}) necessita afastar-se de suas atividades por **{daysOff} dia(s)**, a partir de **{startDate DD/MM/AAAA}**.
> _(se `cidCode`)_ CID: **{cidCode}**.

**ATTENDANCE (comparecimento):**
> Atesto, para os devidos fins, que o(a) paciente **{patient.name}** (CPF {documentNumber}) compareceu a esta consulta em **{attendanceDate DD/MM/AAAA}**, no período das **{checkInTime}** às **{checkOutTime}**.

- Após o corpo: `observations` (se presente), rotulado "Observações:".

### Rodapé (comum)
- Linha "Cidade, {issuedAt DD/MM/AAAA}" (cidade do endereço da clínica; se `null`, omitir a cidade).
- Área de assinatura/carimbo: nome do médico, "CRM {crmNumber}", especialidade (se presente).

> Reutilizar helpers de formatação de data em português já existentes no `PrescriptionPdfBuilderService` (nomes de mês PT-BR) — replicar no novo builder.

---

## Regras de negócio
- Acesso idêntico ao GET por ID: ADMIN qualquer da clínica; DOCTOR só os próprios (via `FindMedicalCertificateByIdUseCase`).
- PDF sempre renderizado do snapshot — nunca persistido.
- Campos do tipo não usado são `null` no snapshot e não aparecem no corpo.
- `daysOff`/`startDate` ausentes num snapshot `attendance` (e vice-versa) são esperados — o builder seleciona o corpo por `type`.

---

## Restrições
- NÃO persistir o PDF. NÃO expor detalhes de infra em erro. NÃO acessar repository direto no use-case sem passar pela checagem de acesso. NÃO importar `axios` fora de adapters/services já previstos. NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/medical-certificates/
  use-cases/ generate-medical-certificate-pdf.use-case.ts (+ .spec)
  services/
    medical-certificate-pdf-builder.service.ts (+ .spec)
    logo-fetcher.service.ts
  controllers/ medical-certificates.controller.ts → + GET /:id/pdf
  medical-certificates.module.ts → + providers (use-case + 2 services)
```

---

## Cenários de teste

### `MedicalCertificatePdfBuilderService`
- `type=leave` com `cidCode` → corpo de afastamento inclui dias, data e CID.
- `type=leave` sem `cidCode` → corpo sem a linha de CID.
- `type=attendance` → corpo de comparecimento com data e horários.
- `observations` presente → seção "Observações"; ausente → sem a seção.
- `logoBase64 = null` → renderiza sem logo (sem quebrar).
- Endereço com partes `null` → formatação ignora as ausentes; cidade `null` → rodapé sem cidade.
- Retorna `Buffer` não vazio.

### `GenerateMedicalCertificatePdfUseCase`
- Reusa `FindMedicalCertificateByIdUseCase` (herda 404/403).
- Busca logo e passa `logoBase64` ao builder; `logoUrl = null` → `logoBase64 = null`.

### Integração
- `GET /:id/pdf` DOCTOR próprio → `200`, `Content-Type: application/pdf`, `Content-Disposition` com `atestado-<id>.pdf`.
- `GET /:id/pdf` DOCTOR alheio → `403`; inexistente → `404`; USER → `403`; sem token → `401`.

---

## Definition of Done
- [ ] `GET /medical-certificates/:id/pdf` retorna `application/pdf` com `Content-Disposition` correto
- [ ] Corpo do PDF alterna por `type` (afastamento vs comparecimento); CID e observações condicionais
- [ ] Timbre (logo + endereço) e rodapé (assinatura/CRM/especialidade)
- [ ] Acesso reusando `FindMedicalCertificateByIdUseCase` (404/403 herdados)
- [ ] PDF nunca persistido
- [ ] `LogoFetcherService` presente no módulo; builder com fontes Roboto em `onModuleInit`
- [ ] Testes unitários (100%) do builder (cada tipo) e do use-case + integração do endpoint
- [ ] Providers registrados no `MedicalCertificatesModule`
- [ ] Naming convention e estrutura seguidas
