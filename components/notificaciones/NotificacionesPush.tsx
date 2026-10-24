import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@/context/AuthContext'
import { registrarPush } from '@/services/notificaciones/push'
import { destinoDeAccion } from '@/logic/notificaciones/acciones'

/**
 * Sin interfaz. Mientras hay sesión: registra el dispositivo para push y abre
 * la pantalla que corresponde cuando el usuario toca un aviso push.
 */
export function NotificacionesPush(): null {
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const uid = user?.uid
  const respuesta = Notifications.useLastNotificationResponse()

  useEffect(() => {
    if (uid) void registrarPush(uid)
  }, [uid])

  useEffect(() => {
    if (!respuesta) return
    const accion = respuesta.notification.request.content.data?.accion
    const destino = destinoDeAccion(accion)
    if (destino) {
      navigation.navigate(destino.app, { screen: destino.pestana })
    } else {
      navigation.navigate('Notificaciones')
    }
  }, [respuesta, navigation])

  return null
}
