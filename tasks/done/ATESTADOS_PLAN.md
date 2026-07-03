# Plano — Atestados Médicos da Consulta

## Objetivo

Permitir que o **médico emita atestados para o paciente a partir da tela da consulta** (`/[slug]/appointments/[id]`). O sistema suporta **dois tipos** de atestado, selecionados no momento da emissão:

- **Afastamento** (`leave`) — certifica que o paciente precisa afastar-se das atividades por N dias a partir de uma data, com **CID opcional** (texto livre) e observações.
- **Comparecimento** (`attendance`) — certifica que o paciente compareceu à consulta em determinada data, com horário de entrada e saída, e observações.

O sistema **persiste um snapshot imutável em JSON** e **gera um PDF sob demanda** — papel timbrado da clínica (nome, endereço e logo) + área de assinatura/carimbo do médico (com CRM) — para download. O corpo do PDF **alterna conforme o tipo**.

**O PDF nunca é armazenado.** Apenas o snapshot JSON é persistido; o PDF é renderizado a cada download a partir do snapshot. Esta feature espelha o módulo de **receitas (`prescriptions`)** quase por completo (documento emitido pelo médico, vinculado à consulta, snapshot imutável, PDF sob demanda).

---

## Decisões centrais (confirmadas)

| Tema | Decisão |
|---|---|
| **Tipos** | **Dois tipos** via campo `type`: `leave` (afastamento) e `attendance` (comparecimento). Formulário e PDF alternam pelos campos do tipo. |
| **Templates** | **Sem** módulo de modelos reutilizáveis nesta versão (v1) — apenas emissão dentro da consulta. |
| **Modelo** | **Vários atestados por consulta (1:N)**, cada um é **snapshot imutável**. Corrigir = excluir (soft delete) e reemitir. Sem edição. |
| **CID** | Texto livre opcional no tipo `leave` — **não há catálogo de CID** no sistema. |
| **Geração de PDF** | Backend, com `pdfmake` (já usado nas receitas), sob demanda. CRM, endereço e logo ficam no servidor. |
| **Permissões** | **DOCTOR emite** (somente na própria consulta) e assina. **DOCTOR + ADMIN** visualizam/baixam/excluem. **USER** (recepção) não acessa. |
| **Armazenamento** | Snapshot **JSON** imutável no banco. **Nunca** PDF. |

**Regra adicional:** não emitir atestado em consulta `CANCELLED` (→ `422`). Emissão permitida com a consulta `SCHEDULED` ou `COMPLETED` (o atestado **não** é bloqueado pela conclusão, diferente do prontuário).

---

## Modelo de dados

### Enum `MedicalCertificateType` (`packages/shared/src/enums/medical-certificate-type.enum.ts`)

```ts
export enum MedicalCertificateType {
  LEAVE = 'leave',           // afastamento
  ATTENDANCE = 'attendance', // comparecimento
}
```

### Entidade `MedicalCertificate` (tabela `medical_certificates`)

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
- Sem relations TypeORM — FKs como uuid puro (mesmo padrão de `prescriptions`).

### Snapshot JSON (`MedicalCertificateSnapshot`, em `@app/shared`)

Denormaliza tudo que entra no PDF, para o documento ser reproduzível mesmo que clínica/médico mudem depois:

```ts
export interface MedicalCertificateSnapshot {
  issuedAt: string                 // ISO
  type: MedicalCertificateType
  clinic: {
    name: string
    address: {
      street: string | null
      number: string | null
      complement: string | null
      neighborhood: string | null
      city: string | null
      state: string | null
      zipCode: string | null
    } | null
    logoUrl: string | null         // URL no S3; binário buscado na geração do PDF
  }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }   // CPF
  // Campos do tipo LEAVE (afastamento)
  daysOff: number | null
  startDate: string | null         // ISO date (YYYY-MM-DD)
  cidCode: string | null           // texto livre, opcional
  // Campos do tipo ATTENDANCE (comparecimento)
  attendanceDate: string | null    // ISO date (YYYY-MM-DD)
  checkInTime: string | null       // "HH:MM"
  checkOutTime: string | null      // "HH:MM"
  observations: string | null      // texto livre, opcional
}
```

