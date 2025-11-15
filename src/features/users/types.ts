export interface CreateUserData {
  username: string
  locale: string
  isGuest?: boolean
}

export interface UserProfile {
  id: string
  username: string
  locale: string
  last_login_at?: string
}

export interface RegisterRequest {
  username?: string
  locale?: string
}

export interface RegisterResponse {
  userId: string
  token: string
}
