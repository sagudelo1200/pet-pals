/* eslint-disable no-unused-vars */
export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
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
  roles?: import('../../models/Usuario').RolUsuario[]
  profile?: import('../../models/Usuario').Usuario | null
  perfilPublico?: import('../../models/PerfilPublico').PerfilPublico | null
  hasRole?: (role: import('../../models/Usuario').RolUsuario) => boolean
  recargarPerfil?: () => Promise<void>
  recargarPerfilPublico?: () => Promise<void>
  recargarUsuarioAuth?: () => Promise<AuthResult>
  ingresarConGoogle?: (credential: any) => Promise<AuthResult>
  // Campos para manejo de rol activo
  rolActivo?: import('../../models/Usuario').RolUsuario | null
  cambiarRolActivo?: (
    rol: import('../../models/Usuario').RolUsuario
  ) => Promise<boolean>
  tieneMultiplesRoles?: boolean
  rolesDisponibles?: import('../../models/Usuario').RolUsuario[]
  activandoRol?: boolean
  rolProvisional?: import('../../models/Usuario').RolUsuario | null
}

// Tipos simples para CRUD
export interface CrudResult<T = any> {
  success: boolean
  data?: T
  error?: string
}
