import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '../firebase/auth';
import { AuthUser, AuthContextType, AuthResult } from '../firebase/types';

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

// Props del provider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Escuchar cambios de autenticación cuando se monta el componente
  useEffect(() => {
    
    const unsubscribe = AuthService.onAuthStateChange((firebaseUser: User | null) => {
      
      if (firebaseUser) {
        // Si hay usuario, crear el objeto AuthUser
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(authUser);
      } else {
        // No hay usuario autenticado
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup: desuscribirse cuando se desmonte el componente
    return unsubscribe;
  }, []);
  
  // Función para login
  const login = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    const result = await AuthService.loginWithEmail(email, password);
    setLoading(false);
    return result;
  };

  // Función para registro
  const register = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    setLoading(true);
    const result = await AuthService.registerWithEmail(email, password, displayName);
    setLoading(false);
    return result;
  };

  // Función para logout
  const logout = async (): Promise<AuthResult> => {
    setLoading(true);
    const result = await AuthService.logout();
    setLoading(false);
    return result;
  };

  // Valor que se pasa al contexto
  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};