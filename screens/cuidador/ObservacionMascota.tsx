import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  TouchableOpacity,
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
import {
  OPCIONES_COMPORTAMIENTO,
  keyI18nChip,
  type EjeComportamiento,
} from '@/logic/mascotas/comportamiento'

interface MascotaPaseo {
  id: string
  nombre: string
}

type RouteProps = RouteProp<AuthStackParamList, 'ObservacionMascota'>

/**
 * Pantalla: Cuidador registra observación de comportamiento de mascota
 *
 * Caso: evaluacion_mascota (contrato v2, SIN rating)
 * - Captura con CHIPS estandarizados (ritmo/compania/tolerancia): un tap por
 *   eje; los datos quedan comparables entre cuidadores (expediente).
 * - Comentario opcional.
 * - Al guardar, el expediente de la mascota crece ("...ya tiene este registro").
 * - Se recorre cada mascota del paseo; al terminar (u omitir) continúa a la
 *   evaluación del tutor (CuidadorEvaluaTutor).
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
  const [seleccion, setSeleccion] = useState<Record<string, string>>({})
  const [comentario, setComentario] = useState('')
  const [observando, setObservando] = useState(false)

  const mascotas = mascotasPaseo || []
  const mascotaActual = mascotas[indice] || null
  const totalMascotas = mascotas.length

  const seleccionarChip = (eje: string, valor: string) => {
    setSeleccion(prev => ({ ...prev, [eje]: valor }))
  }

  const continuarConTutor = () => {
    navigation.navigate('CuidadorEvaluaTutor', { paseoId })
  }

  const siguienteMascota = () => {
    if (indice < totalMascotas - 1) {
      setIndice(i => i + 1)
      setSeleccion({})
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

    const ritmo = seleccion.ritmo
    const compania = seleccion.compania
    const tolerancia = seleccion.tolerancia
    if (!ritmo || !compania || !tolerancia) {
      Alert.alert('Error', 'Selecciona una opción en cada campo')
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
        ritmo,
        compania,
        tolerancia,
        comentario: comentario.trim() || '',
      })) as { data: { success: boolean } }

      if (resultado.data.success) {
        // Valor intrínseco: el registro alimenta el expediente de la mascota
        Alert.alert(
          t('observacion_expediente_titulo', 'Registro guardado'),
          t('observacion_expediente_mensaje', {
            nombre: mascotaActual.nombre,
          }),
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
        siguienteMascota()
        return
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

  const renderChips = (eje: EjeComportamiento) => (
    <View style={styles.chipsRow}>
      {OPCIONES_COMPORTAMIENTO[eje].map(opcion => {
        const seleccionado = seleccion[eje] === opcion
        return (
          <TouchableOpacity
            key={opcion}
            onPress={() => seleccionarChip(eje, opcion)}
            disabled={observando}
            style={[
              styles.chip,
              seleccionado && styles.chipSeleccionado,
            ]}
          >
            <Text
              style={[
                styles.chipTexto,
                seleccionado && styles.chipTextoSeleccionado,
              ]}
            >
              {t(keyI18nChip(eje, opcion), { defaultValue: opcion })}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

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
        <Button
          title={t('continuar', 'Continuar')}
          onPress={continuarConTutor}
        />
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

      <Spacer size={8} />
      <Text style={{ color: COLOR.SUBTEXTO, fontSize: 13 }}>
        {t('observacion_subtitulo', 'Un tap por campo: así crece el expediente de tu mascota')}
      </Text>

      <Spacer size={16} />

      {/* Ritmo */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        {t('eje_ritmo', 'Ritmo del paseo')}
      </Text>
      {renderChips('ritmo')}
      <Spacer size={14} />

      {/* Compañía */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        {t('eje_compania', 'Compañía')}
      </Text>
      {renderChips('compania')}
      <Spacer size={14} />

      {/* Tolerancia */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        {t('eje_tolerancia', 'Tolerancia')}
      </Text>
      {renderChips('tolerancia')}
      <Spacer size={14} />

      {/* Comentario */}
      <Text style={[styles.label, { color: COLOR.TEXTO }]}>
        {t('comentario_label', 'Comentario')} (opcional)
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
        numberOfLines={3}
        placeholderTextColor={COLOR.SUBTEXTO}
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  chipSeleccionado: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}1A`,
  },
  chipTexto: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  chipTextoSeleccionado: {
    color: COLOR.PRIMARIO,
    fontWeight: '700',
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
