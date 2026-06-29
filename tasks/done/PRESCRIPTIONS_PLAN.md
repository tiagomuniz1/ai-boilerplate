# Plano — Receitas Médicas (Prescrições)

## Objetivo

Permitir que o **médico emita receitas para o paciente a partir da tela da consulta** (`/[slug]/appointments/[id]`). O médico busca medicamentos na base canônica (módulo `medications`, já existente), adiciona itens com **posologia por item** e uma **observação geral** (texto livre), e o sistema **persiste um snapshot imutável em JSON**. A qualquer momento o sistema **gera um PDF sob demanda** — papel timbrado da clínica (nome, endereço e logo) + área de assinatura/carimbo do médico (com CRM) — para download.

**O PDF nunca é armazenado.** Apenas o snapshot JSON é persistido; o PDF é renderizado a cada download a partir do snapshot. Esta é a continuação natural do módulo de medicamentos, que foi concebido como base para as receitas.

---

## Decisões centrais (confirmadas)

| Tema | Decisão |
|---|---|
| **Geração de PDF** | Backend, com `pdfmake` (nova dependência), sob demanda. Mantém o backend como fonte de verdade; CRM, endereço e logo ficam no servidor. |
| **Modelo** | **Várias receitas por consulta (1:N)**, cada uma é **snapshot imutável**. Corrigir = excluir (soft delete) e reemitir. Sem edição. |
| **Posologia** | **Por item** (instruções de cada medicamento) **+ observação geral** (texto livre da receita). |
| **Permissões** | **DOCTOR emite** (somente na própria consulta) e assina. **DOCTOR + ADMIN** visualizam/baixam/excluem. **USER** (recepção) não acessa. |
| **Armazenamento** | Snapshot **JSON** imutável no banco. **Nunca** PDF. |

**Regra adicional:** não emitir receita em consulta `CANCELLED` (→ `422`). Emissão permitida com a consulta `SCHEDULED` ou `COMPLETED` (a receita **não** é bloqueada pela conclusão, diferente do prontuário).

---

## Modelo de dados

### Entidade `Prescription` (tabela `prescriptions`)

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid | isolamento multi-tenant |
| `appointment_id` | uuid | indexado — listar por consulta |
| `patient_id` | uuid | consulta/histórico |
| `doctor_id` | uuid | consulta/histórico |
| `snapshot` | jsonb | snapshot imutável (abaixo) |
| `issued_at` | timestamptz | momento da emissão |
| `created_at` / `updated_at` | timestamptz | |
| `deleted_at` | timestamptz null | soft delete |

- **Sem `@VersionColumn`** — registro imutável, não há edição/optimistic lock.
- Colunas union (`string | null`, `Date | null`) exigem `type` explícito (regra do `backend.md` — senão TypeORM infere `"Object"` e derruba o boot).
- Segue o padrão de snapshot de `medical-records` (jsonb denormalizado).

### Snapshot JSON (`PrescriptionSnapshot`, em `@app/shared`)

Denormaliza tudo que entra no PDF, para o documento ser reproduzível mesmo que clínica/médico/medicamento mudem depois:

```ts
{
  issuedAt: string                 // ISO
  clinic: {
    name: string
    address: { street, number, complement, neighborhood, city, state, zipCode } | null
    logoUrl: string | null         // URL no S3; binário buscado na geração do PDF
  }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }   // CPF
  items: Array<{
    medicationId: string | null    // rastreabilidade p/ a base canônica
    name: string
    activeIngredient: string | null
    instructions: string           // posologia do item
  }>
  notes: string | null             // observação geral (texto livre)
}
```

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend precede o frontend porque os DTOs no `@app/shared` são contrato dos dois lados.

| # | Área | Task (pasta) | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `criar-modulo-de-receitas` | — | Entidade `Prescription` + CRUD (criar / listar-por-consulta / ver / excluir), construção do snapshot, DTOs/types no `@app/shared`, migration, cache, RBAC. |
| 2 | backend | `gerar-pdf-da-receita` | #1 | Endpoint `GET /prescriptions/:id/pdf` com `pdfmake`: timbre (logo + endereço da clínica), corpo (itens + posologia + observações), rodapé com cidade/data e área de assinatura/carimbo + CRM. |
| 3 | frontend | `criar-tela-de-receita-na-consulta` | #1, #2 | Seção "Receitas" na tela da consulta: busca/adiciona medicamentos, posologia por item, observação geral, emite, lista emitidas, baixa PDF, exclui. |

### Grafo de dependências
```
#1 ─┬─> #2 ─┐
    └───────┴─> #3
```

### Flexibilidade
- **#2** depende de **#1**. **#3** depende de **#1** (CRUD) e **#2** (endpoint de PDF para o botão de download). Recomenda-se a ordem #1 → #2 → #3.

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1752000000000-create-prescriptions-table` |

> O último timestamp do módulo de medicamentos é `1751500000000`; o de receitas vem depois.

---

## Dependências novas (a confirmar na execução da #2)
- `pdfmake` + `@types/pdfmake` — geração de PDF no backend a partir de uma definição declarativa (bom para layout de timbre).

---

## Permissões (atualizar `ai/context/permissions.md` ao final)

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir receita | ✗ | ✓ própria consulta | ✗ | ✗ |
| Listar por consulta | ✓ | ✓ própria | ✗ | ✗ |
| Ver / baixar PDF | ✓ | ✓ própria | ✗ | ✗ |
| Excluir | ✓ | ✓ própria | ✗ | ✗ |

> Só o DOCTOR emite porque a receita carrega a assinatura/CRM do médico — não faz sentido um ADMIN (sem CRM) assinar. ADMIN tem acesso de leitura/baixa para registro.

---

## Definition of Done (transversal)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura; sem `process.env` fora de `env.config.ts` (backend); sem axios fora do API Client (frontend); dados de API via React Query (nunca Zustand).
- Snapshot **sempre** persistido como JSON; **nenhum** PDF persistido.
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (adicionar a matriz de Receitas) e o `CHANGELOG.md` de cada app.
- Ao concluir cada task, mover a pasta para `tasks/done/<area>/`.
