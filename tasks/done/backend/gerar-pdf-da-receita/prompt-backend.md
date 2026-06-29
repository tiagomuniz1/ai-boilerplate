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
# Task — Geração de PDF da Receita (Backend)

## Descrição
Adicionar ao módulo `prescriptions` a **geração sob demanda do PDF** de uma receita, a partir do **snapshot JSON** já persistido (task #1), com **papel timbrado da clínica** (nome, endereço e logo) e **área de assinatura/carimbo** do médico (com CRM). O PDF **não é armazenado** — é renderizado a cada chamada. Biblioteca: **`pdfmake`**.

---

## Contexto
- Depende da task #1: a `Prescription` já existe com `snapshot: PrescriptionSnapshot` denormalizado.
- O snapshot é a **única fonte** do conteúdo (dados imutáveis da emissão) — **não** consultar dados ao vivo.
- **Exceção:** o binário da **logo** não está no snapshot (só `logoUrl`); é buscado na geração.
- Primeira geração de PDF do projeto.

---

## Dependências novas (confirmar antes de instalar)
- `pdfmake` + `@types/pdfmake`.

---

## Assinaturas esperadas
- `GeneratePrescriptionPdfUseCase.execute(id, currentUser): Promise<Buffer>` — carrega a receita reutilizando a busca-com-RBAC da task #1 (DOCTOR própria, ADMIN qualquer, `404` se inexistente), monta o `docDefinition` e resolve o `Buffer`.
- `PrescriptionPdfBuilderService` (puro) — `build(snapshot, logoBase64?: string | null): Promise<Buffer>` (ou retorna `docDefinition`). Testável sem HTTP.
- `LogoFetcherService` (adapter com timeout) — `fetch(logoUrl): Promise<string | null>` (base64); falha/timeout → `null`.

---

## Fluxo principal
**GET /prescriptions/:id/pdf** (ADMIN, DOCTOR)
1. Carrega a receita com RBAC (igual ao GET por id da task #1) → `404`/`403`.
2. Se `snapshot.clinic.logoUrl` → `LogoFetcherService.fetch` (axios `responseType: 'arraybuffer'`, timeout 3–5s) → base64; erro/timeout → segue **sem** logo.
3. `PrescriptionPdfBuilderService` gera o `Buffer`.
4. Controller responde: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="receita-<id>.pdf"`, corpo = Buffer (`@Res({ passthrough: true })` + `res.send(buffer)`).

---

## Layout do PDF (a partir do snapshot)
1. **Timbre:** logo (se houver) + nome da clínica + endereço completo formatado, ignorando partes nulas.
2. **Título:** "Receituário".
3. **Paciente:** nome + CPF.
4. **Itens (numerados):** `name` (+ ` — {activeIngredient}`) e, abaixo, a posologia (`instructions`).
5. **Observações:** `notes` (omitir se nulo/vazio).
6. **Rodapé:** "{city}, {issuedAt por extenso pt-BR}"; linha de assinatura; nome do médico; "CRM {crmNumber}"; espaço para carimbo; especialidade se presente.

---

## Regras de negócio
- PDF **nunca** persistido — sempre on-the-fly.
- Conteúdo reflete o snapshot (imutável).
- Logo indisponível **não** quebra a geração (fallback).
- RBAC igual ao GET por id (DOCTOR própria; ADMIN qualquer; USER `403`).

---

## Permissões

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Baixar PDF | ✓ | ✓ própria | ✗ | ✗ |

`@Roles(ADMIN, DOCTOR)`; own-resource no use-case.

---

## Decisões técnicas
- `pdfmake` server-side via `PdfPrinter` (`pdfmake/src/printer`) + fontes; `createPdfKitDocument(docDefinition)` → coletar chunks num `Buffer` (Promise).
- Logo: adapter isolado com timeout; converter para `data:image/...;base64,...`.
- Builder puro separado do controller/streaming.
- Sem cache do PDF.

---

## Restrições
- NÃO armazenar o PDF. NÃO buscar dados ao vivo (exceto logo). NÃO deixar a logo derrubar o endpoint. NÃO repository no controller. NÃO `process.env` fora de `env.config.ts`.

---

## Estrutura esperada
```
modules/prescriptions/
  use-cases/ generate-prescription-pdf.use-case.ts
  services/ prescription-pdf-builder.service.ts, logo-fetcher.service.ts
  (ou adapters/ logo-fetcher.adapter.interface.ts + logo-fetcher.adapter.ts)
  tests/ generate-prescription-pdf.use-case.spec.ts, prescription-pdf-builder.service.spec.ts
```
Adicionar `GET /:id/pdf` ao `prescriptions.controller.ts` e registrar providers no `prescriptions.module.ts`.

---

## Cenários de teste adicionais
- GET /:id/pdf ADMIN → `200`, `application/pdf`, `Content-Disposition` com filename, corpo Buffer começando com `%PDF`.
- DOCTOR próprio → `200`; DOCTOR alheio → `403`; USER → `403`; inexistente → `404`.
- Builder: com logo inclui imagem; sem `logoUrl` gera sem logo; `notes` nulo omite seção; endereço parcial sem separadores órfãos; múltiplos itens numerados com posologia.
- `LogoFetcherService`: timeout/erro → `null`.

---

## Definition of Done
- [ ] `pdfmake` + `@types/pdfmake` adicionados (confirmado)
- [ ] `GET /prescriptions/:id/pdf` (`@Roles(ADMIN, DOCTOR)`) com RBAC reutilizada da task #1
- [ ] Builder puro gera o documento a partir do snapshot
- [ ] Timbre (logo + nome + endereço) e rodapé (assinatura/CRM/carimbo + data por extenso)
- [ ] `LogoFetcherService` com timeout e fallback
- [ ] PDF não persistido
- [ ] Headers corretos
- [ ] Testes unitários (100%) e integração (status, headers, `%PDF`, RBAC)
- [ ] Naming convention e estrutura seguidas
