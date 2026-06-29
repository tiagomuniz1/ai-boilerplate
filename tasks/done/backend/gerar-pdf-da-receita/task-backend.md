# Task — Geração de PDF da Receita (Backend)

## Descrição
Adicionar ao módulo `prescriptions` a **geração sob demanda do PDF** de uma receita. O endpoint gera o documento a partir do **snapshot JSON** já persistido (task #1), com **papel timbrado da clínica** (nome, endereço e logo) e **área de assinatura/carimbo** do médico (com CRM). O PDF **não é armazenado** — é renderizado a cada chamada. Biblioteca: **`pdfmake`** (backend).

---

## Contexto
- Depende da task #1 (`criar-modulo-de-receitas`): a `Prescription` já existe, com o `snapshot: PrescriptionSnapshot` denormalizado.
- O snapshot é a **única fonte** do conteúdo do PDF (dados imutáveis no momento da emissão) — a geração **não** consulta clínica/médico/paciente/medicamento ao vivo.
- **Exceção:** o binário da **logo** não está no snapshot (só a `logoUrl`); é buscado no momento da geração a partir da URL.
- Primeira geração de PDF do projeto — não há lib instalada ainda.

---

## Dependências novas (confirmar antes de instalar)
- `pdfmake` e `@types/pdfmake` (`yarn workspace @app/backend add pdfmake && yarn workspace @app/backend add -D @types/pdfmake`).

---

## Assinaturas esperadas
- `GeneratePrescriptionPdfUseCase.execute(id: string, currentUser: ICurrentUser): Promise<Buffer>`
  - Carrega a receita reutilizando a busca-com-RBAC da task #1 (`FindPrescriptionByIdUseCase` ou equivalente) — mesma regra: DOCTOR só própria consulta, ADMIN qualquer, `404` se inexistente.
  - Monta o `docDefinition` do pdfmake a partir do `snapshot` e resolve o `Buffer` do PDF.
- `PrescriptionPdfBuilderService` (serviço puro) — recebe `PrescriptionSnapshot` (+ logo em base64 opcional) e retorna o `docDefinition`/Buffer. Testável sem HTTP.
- `LogoFetcherService` (adapter com timeout) — `fetch(logoUrl: string): Promise<string | null>` (base64); falha/timeouts retornam `null` (fallback sem logo).

---

## Fluxo principal

**GET /prescriptions/:id/pdf** (ADMIN, DOCTOR)
1. Carrega a receita com RBAC (igual ao GET por id da task #1) → `404`/`403` conforme o caso.
2. Se `snapshot.clinic.logoUrl` existir → `LogoFetcherService.fetch` (axios `responseType: 'arraybuffer'`, timeout 3–5s) → base64; em erro/timeout, segue **sem** logo.
3. `PrescriptionPdfBuilderService` monta o documento e gera o `Buffer`.
4. Controller responde com:
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment; filename="receita-<id>.pdf"`
   - corpo = Buffer (usar `@Res({ passthrough: true })` + `res.send(buffer)`).

---

## Layout do PDF (a partir do snapshot)
1. **Cabeçalho/timbre:** logo (se disponível) à esquerda; nome da clínica em destaque + endereço completo formatado (`street, number - complement / neighborhood / city - state / zipCode`) — ignorar partes nulas.
2. **Título:** "Receituário".
3. **Paciente:** "Paciente: {patient.name}" e "CPF: {patient.documentNumber}".
4. **Itens (lista numerada):** para cada item → linha em destaque com `name` (+ ` — {activeIngredient}` se houver) e, abaixo, a posologia (`instructions`).
5. **Observações:** bloco com `notes` (omitir a seção se `notes` for nulo/vazio).
6. **Rodapé:** "{clinic.address.city}, {data de issuedAt por extenso}" (ex.: "São Paulo, 27 de junho de 2026"); linha de assinatura; nome do médico; "CRM {doctor.crmNumber}"; espaço reservado para carimbo. Incluir a especialidade se presente.

> Datas por extenso em pt-BR. Formatar valores nulos de endereço sem deixar separadores órfãos.

---

## Regras de negócio
- O PDF **nunca** é persistido — sempre gerado on-the-fly a partir do snapshot.
- O conteúdo reflete o snapshot (imutável), não os dados atuais da clínica/médico/paciente.
- Logo indisponível **não** quebra a geração (fallback sem logo).
- Mesma RBAC do GET por id (DOCTOR própria consulta; ADMIN qualquer; USER `403`).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Baixar PDF (GET /:id/pdf) | ✓ | ✓ própria | ✗ | ✗ |

`@Roles(ADMIN, DOCTOR)`; own-resource no use-case.

---

## Decisões técnicas da task
- **`pdfmake` server-side:** usar `pdfmake/src/printer` (`PdfPrinter`) com as fontes (Roboto via `vfs_fonts` ou fontes registradas); `printer.createPdfKitDocument(docDefinition)` → coletar chunks num `Buffer` (Promise).
- **Logo:** adapter isolado com timeout (padrão de resiliência do `backend.md`); converter para `data:image/...;base64,...` aceito pelo pdfmake.
- **Builder puro:** separar a montagem do `docDefinition` (serviço testável) do controller/streaming.
- **Sem cache** do PDF (geração barata e dados sensíveis); cache fica no recurso JSON (task #1).

---

## Restrições
- NÃO armazenar o PDF (banco, S3 ou disco).
- NÃO buscar dados ao vivo para o conteúdo — usar somente o snapshot (exceto o binário da logo).
- NÃO deixar a falha da logo derrubar o endpoint.
- NÃO acessar repository direto do controller.
- NÃO usar `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/prescriptions/
  use-cases/
    generate-prescription-pdf.use-case.ts
  services/
    prescription-pdf-builder.service.ts
    logo-fetcher.service.ts
  adapters/                       (se preferir tratar o fetch da logo como adapter)
    logo-fetcher.adapter.interface.ts
    logo-fetcher.adapter.ts
  tests/
    generate-prescription-pdf.use-case.spec.ts
    prescription-pdf-builder.service.spec.ts
```
(Adicionar a rota `GET /:id/pdf` ao `prescriptions.controller.ts` da task #1 e registrar os novos providers em `prescriptions.module.ts`.)

---

## Cenários de teste adicionais
- GET /:id/pdf como ADMIN → `200`, `Content-Type: application/pdf`, `Content-Disposition` com filename; corpo é um Buffer não-vazio começando com `%PDF`.
- GET /:id/pdf como DOCTOR próprio → `200`; como DOCTOR de outra consulta → `403`; como USER → `403`.
- GET /:id/pdf de receita inexistente → `404`.
- Builder: snapshot com logo → inclui imagem; sem `logoUrl` → gera sem logo; `notes` nulo → omite a seção; endereço parcialmente nulo → formata sem separadores órfãos; múltiplos itens → lista numerada com posologia.
- `LogoFetcherService`: timeout/erro de rede → retorna `null` (sem quebrar).

---

## Definition of Done
- [ ] `pdfmake` + `@types/pdfmake` adicionados (confirmado)
- [ ] `GET /prescriptions/:id/pdf` (`@Roles(ADMIN, DOCTOR)`) com RBAC own-resource reutilizada da task #1
- [ ] `PrescriptionPdfBuilderService` puro gera o documento a partir do snapshot
- [ ] Timbre (logo + nome + endereço da clínica) e rodapé com assinatura/CRM/carimbo + data por extenso
- [ ] `LogoFetcherService` com timeout e fallback (logo indisponível não quebra)
- [ ] PDF **não** persistido em lugar nenhum
- [ ] Headers corretos (`application/pdf`, `Content-Disposition`)
- [ ] Testes unitários (100%) do use-case e do builder; integração do endpoint (status, headers, `%PDF`, RBAC)
- [ ] Naming convention e estrutura seguidas