> Os campos do tipo **não** usado ficam `null`. O `type` determina quais são preenchidos, e o PDF alterna o corpo por `type`.

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend precede o frontend porque os DTOs no `@app/shared` são contrato dos dois lados.

Cada task é uma pasta com dois arquivos: `task-<area>.md` (especificação completa) e `prompt-<area>.md` (cabeçalho de execução + a especificação, arquivo a ser enviado ao agente de implementação). Estrutura: `tasks/backend/<task>/` e `tasks/frontend/<task>/`, espelhando `tasks/done/`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

| # | Área | Task (pasta) | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `criar-modulo-de-atestados` | — | Entidade `MedicalCertificate` + CRUD (emitir / listar-por-consulta / ver / excluir), construção do snapshot por tipo, enum + DTOs/types no `@app/shared`, migration, cache, RBAC. |
| 2 | backend | `gerar-pdf-do-atestado` | #1 | Endpoint `GET /medical-certificates/:id/pdf` com `pdfmake`: timbre (logo + endereço da clínica), **corpo condicional por tipo** (afastamento vs comparecimento), rodapé com cidade/data e área de assinatura/carimbo + CRM. |
| 3 | frontend | `criar-tela-de-atestado-na-consulta` | #1, #2 | Aba "Atestados" na tela da consulta: seletor de tipo, campos por tipo, emite, lista emitidos, baixa PDF, exclui. Liga o `count` na aba e no card de resumo. |

### Grafo de dependências
```
#1 ─┬─> #2 ─┐
    └───────┴─> #3
```

### Flexibilidade
- **#2** depende de **#1**. **#3** depende de **#1** (CRUD) e **#2** (endpoint de PDF para o botão de download). Ordem recomendada: #1 → #2 → #3.

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1752800000000-create-medical-certificates-table` |

> O último timestamp existente é `1752700000000` (prescription-templates); o de atestados vem depois.

---

## Dependências novas
- Nenhuma. `pdfmake` + `@types/pdfmake` já foram adicionados na feature de receitas.

---

## Ponto de integração no frontend (já preparado)

A aba **Atestados** e a linha "Atestados" no card "Documentos da consulta" já existem como placeholders:
- `apps/frontend/app/[slug]/(authenticated)/appointments/[id]/page.tsx` — tab id `'atestados'` renderizando `AtestadosPlaceholder` (stub local, a remover).
- `apps/frontend/components/features/appointments/components/resumo-tab.tsx` — `DocumentRow` "Atestados" com `count={0}` (a ligar ao count real).

---

## Permissões (atualizar `ai/context/permissions.md` ao final)

Nova seção **"Atestados (`/medical-certificates`)"**:

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Emitir atestado | ✗ | ✓ própria consulta | ✗ | ✗ |
| Listar por consulta | ✓ | ✓ própria | ✗ | ✗ |
| Ver / baixar PDF | ✓ | ✓ própria | ✗ | ✗ |
| Excluir | ✓ | ✓ própria | ✗ | ✗ |

> Só o DOCTOR emite porque o atestado carrega a assinatura/CRM do médico — não faz sentido um ADMIN (sem CRM) assinar. ADMIN tem acesso de leitura/baixa para registro.

---

## Definition of Done (transversal)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura; sem `process.env` fora de `env.config.ts` (backend); sem axios fora do API Client (frontend); dados de API via React Query (nunca Zustand).
- Snapshot **sempre** persistido como JSON; **nenhum** PDF persistido.
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (adicionar a matriz de Atestados) e o `CHANGELOG.md` de cada app.
- Ao concluir cada task, mover os arquivos `task-*`/`prompt-*` correspondentes para `tasks/done/`.
