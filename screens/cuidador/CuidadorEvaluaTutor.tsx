import React, { useState } from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native'
import {
  useRoute,
  type RouteProp,
  useNavigation,
} from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { COLOR } from '@/constants'
import { useDoc } from '@/hooks/useDoc'
import { Paseo } from '@/models/Paseo'
import { Button, Spacer } from '@/components/ui'
import type { AuthStackParamList } from '@/navigation/types'
import { functions } from '@/firebase.config'
import { useAuth } from '@/context/AuthContext'

type RouteProps = RouteProp<AuthStackParamList, 'CuidadorEvaluaTutor'>

/**
 * Pantalla: Cuidador evalúa Tutor después de completar paseo
 *
 * Caso: evaluacion_tutor
 * - El Cuidador (actor) evalúa al Tutor (objetivo)
 * - Ocurre post-paseo COMPLETADO/FINALIZADO
 * - Mismos criterios que evaluacion_cuidador (overall + opcionales)
 * - Cloud Function auto-agrega en ResumenEvaluacion/{tutor_id}
 */
export default function CuidadorEvaluaTutor() {
  const route = useRoute<RouteProps>()
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { t } = useTranslation('evaluaciones')
  const { paseoId } = route.params
  const { data: paseo, cargando: loading } = useDoc<Paseo>('paseos', paseoId)
  const [_evaluando, setEvaluando] = useState(false)

  const handleRate = async (rating: number) => {
    if (!paseo || !user?.uid || !paseo.creado_por) {
      Alert.alert('Error', t('error_datos_incompletos'))
      return
    }

    setEvaluando(true)
    try {
      // Llamar Callable Function: crearEvaluacion
      const crearEvaluacionCallable = httpsCallable(
        functions,
        'crearEvaluacion'
      )

      const resultado = (await crearEvaluacionCallable({
        tipo: 'evaluacion_tutor', // ← Tipo diferente
        objetivo: paseo.creado_por, // Tutor del paseo
        contextoId: paseoId,
        rating: rating,
        comentario: '',
      })) as { data: { success: boolean; evaluacionId: string } }

      if (resultado.data.success) {
        Alert.alert(t('exito_titulo'), t('exito_mensaje', { rating }), [
          {
            text: t('comun:boton.volver'),
            onPress: () => navigation.navigate('CuidadorApp'),
          },
        ])
      } else {
        Alert.alert('Error', t('error_creando'))
      }
    } catch (error) {
      console.error('Error creando evaluación:', error)

      // Manejar errores de Callable Function
      let mensajeError = t('error_creando')
      const errorObj = error as { code?: string; message?: string }

      if (errorObj?.code === 'already-exists') {
        mensajeError = 'Ya has evaluado a este tutor en este paseo'
      } else if (errorObj?.code === 'failed-precondition') {
        mensajeError = 'El paseo debe estar completado'
      } else if (errorObj?.code === 'permission-denied') {
        mensajeError = 'No tienes permiso para crear esta evaluación'
      } else if (errorObj?.code === 'unauthenticated') {
        mensajeError = 'Debes iniciar sesión'
      }

      Alert.alert('Error', mensajeError)
    } finally {
      setEvaluando(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Spacer size={20} />
        <Text style={{ color: COLOR.TEXTO }}>Cargando paseo...</Text>
      </View>
    )
  }

  if (!paseo) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLOR.TEXTO }}>Paseo no encontrado</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: COLOR.BASE }]}>
      <Spacer size={20} />
      <Text style={[styles.titulo, { color: COLOR.TEXTO }]}>
        {t('evaluacion_tutor')}
      </Text>

      <Spacer size={16} />
      <Text style={{ color: COLOR.TEXTO, textAlign: 'center' }}>
        Por favor, evalúa al tutor de este paseo
      </Text>

      <Spacer size={20} />
      <View
        style={[
          styles.card,
          { backgroundColor: COLOR.SECUNDARIO, borderColor: COLOR.BORDE },
        ]}
      >
        <Text style={{ color: COLOR.TEXTO, fontWeight: 'bold' }}>
          Mascotas del paseo
        </Text>
        <Text style={{ color: COLOR.TEXTO, fontSize: 12, marginTop: 4 }}>
          Tutor: {paseo.creado_por}
        </Text>
      </View>

      <Spacer size={20} />
      <Text
        style={{ color: COLOR.TEXTO, textAlign: 'center', marginBottom: 16 }}
      >
        ¿Cómo fue tu experiencia con este tutor?
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(rating => (
          <Text
            key={rating}
            onPress={() => handleRate(rating)}
            style={[
              styles.starButton,
              {
                color: COLOR.PRIMARIO,
                fontSize: 28,
              },
            ]}
          >
            ⭐
          </Text>
        ))}
      </View>

      <Spacer size={20} />
      <Button
        title={t('comun:boton.cancelar')}
        onPress={() => navigation.goBack()}
        variant="secundario"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  starButton: {
    padding: 8,
  },
})
