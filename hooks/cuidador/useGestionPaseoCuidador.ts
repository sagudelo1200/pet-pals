import { useState } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo } from '@/models/Paseo'

export const useGestionPaseoCuidador = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [cargando, setCargando] = useState(false)

  const aceptarSolicitud = async (paseo: Paseo, onSuccess?: () => void) => {
    Alert.alert(
      t('cuidador:solicitudes.aceptar'),
      t('cuidador:solicitudes.confirmar_aceptar'),
      [
        { text: t('comun:cancelar'), style: 'cancel' },
        {
          text: t('cuidador:solicitudes.aceptar'),
          onPress: async () => {
            setCargando(true)
            const res = await ServicioPaseo.aceptarSolicitud(paseo.id)
            setCargando(false)

            if (res.success) {
              Alert.alert(
                t('comun:exito'),
                t('cuidador:solicitudes.exito_aceptar'),
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (onSuccess) {
                        onSuccess()
                      } else {
                        navigation.goBack()
                      }
                    },
                  },
                ]
              )
            } else {
              Alert.alert(
                t('comun:error'),
                res.error || t('comun:error_desconocido')
              )
            }
          },
        },
      ]
    )
  }

  const rechazarSolicitud = (onSuccess?: () => void) => {
    // Por ahora solo navegación, en el futuro lógica de ignorar
    if (onSuccess) {
      onSuccess()
    } else {
      navigation.goBack()
    }
  }

  return {
    aceptarSolicitud,
    rechazarSolicitud,
    cargando,
  }
}
