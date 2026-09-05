import React, { useCallback } from 'react'
import { Modal, View, StyleSheet, Platform, Alert } from 'react-native'
import { BlurView } from 'expo-blur'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'
import { useMonitorPaseoGlobal } from '@/hooks/paseos/useMonitorPaseoGlobal'
import { useEnviarEvaluacionCuidador } from '@/hooks/paseos/useEnviarEvaluacionCuidador'
import type { AuthStackParamList } from '@/navigation/types'
import type { StackNavigationProp } from '@react-navigation/stack'

/**
 * Overlay global del TUTOR al finalizar un paseo (estado FINALIZADO).
 * Vive en el navigator RAÍZ para aparecer sobre cualquier pantalla del tutor
 * (PaseoActivo, Chat, tabs).
 * - SOLO se muestra al rol activo TUTOR: el contenido (calificar al cuidador)
 *   es exclusivo del tutor; el cuidador tiene su propio flujo post-paseo
 *   (overlay → observación de la mascota → evalúa al tutor).
 * - Muestra la reputación actual del cuidador (prueba social).
 * - La evaluación se envía SOLO cuando el tutor CONFIRMA las estrellas
 *   (nunca al tocar) + doble confirmación para 1-2★.
 * - Tras enviar, muestra el impacto (nuevo promedio calculado localmente).
 */
export const GlobalPaseoManager = () => {
  const { rolActivo } = useAuth()
  const { showFinishedModal, paseo, handleClose } = useMonitorPaseoGlobal()
  const navigation =
    useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { t } = useTranslation()

  const paseoId = paseo?.id
  const original = (paseo as any)?.original as Record<string, any> | undefined
  const cuidadorId: string | undefined = original?.id_cuidador
  const cuidadorNombre = paseo?.cuidador?.nombre || 'El cuidador'
  const mascotaNombre =
    original?.mascota_nombre_visual ||
    (paseo?.mascota_ids && paseo.mascota_ids[0]) ||
    'Tu mascota'

  const { ratingPrevio, enviando, enviado, nuevoPromedio, enviar } =
    useEnviarEvaluacionCuidador(cuidadorId, paseoId)

  // Confirmación explícita (la tarjeta la llama al confirmar) + fricción
  // anti-troll para calificaciones bajas (1-2★)
  const handleRate = useCallback(
    (rating: number, comentario?: string, comentarioPrivado?: string) => {
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
                void enviar(rating, comentario, comentarioPrivado)
              },
            },
          ]
        )
        return
      }
      void enviar(rating, comentario, comentarioPrivado)
    },
    [enviando, enviado, enviar, t]
  )

  const onClose = async () => {
    try {
      await handleClose()
    } catch (_e) {
      // Se ignora: se navega igual
    }
    try {
      navigation.navigate('TutorApp')
    } catch (_e) {
      // Se ignora si el contexto de navegación difiere
    }
  }

  // SOLO al rol tutor: el contenido del modal es exclusivo del tutor
  // (calificar al cuidador). El cuidador nunca debe verlo.
  if (!showFinishedModal || !paseo || rolActivo !== 'tutor') return null

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
