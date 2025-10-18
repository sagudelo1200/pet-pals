import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../firebase.config';
import { AuthResult } from './types';

export class AuthService {
  // Registro con email y contraseña
  static async registerWithEmail(email: string, password: string, displayName: string): Promise<AuthResult> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Actualizar el perfil con el nombre
      if (userCredential.user && displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: displayName,
          photoURL: userCredential.user.photoURL
        }
      };
    } catch (error: any) {
      console.error('Error en registro:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Login con email y contraseña
  static async loginWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        }
      };
    } catch (error: any) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cerrar sesión
  static async logout(): Promise<AuthResult> {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error: any) {
      console.error('Error en logout:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener usuario actual
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /* eslint-disable no-unused-vars */
  // Escuchar cambios de autenticación
  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}