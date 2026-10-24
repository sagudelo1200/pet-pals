import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { ServicioNotificacion } from '@/services/firebase/firestore/colecciones/notificacion'

// Con la app abierta el aviso también se muestra como banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

/** Token de este dispositivo mientras hay sesión (para desactivarlo al salir). */
let tokenActual: string | null = null

/**
 * Pide permiso, obtiene el token de push del dispositivo y lo guarda en
 * usuarios/{uid}/dispositivos. No falla: sin permiso o en un simulador
 * simplemente no hay push (la bandeja sigue funcionando).
 * @param {string} uid Usuario con sesión.
 * @return {Promise<string | null>} El token, o null si no hay push.
 */
export async function registrarPush(uid: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status
    }
    if (status !== 'granted') return null

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    })
    await ServicioNotificacion.registrarDispositivo(uid, token, Platform.OS)
    tokenActual = token
    return token
  } catch (error) {
    console.warn('[push] No se pudo registrar el dispositivo:', error)
    return null
  }
}

/**
 * Desactiva el token de este dispositivo para que, tras cerrar sesión, no
 * reciba avisos del usuario anterior. Debe llamarse ANTES de cerrar sesión.
 * @param {string} uid Usuario que cierra sesión.
 */
export async function desactivarPush(uid: string): Promise<void> {
  if (!tokenActual) return
  try {
    await ServicioNotificacion.desactivarDispositivo(uid, tokenActual)
  } catch (error) {
    console.warn('[push] No se pudo desactivar el dispositivo:', error)
  }
  tokenActual = null
}
