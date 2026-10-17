import { initializeApp, type FirebaseOptions } from 'firebase/app'
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import Constants from 'expo-constants'
// Persistencia de la sesión entre reinicios de la app
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

// Se asegura de que el objeto extra y firebase existan y tengan la estructura esperada.
const firebaseConfig = Constants.expoConfig?.extra?.firebase as FirebaseOptions

let app: any = null
let auth: any = null
let db: any = null
let rtdb: any = null
let functions: any = null

try {
  if (!firebaseConfig) {
    throw new Error(
      'Firebase config not found. Make sure you have it in your app.config.ts extra section'
    )
  }

  app = initializeApp(firebaseConfig)

  // Inicializar Auth con persistencia de React Native (solo si está disponible)
  try {
    if (getReactNativePersistence && ReactNativeAsyncStorage) {
      const persistence = getReactNativePersistence(ReactNativeAsyncStorage)
      auth = initializeAuth(app, { persistence })
    } else {
      auth = initializeAuth(app, {})
    }
  } catch (_e) {
    console.warn('[firebase.config] initializeAuth falló (Auth no disponible):', _e)
    // En tests o ambientes donde Firebase no está completamente disponible, usar un mock
    auth = {} as any
  }

  db = getFirestore(app)
  rtdb = getDatabase(app)
  functions = getFunctions(app)
} catch (_e) {
  console.warn('[firebase.config] initializeApp falló (Firebase no disponible):', _e)
  // En ambiente de tests sin configuración de Firebase, usar objetos mock
  auth = {} as any
  db = {} as any
  rtdb = {} as any
  functions = {} as any
}

export { auth, db, rtdb, functions }
