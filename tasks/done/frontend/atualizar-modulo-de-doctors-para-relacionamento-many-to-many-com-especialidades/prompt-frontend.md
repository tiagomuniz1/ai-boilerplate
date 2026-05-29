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
# Task — Atualizar Módulo de Doctors: Relacionamento ManyToMany com Especialidades

## Descrição

Adaptar o módulo de doctors no frontend para refletir a mudança do backend: o campo `specialty: string` foi substituído por `specialties: DoctorSpecialtyDto[]` (array de especialidades). O formulário de criação e edição passa a exibir um multi-select de especialidades; listagem e detalhes passam a renderizar múltiplas especialidades como badges.

---

## Contexto

- O backend agora retorna `specialties: { id, name }[]` em vez de `specialty: string` no `DoctorResponseDto`.
- O `CreateDoctorDto` agora recebe `specialtyIds: string[]` (obrigatório, mínimo 1 UUID).
- O `UpdateDoctorDto` agora recebe `specialtyIds?: string[]` (opcional, substitui todo o conjunto).
- O módulo de especialidades (`/components/features/specialties`) já existe com hooks e service prontos — usar `useSpecialties` para carregar a lista no formulário.
- Nenhuma nova rota de página é necessária — apenas os componentes, tipos e mappers existentes precisam ser atualizados.
- Os testes devem continuar com 100% de cobertura após as mudanças.

---

## Contratos

### Input (dados do formulário)

**ICreateDoctorInput** — alterar campo:
```diff
- specialty: string
+ specialtyIds: string[]
```

**IUpdateDoctorInput** — alterar campo:
```diff
- specialty?: string
+ specialtyIds?: string[]
```

### Output (modelo exibido na UI)

**IDoctorSpecialtyModel** (novo):
```ts
export interface IDoctorSpecialtyModel {
  id: string
  name: string
}
```

**IDoctorModel** — alterar campo:
```diff
- specialty: string
+ specialties: IDoctorSpecialtyModel[]
```

---

## Assinaturas esperadas

Sem mudança de assinatura nos hooks, use-cases e service — apenas os tipos internos mudam.

```ts
// Tipos locais atualizados
ICreateDoctorInput.specialtyIds: string[]         // antes: specialty: string
IUpdateDoctorInput.specialtyIds?: string[]        // antes: specialty?: string
IDoctorModel.specialties: IDoctorSpecialtyModel[] // antes: specialty: string

// Mappers — mesmas assinaturas, conteúdo atualizado
toDoctorModel(dto: DoctorResponseDto): IDoctorModel
toCreateDoctorDto(input: ICreateDoctorInput): CreateDoctorDto
toUpdateDoctorDto(input: IUpdateDoctorInput): UpdateDoctorDto
```

---

## Fluxo principal

### Criação (`/doctors/new`)
1. `DoctorForm` (modo create) carrega lista de especialidades via `useSpecialties({ limit: 100 })`.
2. Campo `specialtyIds` renderizado como `SpecialtyMultiSelect` — lista de checkboxes com scroll.
3. Ao menos uma especialidade deve ser selecionada — validação local via zod.
4. Submit: `specialtyIds` enviados como array de UUIDs para `useCreateDoctor`.
5. Erros de validação backend (422) mapeados para o campo `specialtyIds` via `setError`.
6. Erro 422 de ID não encontrado (`'One or more specialty IDs not found'`) → mensagem no topo do formulário.

### Edição (`/doctors/[id]/edit`)
1. `DoctorForm` (modo edit) pré-popula `specialtyIds` com os IDs das especialidades atuais do doctor.
2. Lista de especialidades disponíveis carregada via `useSpecialties({ limit: 100 })`.
3. Submit sempre envia `specialtyIds` com a seleção atual (substitui o conjunto no backend).
4. Tratamento de erros idêntico ao create.

### Listagem (`/doctors`)
- Coluna "Especialidade" passa a exibir todas as especialidades do médico como badges inline.
- Badge: `<span data-testid="doctor-specialty-badge-{specialtyId}">{name}</span>`
- Quando há mais de 2 especialidades, exibir as 2 primeiras + `+N` (ex: `+2 mais`).
- `data-testid="doctor-specialty-{doctorId}"` na célula da tabela permanece.

### Detalhes (`/doctors/[id]`)
- Seção "Especialidade" passa a exibir lista de badges com todas as especialidades.
- Substituir o `DetailRow` de especialidade por um bloco dedicado com badges.
- `data-testid="doctor-details-specialties"` no container dos badges.

---

## Componente SpecialtyMultiSelect

