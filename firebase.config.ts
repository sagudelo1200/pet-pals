import { initializeApp, type FirebaseOptions } from 'firebase/app'
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getFunctions } from 'firebase/functions'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

// Se asegura de que el objeto extra y firebase existan y tengan la estructura esperada.
const firebaseConfig = Constants.expoConfig?.extra?.firebase as FirebaseOptions

if (!firebaseConfig) {
  throw new Error(
    'Firebase config not found. Make sure you have it in your app.config.ts extra section'
  )
}

const app = initializeApp(firebaseConfig)

// Inicializar Auth con persistencia de React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
})

export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const functions = getFunctions(app)
