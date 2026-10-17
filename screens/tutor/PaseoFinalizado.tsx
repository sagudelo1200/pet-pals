import React, { useCallback, useState } from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native'
import {
  useRoute,
  type RouteProp,
  useNavigation,
} from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { useDoc } from '@/hooks/useDoc'
import { Button, Spacer } from '@/components/ui'
import type { AuthStackParamList } from '@/navigation/types'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'
import { ModalValidacionEntrega, PantallaPago } from '@/components/tutor'
import { useAuth } from '@/context/AuthContext'
import { useEnviarEvaluacionCuidador } from '@/hooks/paseos/useEnviarEvaluacionCuidador'

type RouteProps = RouteProp<AuthStackParamList, 'PaseoFinalizado'>

/**
 * Repesca del historial del tutor: calificar a un cuidador en un paseo
 * COMPLETADO/FINALIZADO que quedó sin calificar. Mismo flujo que el modal
 * global (confirmación explícita, prueba social e impacto).
 */
export default function PaseoFinalizado() {
  const route = useRoute<RouteProps>()
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { t } = useTranslation('evaluaciones')
  const { paseoId } = route.params
  const { data: paseo, cargando: loading } = useDoc<any>('operaciones', paseoId)

  // Estados para controlar el flujo: Validación → Pago → Calificación
  const [entregaValidada, setEntregaValidada] = useState(false)
  const [pagoProcesado, setPagoProcesado] = useState(false)

  const cuidadorId = paseo?.id_cuidador
  const { ratingPrevio, enviando, enviado, nuevoPromedio, enviar } =
    useEnviarEvaluacionCuidador(cuidadorId, paseoId)

  // Confirmación explícita (la tarjeta la llama al confirmar) + fricción
  // anti-troll para calificaciones bajas (1-2★)
  const handleRate = useCallback(
    (rating: number, comentario?: string, comentarioPrivado?: string) => {
      if (!paseo || !user?.uid) {
        Alert.alert('Error', t('error_datos_incompletos'))
        return
      }
      if (rating <= 2) {
        Alert.alert(
          t('confirmar_baja_titulo'),
          t('confirmar_baja_mensaje', { rating }),
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
    [paseo, user?.uid, enviar, t]
  )

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Text style={{ color: COLOR.TEXTO, marginTop: 20 }}>
          Cargando resumen...
        </Text>
      </View>
    )
  }

  if (!paseo) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>
          No se encontró la información del paseo.
        </Text>
        <Spacer size={20} />
        <Button
          title="Volver"
          onPress={() => navigation.navigate('TutorApp')}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* FASE 4: Validación de entrega (si no está validada aún) */}
        {!entregaValidada && paseo.estado !== 'COMPLETADO' ? (
          <ModalValidacionEntrega
            visible={true}
            paseoId={paseoId}
            tutorId={user?.uid || ''}
            nombreMascota={paseo?.mascota_nombre_visual || 'Mascota'}
            nombreCuidador={paseo?.cuidador_nombre_visual || 'Cuidador'}
            onSuccess={() => setEntregaValidada(true)}
            onDismiss={() => navigation.navigate('TutorApp')}
          />
        ) : !pagoProcesado ? (
          // FASE 4.1: Pago (si se validó pero aún no pagó)
          <PantallaPago
            operacionId={paseo?.operacion_economica_id || ''}
            monto={paseo?.precio || 0}
            nombreMascota={paseo?.mascota_nombre_visual || 'Mascota'}
            nombreCuidador={paseo?.cuidador_nombre_visual || 'Cuidador'}
            onPaymentSuccess={(referencia: string) => {
              console.log('[PaseoFinalizado] Pago iniciado, referencia:', referencia)
              setPagoProcesado(true)
            }}
            onCancel={() => navigation.navigate('TutorApp')}
          />
        ) : (
          // Calificación (después de validar y pagar)
          <>
            <PaseoFinalizadoCard
              mascotaNombre={paseo.mascota_nombre_visual}
              cuidadorNombre={paseo.cuidador_nombre_visual}
              onClose={() => navigation.navigate('TutorApp')}
              onRate={handleRate}
              ratingPrevio={ratingPrevio}
              enviando={enviando}
              enviado={enviado}
              nuevoPromedio={nuevoPromedio}
            />
            {enviando && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
                <Text style={styles.loadingText}>{t('registrando')}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
  },
  subtitle: {
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: COLOR.TEXTO,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
})