Componente local em `doctor-form.tsx` (não exportado), controlado via `react-hook-form Controller`.

**Props:**
```ts
interface SpecialtyMultiSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
  specialties: IDoctorSpecialtyModel[]
  isLoading: boolean
  error?: string
}
```

**Comportamento:**
- Exibe um container com scroll (max-height definida) com a lista de especialidades como checkboxes.
- Cada item: `<label>` com `<input type="checkbox">` e o nome da especialidade.
- Checkbox marcado quando o `id` está em `value`.
- Ao marcar/desmarcar: chama `onChange` com o array atualizado.
- Estado de loading: exibe texto "Carregando especialidades..." no lugar da lista.
- Nenhuma especialidade disponível (lista vazia): exibe "Nenhuma especialidade cadastrada."
- `data-testid="specialty-multiselect"` no container raiz.
- `data-testid="specialty-checkbox-{id}"` em cada checkbox.

**Integração com react-hook-form (create mode):**
```ts
<Controller
  name="specialtyIds"
  control={control}
  render={({ field }) => (
    <SpecialtyMultiSelect
      value={field.value}
      onChange={field.onChange}
      specialties={availableSpecialties}
      isLoading={isLoadingSpecialties}
      error={errors.specialtyIds?.message}
    />
  )}
/>
```

**Zod schema (create):**
```ts
specialtyIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma especialidade')
```

**Zod schema (update):**
```ts
specialtyIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma especialidade').optional()
```
> No update, `specialtyIds` sempre é enviado (nunca `undefined`) pois o campo é sempre exibido e pré-populado.

---

## Estados e feedbacks

- Loading das especialidades → texto "Carregando especialidades..." dentro do multi-select.
- Nenhuma especialidade selecionada ao submeter → erro inline `'Selecione ao menos uma especialidade'`.
- Erro 422 de ID inválido → `globalError` no topo do formulário.
- Demais estados (loading/error/success) permanecem iguais.

---

## Regras de negócio

- `specialtyIds` obrigatório na criação — mínimo 1 item.
- `specialtyIds` no update sempre inclui a seleção atual (replace semântico).
- A listagem de especialidades disponíveis usa `useSpecialties({ limit: 100 })` — carregada uma vez por montagem do formulário.
- Dados da API gerenciados via React Query — nunca via Zustand.

---

## Dependências

- `useSpecialties` hook (existente em `components/features/specialties/hooks/use-specialties.hook.ts`)
- `ISpecialtyListParams` type (existente em `components/features/specialties/types/specialty-model.types.ts`)
- `@app/shared` — `DoctorResponseDto` atualizado (com `specialties`), `CreateDoctorDto` e `UpdateDoctorDto` atualizados (com `specialtyIds`)
- React Hook Form `Controller` (para o multi-select controlado)

---

## Decisões técnicas da task

- **Multi-select como checkbox list:** Abordagem mais simples e acessível, sem dependência de biblioteca externa de combobox. Cabe dentro do padrão de componentes existentes.
- **Sem otimistic update:** Apenas invalidação após sucesso (padrão do projeto).
- **`specialtyIds` sempre enviado no update:** O campo é pré-populado no form de edição, então não há cenário onde estaria `undefined`. Simplifica a lógica de diff.
- **Cross-feature import permitido:** `DoctorForm` importa `useSpecialties` do módulo de especialidades — dados da API, não estado UI, portanto não viola a regra de Zustand.
- **Badge overflow na listagem:** Limite de 2 badges visíveis + indicador `+N` evita quebra do layout em tabelas com múltiplas especialidades.

---

## Restrições

- NÃO importar `axios` fora de `lib/api-client.ts`.
- NÃO armazenar dados de doctors ou specialties em Zustand.
- NÃO mapear DTOs dentro de componentes ou hooks — usar os mappers existentes.
- NÃO usar `useState` para campos de formulário.
- NÃO exibir `detail` técnico de erro ao usuário.
- NÃO criar novas páginas — apenas atualizar componentes existentes.
- NÃO importar de subpastas de `@app/shared` — usar apenas `import { ... } from '@app/shared'`.

---

## Estrutura de arquivos modificados

