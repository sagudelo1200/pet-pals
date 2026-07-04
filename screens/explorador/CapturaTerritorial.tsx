import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { TipoPunto, NivelObservable } from '@/models/ExploracionTerritorial'
import { useExploracionTerritorial } from '@/hooks/explorador/useExploracionTerritorial'
import { useGlobalLoading } from '@/hooks'

interface CapturaTerritorialProps {
  onSuccess?: () => void
  onClose: () => void
  visible: boolean
}

type Step = 0 | 1 | 2 | 3

const TOTAL_STEPS = 4 // Pasos 0-2: selecciones obligatorias, Paso 3: notas opcionales
const SELECTION_STEPS = 3 // Primeros 3 pasos son de selección

const SUGERENCIAS_NOTAS = [
  'Mascotas asustadas',
  'Zona segura',
  'Buena iluminación',
  'Vigilancia',
  'Acceso limitado',
  'Paso frecuente',
]

/**
 * Pantalla conversacional para explorar una zona territorial.
 * Flujo stepper: Tipo → Mascotas → Movimiento → Notas (opcionales) → Enviar
 */
const CapturaTerritorial: React.FC<CapturaTerritorialProps> = ({
  onSuccess,
  onClose,
  visible,
}) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { showLoading, hideLoading } = useGlobalLoading()
  const { capturar, loading, error } = useExploracionTerritorial()

  const [currentStep, setCurrentStep] = useState<Step>(0)
  const [tipoPunto, setTipoPunto] = useState<TipoPunto | null>(null)
  const [mascotasVisibles, setMascotasVisibles] = useState<number | null>(null)
  const [flujoPeatonal, setFlujoPeatonal] = useState<NivelObservable | null>(
    null
  )
  const [observaciones, setObservaciones] = useState('')

  const tiposPuntoOpciones: {
    label: string
    value: TipoPunto
    icon: string
  }[] = [
    { label: t('explorador:tipo_parque'), value: 'parque', icon: 'tree' },
    { label: t('explorador:tipo_calle'), value: 'calle', icon: 'road' },
    { label: t('explorador:tipo_comercio'), value: 'comercio', icon: 'store' },
    {
      label: t('explorador:tipo_conjunto'),
      value: 'conjunto',
      icon: 'building',
    },
    { label: t('explorador:tipo_otro'), value: 'otro', icon: 'plus' },
  ]

  const mascotasOpciones: { label: string; value: number; icon: string }[] = [
    { label: t('explorador:opcion_0'), value: 0, icon: 'ban' },
    { label: t('explorador:opcion_1'), value: 1, icon: 'dog' },
    { label: t('explorador:opcion_2_3'), value: 2, icon: 'paw' },
    { label: t('explorador:opcion_4_6'), value: 4, icon: 'paw' },
    { label: t('explorador:opcion_7_plus'), value: 7, icon: 'paw' },
  ]

  const nivelesOpciones: {
    label: string
    value: NivelObservable
    icon: string
  }[] = [
    {
      label: t('explorador:tranquilo'),
      value: 'bajo',
      icon: 'leaf',
    },
    {
      label: t('explorador:normal'),
      value: 'medio',
      icon: 'walking',
    },
    {
      label: t('explorador:muy_concurrido'),
      value: 'alto',
      icon: 'users',
    },
  ]

  // Steps array - 0-indexed
  const STEPS = [
    {
      key: 'tipo',
      title: t('explorador:que_estas_viendo'),
      opciones: tiposPuntoOpciones,
      valor: tipoPunto,
      setValue: setTipoPunto,
    },
    {
      key: 'mascotas',
      title: t('explorador:cuantos_perros_ves'),
      opciones: mascotasOpciones,
      valor: mascotasVisibles,
      setValue: setMascotasVisibles,
    },
    {
      key: 'movimiento',
      title: t('explorador:como_se_siente_movimiento'),
      opciones: nivelesOpciones,
      valor: flujoPeatonal,
      setValue: setFlujoPeatonal,
    },
  ]

  const currentAtributo = STEPS[currentStep]
  // En paso 3 (notas), siempre puede avanzar porque es opcional
  const puedeAvanzar =
    currentStep === SELECTION_STEPS ||
    (currentAtributo?.valor !== null && currentAtributo?.valor !== undefined)

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }, [currentStep])

  const handleNext = useCallback(() => {
    // Permite avanzar mientras no estemos en el último paso
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }, [currentStep])

  const handleEnviar = async () => {
    // Solo validar los 3 pasos obligatorios (tipo, mascotas, movimiento)
    // Las notas (paso 3) son opcionales
    if (!tipoPunto || flujoPeatonal === null || mascotasVisibles === null) {
      Alert.alert(
        t('explorador:error'),
        t('explorador:completa_campos_obligatorios')
      )
      return
    }

    try {
      showLoading()

      const resultado = await capturar({
        tipo_punto: tipoPunto,
        mascotas_visibles: mascotasVisibles,
        flujo_peatonal: flujoPeatonal,
        observaciones: observaciones || undefined,
      })

      if (resultado) {
        Alert.alert(
          t('explorador:exito'),
          t('explorador:exploracion_guardada'),
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset state
                setCurrentStep(0)
                setTipoPunto(null)
                setMascotasVisibles(null)
                setFlujoPeatonal(null)
                setObservaciones('')
                onSuccess?.()
                onClose()
              },
            },
          ]
        )
      } else {
        Alert.alert(
          t('explorador:error'),
          error || t('explorador:error_desconocido')
        )
      }
    } catch (_err) {
      Alert.alert(t('explorador:error'), t('explorador:error_al_explorar'))
    } finally {
      hideLoading()
    }
  }

  const renderOpcionesStep = () => {
    if (!currentAtributo) return null
    const { opciones, valor, setValue } = currentAtributo

    return (
      <View style={styles.gridContainer}>
        {opciones.map(op => (
          <Pressable
            key={op.value}
            style={[
              styles.optionCard,
              valor === op.value && styles.optionCardSelected,
            ]}
            onPress={() => setValue(op.value as any)}
          >
            <Icon
              name={op.icon}
              size={32}
              color={valor === op.value ? COLOR.PRIMARIO : COLOR.SUBTEXTO}
            />
            <Text
              style={[
                styles.optionLabel,
                valor === op.value && styles.optionLabelSelected,
              ]}
            >
              {op.label}
            </Text>
          </Pressable>
        ))}
      </View>
    )
  }

  const renderNotasStep = () => {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Sugerencias rápidas */}
        <View style={styles.sugerenciasContainer}>
          <Text style={styles.sugerenciasLabel}>
            {t('explorador:sugerencias') || 'Sugerencias rápidas'}
          </Text>
          <View style={styles.sugerenciasGrid}>
            {SUGERENCIAS_NOTAS.map(sugerencia => (
              <Pressable
                key={sugerencia}
                style={[
                  styles.sugerenciaTag,
                  observaciones.includes(sugerencia) &&
                    styles.sugerenciaTagActive,
                ]}
                onPress={() => {
                  if (observaciones.includes(sugerencia)) {
                    setObservaciones(
                      observaciones
                        .replace(sugerencia + ', ', '')
                        .replace(', ' + sugerencia, '')
                        .replace(sugerencia, '')
                        .trim()
                    )
                  } else {
                    setObservaciones(
                      observaciones
                        ? `${observaciones}, ${sugerencia}`
                        : sugerencia
                    )
                  }
                }}
              >
                <Text
                  style={[
                    styles.sugerenciaText,
                    observaciones.includes(sugerencia) &&
                      styles.sugerenciaTextActive,
                  ]}
                >
                  {sugerencia}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Input libre */}
        <Card style={styles.noteCard}>
          <TextInput
            style={styles.textInput}
            placeholder={
              t('explorador:ingresa_notas') || 'Añade detalles específicos...'
            }
            placeholderTextColor={COLOR.SUBTEXTO}
            value={observaciones}
            onChangeText={setObservaciones}
            maxLength={250}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.charCounter}>{observaciones.length}/250</Text>
        </Card>
      </KeyboardAvoidingView>
    )
  }

  return (
    <Modal
      visible={visible}
      presentationStyle="fullScreen"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Icon name="times" size={24} color={COLOR.PRIMARIO} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {t('explorador:nueva_exploracion')}
          </Text>
          <View style={styles.closePlaceholder} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content area */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Pregunta */}
          <Text style={styles.stepTitle}>
            {currentStep < SELECTION_STEPS
              ? currentAtributo?.title
              : t('explorador:quieres_agregar_mas') ||
                'Agregar detalles (opcional)'}
          </Text>

          {/* Opciones o notas */}
          {currentStep < SELECTION_STEPS
            ? renderOpcionesStep()
            : renderNotasStep()}
        </ScrollView>

        {/* Navigation footer */}
        <View style={styles.footer}>
          <Button
            title={t('explorador:retroceder')}
            variant="ghost"
            size="md"
            onPress={handlePrev}
            disabled={currentStep === 0}
            style={{ flex: 1, marginRight: 12 }}
          />
          <Button
            title={
              currentStep === TOTAL_STEPS - 1
                ? t('explorador:enviar_exploracion')
                : t('explorador:siguientes_pasos')
            }
            variant="primario"
            size="md"
            onPress={
              currentStep === TOTAL_STEPS - 1 ? handleEnviar : handleNext
            }
            disabled={
              (currentStep < SELECTION_STEPS && !puedeAvanzar) || loading
            }
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    flex: 1,
    textAlign: 'center',
  },
  closePlaceholder: {
    width: 40,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.BORDE,
  },
  progressDotActive: {
    backgroundColor: COLOR.PRIMARIO,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 24,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionCard: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  optionCardSelected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: COLOR.PRIMARIO + '10',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: COLOR.PRIMARIO,
  },
  noteCard: {
    marginBottom: 20,
    minHeight: 150,
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: COLOR.TEXTO,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 11,
    color: COLOR.INACTIVO,
    marginTop: 6,
    marginRight: 12,
    marginBottom: 12,
    textAlign: 'right',
  },
  sugerenciasContainer: {
    marginBottom: 20,
  },
  sugerenciasLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  sugerenciasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sugerenciaTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLOR.BORDE,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  sugerenciaTagActive: {
    backgroundColor: COLOR.PRIMARIO + '20',
    borderColor: COLOR.PRIMARIO,
  },
  sugerenciaText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLOR.SUBTEXTO,
  },
  sugerenciaTextActive: {
    color: COLOR.PRIMARIO,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
})

export default CapturaTerritorial
