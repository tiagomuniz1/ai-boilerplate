import { useMutation, useQueryClient } from '@tanstack/react-query'
import { themesService } from '../services/themes.service'

export function useDeleteTheme() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => themesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] })
    },
  })
}
