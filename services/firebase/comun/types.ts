/* eslint-disable no-unused-vars */
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: AuthUser
}

export interface AuthContextType {
  user: AuthUser | null
  cargando: boolean
  ingresar: (email: string, password: string) => Promise<AuthResult>
  registrar: (
    email: string,
    password: string,
    displayName: string,
    fechaNacimiento?: Date
  ) => Promise<AuthResult>
  cerrarSesion: () => Promise<AuthResult>
  // Extensiones para navegación por roles (perfil en Firestore)
  roles?: import('@/models/Usuario').RolUsuario[]
  profile?: import('@/models/Usuario').Usuario | null
  hasRole?: (role: import('@/models/Usuario').RolUsuario) => boolean
  recargarPerfil?: () => Promise<void>
  ingresarConGoogle?: (credential: any) => Promise<AuthResult>
}

// Tipos simples para CRUD
export interface CrudResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
