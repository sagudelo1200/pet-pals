/* eslint-disable no-unused-vars */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  // Extensiones para navegación por roles (perfil en Firestore)
  roles?: import('../../models/Usuario').RolUsuario[];
  profile?: import('../../models/Usuario').Usuario | null;
  hasRole?: (role: import('../../models/Usuario').RolUsuario) => boolean;
  reloadProfile?: () => Promise<void>;
}

// Tipos simples para CRUD
export interface CrudResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}