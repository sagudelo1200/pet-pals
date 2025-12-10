import { useState } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo } from '@/models/Paseo'

import { useAuth } from '@/context/AuthContext'
import { ServicioCrudBase } from '@/services/firebase/crud'
import { PerfilPublico } from '@/models/PerfilPublico'

export const useGestionPaseoCuidador = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const [cargando, setCargando] = useState(false)

  const aceptarSolicitud = async (paseo: Paseo, onSuccess?: () => void) => {
    if (!user) return

    setCargando(true)

    // Validación 1: Perfil Público
    const perfilRes = await ServicioCrudBase.obtenerPorId<PerfilPublico>(
      'perfil_publico',
      user.uid
    )

    if (!perfilRes.success || !perfilRes.data) {
      setCargando(false)
      Alert.alert(
        t('cuidador:solicitudes.perfil_incompleto_titulo'),
        t('cuidador:solicitudes.perfil_incompleto_desc'),
        [
          { text: t('comun:cancelar'), style: 'cancel' },
          {
            text: t('cuidador:solicitudes.ir_a_perfil'),
            onPress: () => {
              // TODO: Navegar a edición de perfil (Fase 5)
              Alert.alert(
                'Info',
                'La edición de perfil estará disponible pronto.'
              )
            },
          },
        ]
      )
      return
    }

    setCargando(false)

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
                    text: 'Aceptar',
                    onPress: () => {
                      if (onSuccess) {
                        onSuccess()
                      } else {
                        navigation.goBack()
                      }
                    },
                  },
                  {
                    text: 'Ver Agenda',
                    onPress: () => {
                      navigation.navigate('Agenda' as never)
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
