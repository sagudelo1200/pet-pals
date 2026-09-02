import React, { useCallback, useEffect, useState } from 'react'
import { Modal, View, StyleSheet, Platform, Alert } from 'react-native'
import { BlurView } from 'expo-blur'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase.config'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'
import { useMonitorPaseoGlobal } from '@/hooks/paseos/useMonitorPaseoGlobal'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { ServicioPerfilPublico } from '@/services/firebase'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { TutorTabParamList } from '@/navigation/types'

interface ReputacionCuidador {
  promedio: number
  cantidad: number
}

/**
 * Overlay global del tutor al finalizar un paseo (estado FINALIZADO).
 * - Muestra la reputación actual del cuidador (prueba social).
 * - La evaluación se envía SOLO cuando el tutor CONFIRMA las estrellas
 *   (nunca al tocar una estrella, para evitar envíos por tap accidental).
 * - Tras enviar, muestra el impacto: el nuevo promedio calculado localmente.
 */
export const GlobalPaseoManager = () => {
  const { showFinishedModal, paseo, handleClose } = useMonitorPaseoGlobal()
  const navigation = useNavigation<BottomTabNavigationProp<TutorTabParamList>>()
  const { t } = useTranslation()

  const [ratingPrevio, setRatingPrevio] = useState<ReputacionCuidador | null>(
    null
  )
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [nuevoPromedio, setNuevoPromedio] = useState<number | null>(null)

  const paseoId = paseo?.id
  const original = (paseo as any)?.original as Record<string, any> | undefined
  const cuidadorId: string | undefined = original?.id_cuidador
  const cuidadorNombre = paseo?.cuidador?.nombre || 'El cuidador'
  const mascotaNombre =
    original?.mascota_nombre_visual ||
    (paseo?.mascota_ids && paseo.mascota_ids[0]) ||
    'Tu mascota'

  // Al abrir el modal: resetear estado y leer la reputación del cuidador
  useEffect(() => {
    if (!showFinishedModal || !cuidadorId) return undefined
    let activo = true
    setEnviado(false)
    setEnviando(false)
    setNuevoPromedio(null)
    setRatingPrevio(null)

    ServicioPerfilPublico.obtenerPorId(cuidadorId)
      .then(res => {
        if (!activo || !res.success || !res.data) return
        const perfil = res.data as any
        const promedio = typeof perfil.rating_promedio === 'number' ? perfil.rating_promedio : 0
        const cantidad =
          typeof perfil.cantidad_paseos_realizados === 'number'
            ? perfil.cantidad_paseos_realizados
            : 0
        setRatingPrevio({ promedio, cantidad })
      })
      .catch(() => {
        // Sin reputación disponible: se omite la prueba social
      })

    return () => {
      activo = false
    }
  }, [showFinishedModal, cuidadorId])

  const enviarRating = useCallback(
    async (rating: number, comentarioPrivado?: string) => {
      if (!paseoId || !cuidadorId || enviando || enviado) return
      setEnviando(true)
      try {
        const crearEvaluacion = httpsCallable(functions, 'crearEvaluacion')
        const resultado = (await crearEvaluacion({
          tipo: 'evaluacion_cuidador',
          objetivo: cuidadorId,
          contextoId: paseoId,
          rating,
          comentario: '',
          comentario_privado: comentarioPrivado,
        })) as { data: { success: boolean } }

        if (resultado.data.success) {
          // Impacto inmediato: nuevo promedio calculado localmente
          const prev = ratingPrevio
          const nuevo =
            prev && prev.cantidad > 0
              ? Math.round(
                  ((prev.promedio * prev.cantidad + rating) /
                    (prev.cantidad + 1)) *
                    100
                ) / 100
              : rating
          setNuevoPromedio(nuevo)
          setEnviado(true)
        }
      } catch (error) {
        const code = (error as { code?: string })?.code
        if (code === 'already-exists') {
          // Ya se evaluó antes: se trata como éxito silencioso
          setNuevoPromedio(ratingPrevio?.promedio ?? null)
          setEnviado(true)
        } else {
          console.error('Error creando evaluación:', error)
          Alert.alert(
            t('evaluaciones:error_creando', 'No se pudo enviar la calificación')
          )
        }
      } finally {
        setEnviando(false)
      }
    },
    [paseoId, cuidadorId, enviando, enviado, ratingPrevio, t]
  )

  // Confirmación explícita (la tarjeta la llama al confirmar) + fricción
  // anti-troll para calificaciones bajas (1-2★)
  const handleRate = useCallback(
    (rating: number, comentarioPrivado?: string) => {
      if (enviando || enviado) return
      if (rating <= 2) {
        Alert.alert(
          t('evaluaciones:confirmar_baja_titulo'),
          t('evaluaciones:confirmar_baja_mensaje', { rating }),
          [
            { text: t('comun:boton.cancelar'), style: 'cancel' },
            {
              text: t('comun:aceptar'),
              onPress: () => {
                void enviarRating(rating, comentarioPrivado)
              },
            },
          ]
        )
        return
      }
      void enviarRating(rating, comentarioPrivado)
    },
    [enviando, enviado, enviarRating, t]
  )

  const onClose = async () => {
    try {
      await handleClose()
    } catch (_e) {
      // Se ignora: se navega igual
    }
    try {
      navigation.navigate('Inicio')
    } catch (_e) {
      // Se ignora si el contexto de navegación difiere
    }
  }

  if (!showFinishedModal || !paseo) return null

  return (
    <Modal
      transparent
      visible={showFinishedModal}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
        ) : (
          <View style={styles.androidDim} />
        )}

        <View style={styles.modalContent}>
          {/* Tutor: calificar al cuidador (envío al confirmar las estrellas) */}
          <PaseoFinalizadoCard
            mascotaNombre={mascotaNombre}
            cuidadorNombre={cuidadorNombre}
            onClose={onClose}
            onRate={handleRate}
            ratingPrevio={ratingPrevio}
            enviando={enviando}
            enviado={enviado}
            nuevoPromedio={nuevoPromedio}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  androidDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
  },
})
