import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native'
import {
  useRoute,
  type RouteProp,
  useNavigation,
} from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { httpsCallable } from 'firebase/functions'
import { COLOR } from '@/constants'
import { useDoc } from '@/hooks/useDoc'
import { useCollection } from '@/hooks/useCollection'
import { Paseo } from '@/models/Paseo'
import { Button, Spacer } from '@/components/ui'
import type { AuthStackParamList } from '@/navigation/types'
import { functions } from '@/firebase.config'
import { useAuth } from '@/context/AuthContext'

interface MascotaPaseo {
  id: string
  nombre: string
}

type RouteProps = RouteProp<AuthStackParamList, 'ObservacionMascota'>

/**
 * Pantalla: Cuidador registra observación de comportamiento de mascota
 *
 * Caso: evaluacion_mascota (contrato v2)
 * - El Cuidador (actor) observa Mascota (objetivo)
 * - Ocurre post-paseo COMPLETADO/FINALIZADO
 * - SIN rating (cualitativo): ritmo, compania, tolerancia, comentario
 * - Se recorre cada mascota del paseo; al terminar (o al omitir) continúa a
 *   la evaluación del tutor (CuidadorEvaluaTutor)
 */
export default function ObservacionMascota() {
  const route = useRoute<RouteProps>()
  const navigation = useNavigation<any>()
  const { user } = useAuth()
  const { t } = useTranslation('evaluaciones')
  const { paseoId } = route.params
  const { data: paseo, cargando: loadingPaseo } = useDoc<Paseo>(
    'paseos',
    paseoId
  )

  // Obtener mascotas del paseo desde subcolección
  const { data: mascotasPaseo, cargando: loadingMascotas } = useCollection(
    `paseos/${paseoId}/mascotas`
  )

  const [indice, setIndice] = useState(0)
  const [ritmo, setRitmo] = useState('')
  const [compania, setCompania] = useState('')
  const [tolerancia, setTolerancia] = useState('')
  const [comentario, setComentario] = useState('')
  const [observando, setObservando] = useState(false)

  const mascotas = mascotasPaseo || []
  const mascotaActual = mascotas[indice] || null
  const totalMascotas = mascotas.length

  const continuarConTutor = () => {
    navigation.navigate('CuidadorEvaluaTutor', { paseoId })
  }

  const siguienteMascota = () => {
    if (indice < totalMascotas - 1) {
      setIndice(i => i + 1)
      setRitmo('')
      setCompania('')
      setTolerancia('')
      setComentario('')
    } else {
      continuarConTutor()
    }
  }

  const handleGuardarObservacion = async () => {
    if (!paseo || !user?.uid || !mascotaActual) {
      Alert.alert('Error', t('error_datos_incompletos'))
      return
    }

    if (!ritmo.trim() || !compania.trim() || !tolerancia.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos')
      return
    }

    setObservando(true)
    try {
      // Llamar Callable Function: crearEvaluacion (contrato v2: sin rating)
      const crearEvaluacionCallable = httpsCallable(
        functions,
        'crearEvaluacion'
      )

      const resultado = (await crearEvaluacionCallable({
        tipo: 'evaluacion_mascota',
        objetivo: mascotaActual.id,
        contextoId: paseoId,
        ritmo: ritmo.trim(),
        compania: compania.trim(),
        tolerancia: tolerancia.trim(),
        comentario: comentario.trim() || '',
      })) as { data: { success: boolean } }

      if (resultado.data.success) {
        Alert.alert(
          t('observacion_guardada', 'Observación registrada'),
          undefined,
          [{ text: 'OK', onPress: siguienteMascota }]
        )
      } else {
        Alert.alert('Error', 'Error al guardar observación')
      }
    } catch (error) {
      console.error('Error creando observación:', error)

      let mensajeError = 'Error al guardar observación'
      const errorObj = error as { code?: string; message?: string }

      if (errorObj?.code === 'already-exists') {
        // Ya registrada esta mascota: continuar como si se hubiera guardado
        mensajeError = ''
        siguienteMascota()
        return
      } else if (errorObj?.code === 'failed-precondition') {
        mensajeError = 'El paseo debe estar completado'
      } else if (errorObj?.code === 'permission-denied') {
        mensajeError = 'Solo el cuidador puede registrar observaciones'
      }

      if (mensajeError) Alert.alert('Error', mensajeError)
    } finally {
      setObservando(false)
    }
  }

  if (loadingPaseo || loadingMascotas) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  if (!paseo || mascotas.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLOR.TEXTO }}>
          No hay mascotas en este paseo
        </Text>
        <Spacer size={16} />
        <Button title={t('continuar', 'Continuar')} onPress={continuarConTutor} />
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLOR.BASE }]}>
      <Spacer size={20} />

      {totalMascotas > 1 && (
        <Text style={[styles.progreso, { color: COLOR.SUBTEXTO }]}>
          {t('mascota_progreso', 'Mascota {{actual}} de {{total}}', {
            actual: indice + 1,
            total: totalMascotas,
          })}
        </Text>
      )}

      <Text style={[styles.titulo, { color: COLOR.TEXTO }]}>
        Observación: {mascotaActual?.nombre}
      </Text>

      <Spacer size={16} />

      {/* Ritmo */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        Ritmo del paseo
      </Text>
      <TextInput
        style={[styles.input, { borderColor: COLOR.BORDE, color: COLOR.TEXTO }]}
        placeholder="ej: tranquilo, normal, energico"
        value={ritmo}
        onChangeText={setRitmo}
        placeholderTextColor={COLOR.TEXTO}
      />
      <Spacer size={12} />

      {/* Compañía */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>Compañía</Text>
      <TextInput
        style={[styles.input, { borderColor: COLOR.BORDE, color: COLOR.TEXTO }]}
        placeholder="ej: solo, confiado, sociable"
        value={compania}
        onChangeText={setCompania}
        placeholderTextColor={COLOR.TEXTO}
      />
      <Spacer size={12} />

      {/* Tolerancia */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>Tolerancia</Text>
      <TextInput
        style={[styles.input, { borderColor: COLOR.BORDE, color: COLOR.TEXTO }]}
        placeholder="ej: ignora, neutro, receptivo"
        value={tolerancia}
        onChangeText={setTolerancia}
        placeholderTextColor={COLOR.TEXTO}
      />
      <Spacer size={12} />

      {/* Comentario */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        Comentario (opcional)
      </Text>
      <TextInput
        style={[
          styles.inputMultiline,
          { borderColor: COLOR.BORDE, color: COLOR.TEXTO },
        ]}
        placeholder="Notas adicionales sobre el comportamiento..."
        value={comentario}
        onChangeText={setComentario}
        multiline
        numberOfLines={4}
        placeholderTextColor={COLOR.TEXTO}
      />
      <Spacer size={20} />

      <Button
        title={t('guardar_observacion', 'Guardar observación')}
        onPress={handleGuardarObservacion}
        loading={observando}
      />
      <Spacer size={12} />
      <Button
        title={t('omitir', 'Omitir')}
        onPress={continuarConTutor}
        variant="secundario"
      />
      <Spacer size={20} />
    </ScrollView>
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
    backgroundColor: COLOR.BASE,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progreso: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
})
