export interface IHeaderProps {
  variant?: 'default' | 'compact'
}

export interface IHeaderUserModel {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
}
