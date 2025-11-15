export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  userId: string
  sessionToken: string
}

export interface RegisterRequest {
  username: string
  password: string
  locale?: string
}

export interface RegisterResponse {
  userId: string
  sessionToken: string
}

export interface PasswordResetRequest {
  username: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface UserProfile {
  id: string
  username: string
  locale: string
  last_login_at: string | null
}
