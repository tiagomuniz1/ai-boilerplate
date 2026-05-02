export interface IHeaderProps {
  variant?: 'default' | 'compact'
  onLogoClick?: () => void
}

export interface IHeaderUserModel {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
}