```
components/features/doctors/
  types/
    doctor-model.types.ts           ← adicionar IDoctorSpecialtyModel, atualizar IDoctorModel
    doctor-input.types.ts           ← atualizar ICreateDoctorInput e IUpdateDoctorInput

  mappers/
    to-doctor-model.mapper.ts       ← mapear dto.specialties para IDoctorSpecialtyModel[]
    to-doctor-model.mapper.spec.ts  ← atualizar mock e assertions
    to-create-doctor-dto.mapper.ts  ← specialty → specialtyIds
    to-create-doctor-dto.mapper.spec.ts ← atualizar
    to-update-doctor-dto.mapper.ts  ← specialty → specialtyIds
    to-update-doctor-dto.mapper.spec.ts ← atualizar

  use-cases/
    create-doctor.use-case.spec.ts  ← atualizar mocks (specialty → specialties)
    update-doctor.use-case.spec.ts  ← idem
    list-doctors.use-case.spec.ts   ← idem
    get-doctor.use-case.spec.ts     ← idem
    delete-doctor.use-case.spec.ts  ← idem (verificar referências)

  hooks/
    use-create-doctor.hook.spec.ts  ← atualizar mock data
    use-update-doctor.hook.spec.ts  ← idem
    use-doctors.hook.spec.ts        ← idem
    use-doctor.hook.spec.ts         ← idem
    use-delete-doctor.hook.spec.ts  ← idem (se referencia o model)

  components/
    doctor-form.tsx                     ← substituir Input specialty por SpecialtyMultiSelect
    doctor-form.integration.spec.tsx    ← atualizar para multi-select
    doctor-list.tsx                     ← coluna specialty → badges
    doctor-list.integration.spec.tsx    ← atualizar assertions
    doctor-details.tsx                  ← seção specialty → badges
    doctor-details.integration.spec.tsx ← atualizar assertions
```

> `doctors.service.ts`, `doctors.service.spec.ts`, hooks e use-cases (implementação, não specs) **não precisam de alteração** — apenas os types importados mudam.

---

## Cenários de teste adicionais

**Mappers:**
- `toDoctorModel`: mapeia `dto.specialties = [{ id, name }]` → `model.specialties = [{ id, name }]`
- `toDoctorModel`: `dto.specialties = []` → `model.specialties = []`
- `toCreateDoctorDto`: mapeia `input.specialtyIds = ['uuid1']` → `dto.specialtyIds = ['uuid1']`
- `toUpdateDoctorDto`: mapeia `input.specialtyIds = ['uuid1', 'uuid2']` → `dto.specialtyIds = ['uuid1', 'uuid2']`
- `toUpdateDoctorDto`: `input.specialtyIds = undefined` → `dto.specialtyIds = undefined`

**DoctorForm (integração):**
- Create: `SpecialtyMultiSelect` exibido com checkboxes carregados
- Create: submeter sem marcar nenhuma especialidade → erro "Selecione ao menos uma especialidade"
- Create: marcar 2 especialidades → submit inclui ambos os IDs em `specialtyIds`
- Create: loading de especialidades → texto "Carregando especialidades..." visível
- Edit: checkboxes pré-marcados com as especialidades atuais do doctor
- Edit: desmarcar uma especialidade e submeter → `specialtyIds` sem aquele ID
- Erro global (422 ID inválido) → `Alert` com mensagem no topo

**DoctorList (integração):**
- Doctor com 1 especialidade → 1 badge visível
- Doctor com 2 especialidades → 2 badges visíveis
- Doctor com 4 especialidades → 2 badges + `+2 mais`
- Doctor com 0 especialidades → célula vazia (sem erro)

**DoctorDetails (integração):**
- Exibe todas as especialidades como badges
- `data-testid="doctor-details-specialties"` presente no container

---

## Definition of Done

- [ ] `IDoctorSpecialtyModel` criado e exportado de `doctor-model.types.ts`
- [ ] `IDoctorModel.specialties` substituindo `specialty`
- [ ] `ICreateDoctorInput.specialtyIds` substituindo `specialty`
- [ ] `IUpdateDoctorInput.specialtyIds` substituindo `specialty`
- [ ] Mappers atualizados e testados
- [ ] `DoctorForm` com `SpecialtyMultiSelect` integrado ao react-hook-form via `Controller`
- [ ] Validação zod: mínimo 1 especialidade selecionada
- [ ] Loading state do multi-select funcionando
- [ ] Edit mode pré-populado com especialidades atuais
- [ ] `DoctorList` exibindo badges com overflow `+N`
- [ ] `DoctorDetails` exibindo badges de todas as especialidades
- [ ] Testes unitários com 100% de cobertura (mappers, specs de use-cases e hooks atualizados)
- [ ] Testes de integração atualizados para todos os componentes modificados
- [ ] Sem warnings de lint, `console.log` ou código comentado
- [ ] Sem erros de TypeScript
- [ ] Nenhum tipo de axios fora do API Client
- [ ] Nenhum dado de doctors ou specialties em Zustand
