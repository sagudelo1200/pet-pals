import { initializeApp, type FirebaseOptions } from 'firebase/app'
// @ts-ignore
import { initializeAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'
import { getStorage, connectStorageEmulator } from 'firebase/storage'
import Constants from 'expo-constants'
// Persistencia de la sesión entre reinicios de la app
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

// Se asegura de que el objeto extra y firebase existan y tengan la estructura esperada.
const firebaseConfigBase = Constants.expoConfig?.extra?.firebase as FirebaseOptions

// Emuladores de Firebase (solo desarrollo). Se activan con
// USE_FIREBASE_EMULATORS=true en .env (ver app.config.js); sin esa variable la
// app usa el proyecto real. En el emulador de Android el host es 10.0.2.2.
const emuladores = Constants.expoConfig?.extra?.emuladores as
  { host: string; projectId: string } | undefined

const firebaseConfig = emuladores
  ? ({ ...firebaseConfigBase, projectId: emuladores.projectId } as FirebaseOptions)
  : firebaseConfigBase

let app: any = null
let auth: any = null
let db: any = null
let rtdb: any = null
let functions: any = null
let storage: any = null

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
  storage = getStorage(app)

  if (emuladores) {
    const { host } = emuladores
    console.warn(`[firebase.config] USANDO EMULADORES DE FIREBASE en ${host}`)
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, host, 8080)
    connectDatabaseEmulator(rtdb, host, 9000)
    connectFunctionsEmulator(functions, host, 5001)
    connectStorageEmulator(storage, host, 9199)
  }
} catch (_e) {
  console.warn('[firebase.config] initializeApp falló (Firebase no disponible):', _e)
  // En ambiente de tests sin configuración de Firebase, usar objetos mock
  auth = {} as any
  db = {} as any
  rtdb = {} as any
  functions = {} as any
  storage = {} as any
}

export { auth, db, rtdb, functions, storage }
