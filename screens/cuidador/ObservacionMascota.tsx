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
 * Caso: evaluacion_mascota
 * - El Cuidador (actor) observa Mascota (objetivo)
 * - Ocurre post-paseo COMPLETADO/FINALIZADO
 * - Datos: ritmo, compañía, tolerancia, comentario
 * - NO se promedian ratings (son observaciones cualitativas)
 * - Cloud Function auto-agrega en ResumenEvaluacion/{mascota_id}
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

  const [mascotaActual, setMascotaActual] = useState<MascotaPaseo | null>(null)
  const [ritmo, setRitmo] = useState('')
  const [compania, setCompania] = useState('')
  const [tolerancia, setTolerancia] = useState('')
  const [comentario, setComentario] = useState('')
  const [observando, setObservando] = useState(false)

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
      // Llamar Callable Function: crearEvaluacion
      const crearEvaluacionCallable = httpsCallable(
        functions,
        'crearEvaluacion'
      )

      const resultado = (await crearEvaluacionCallable({
        tipo: 'evaluacion_mascota', // ← Tipo para mascota
        objetivo: mascotaActual.id, // ID de la mascota
        contextoId: paseoId,
        rating: 3, // Dummy rating (no se usa para mascotas)
        comentario: JSON.stringify({
          ritmo,
          compania,
          tolerancia,
          comentario: comentario.trim() || null,
        }),
      })) as { data: { success: boolean; evaluacionId: string } }

      if (resultado.data.success) {
        Alert.alert('Éxito', 'Observación registrada correctamente', [
          {
            text: 'OK',
            onPress: () => {
              // Limpiar y continuar con siguiente mascota si hay
              setRitmo('')
              setCompania('')
              setTolerancia('')
              setComentario('')
              setMascotaActual(null)
            },
          },
        ])
      } else {
        Alert.alert('Error', 'Error al guardar observación')
      }
    } catch (error) {
      console.error('Error creando observación:', error)

      // Manejar errores de Callable Function
      let mensajeError = 'Error al guardar observación'
      const errorObj = error as { code?: string; message?: string }

      if (errorObj?.code === 'already-exists') {
        mensajeError = 'Ya has registrado observación para esta mascota'
      } else if (errorObj?.code === 'failed-precondition') {
        mensajeError = 'El paseo debe estar completado'
      } else if (errorObj?.code === 'permission-denied') {
        mensajeError = 'Solo el cuidador puede registrar observaciones'
      }

      Alert.alert('Error', mensajeError)
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

  if (!paseo || !mascotasPaseo || mascotasPaseo.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLOR.TEXTO }}>
          No hay mascotas en este paseo
        </Text>
      </View>
    )
  }

  if (!mascotaActual && mascotasPaseo && mascotasPaseo.length > 0) {
    setMascotaActual(mascotasPaseo[0])
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: COLOR.BASE }]}>
      <Spacer size={20} />
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
        title="Guardar Observación"
        onPress={handleGuardarObservacion}
        loading={observando}
      />
      <Spacer size={12} />
      <Button
        title="Cancelar"
        onPress={() => navigation.goBack()}
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
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
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
