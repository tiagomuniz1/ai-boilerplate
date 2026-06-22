'use client'

import { useQuery } from '@tanstack/react-query'
import { listTemplatesUseCase } from '../use-cases/list-templates.use-case'
import type { ITemplateListParams } from '../services/medical-record-templates.service'

export function useTemplates(params?: ITemplateListParams | null) {
  return useQuery({
    queryKey: ['medical-record-templates', params],
    queryFn: () => listTemplatesUseCase(params ?? undefined),
    enabled: params !== null,
  })
}
