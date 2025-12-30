import { useState } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { ServicioPaseo, ServicioCrudBase } from '@/services/firebase'
import { Paseo } from '@/models/Paseo'

import { useAuth } from '@/context/AuthContext'
import { PerfilPublico } from '@/models/PerfilPublico'
import { useGestorPaseoActivo } from '@/hooks/paseos/useGestorPaseoActivo'

export const useGestionPaseoCuidador = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { user } = useAuth()
  const gestor = useGestorPaseoActivo()
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
            
            // Usamos el gestor para aceptar
            gestor.gestion.seleccionar(paseo)
            const res = await gestor.acciones.aceptar()
            
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
                    // TODO: Actualizar cuando la navegación a Agenda esté lista
                    onPress: () => {
                      navigation.navigate('Agenda' as never)
                    },
                  },
                ]
              )
            } else {
              // Limpiar gestor si falla, aunque el estado no habrá cambiado
              gestor.gestion.limpiar()
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

  const rechazarSolicitud = (
    paseoOrId?: Paseo | string,
    onSuccess?: () => void
  ) => {
    const paseoId = typeof paseoOrId === 'string' ? paseoOrId : paseoOrId?.id

    // Registrar evento de rechazo solo si la solicitud es directa.
    ;(async () => {
      try {
        if (paseoOrId && typeof paseoOrId !== 'string') {
          const paseo = paseoOrId as Paseo
          const tipo = (paseo as any).tipo_solicitud
          const esDirecta = tipo === 'DIRECTA' || !!paseo.id_cuidador
          if (esDirecta && paseo.id) {
            await ServicioPaseo.registrarEvento(paseo.id, 'RECHAZAR', {
              motivo: 'RECHAZADO_POR_CUIDADOR',
            })
          }
        } else if (paseoId) {
          // Si solo tenemos ID, conservador: registrar evento (si el servidor lo permite)
          await ServicioPaseo.registrarEvento(paseoId, 'RECHAZAR', {
            motivo: 'RECHAZADO_POR_CUIDADOR',
          })
        }
      } catch (_e) {
        // no bloquear navegación por fallos de logging
      }

      if (onSuccess) {
        onSuccess()
      } else {
        navigation.goBack()
      }
    })()
  }

  return {
    aceptarSolicitud,
    rechazarSolicitud,
    cargando,
  }
}
