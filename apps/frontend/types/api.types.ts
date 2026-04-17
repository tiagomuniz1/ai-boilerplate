export interface IApiError {
  status: number
  title: string
  detail: string
  errors?: Array<{ field: string; message: string }>
}
