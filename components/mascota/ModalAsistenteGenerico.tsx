import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { GestorMascotas } from '@/logic/mascotas'
import type { Mascota } from '@/models/Mascota'

/**
 * Interfaz para definir un atributo con opciones
 */
export interface Atributo {
  key: string
  labelKey: string // i18n key
  scenarioKey?: string // i18n key para contexto (opcional)
  preguntaKey: string // i18n key
  opciones: Opcion[]
}

/**
 * Interfaz para una opción dentro de un atributo
 */
export interface Opcion {
  icon: string // FontAwesome5 icon name
  nombre: string // i18n key
  descripcion?: string // i18n key (opcional)
  descriptor?: string // i18n key breve para card de detalle (opcional)
  valor: string
}

/**
 * Configuración del modal genérico
 */
export interface ConfiguracionModalAsistente {
  atributos: Atributo[]
  imagenesPorAtributo: Record<string, any>
  titulo: string
  columnasOpciones?: number // 1 para vertical, 2 para grid de 2 columnas (default: 1)
  compactSize?: boolean // true para tamaño compacto, false para tamaño grande (default: false)
  /** Función que extrae el valor actual del atributo desde Mascota */
  obtenerValor: (
    atributo: Atributo,
    mascota: Partial<Mascota>
  ) => any | undefined
  /** Función que construye el payload para actualizar */
  construirPayload: (valores: Record<string, any>) => Partial<Mascota>
}

interface ModalAsistenteGenericoProps {
  visible: boolean
  petName: string
  mascotaId: string
  initialData?: Partial<Mascota>
  config: ConfiguracionModalAsistente
  onClose: () => void
  // eslint-disable-next-line
  onCompleted?: (savedData: Partial<Mascota>) => void
}

/**
 * Modal genérico reutilizable para asistentes guiados (comportamiento, compatibilidad, etc.)
 * Maneja:
 * - Navegación por pasos
 * - Selección de opciones
 * - Persistencia a Firebase
 * - Actualizaciones locales
 */
export const ModalAsistenteGenerico: React.FC<ModalAsistenteGenericoProps> = ({
  visible,
  petName,
  mascotaId,
  initialData,
  config,
  onClose,
  onCompleted,
}) => {
  const { t } = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [valores, setValores] = useState<Record<string, any>>({})
  const valoresInicialesRef = React.useRef<Record<string, any>>({})

  React.useEffect(() => {
    if (visible && initialData) {
      const valoresIniciales: Record<string, any> = {}
      config.atributos.forEach(atributo => {
        const val = config.obtenerValor(atributo, initialData)
        if (val !== undefined) {
          valoresIniciales[atributo.key] = val
        }
      })
      valoresInicialesRef.current = valoresIniciales
      setValores(valoresIniciales)
      setCurrentStep(0)
    }
  }, [visible, initialData, config])

  const atributo = config.atributos[currentStep]

  const handleSelectOption = useCallback(
    (valor: any) => {
      setValores(prev => ({
        ...prev,
        [atributo.key]: valor,
      }))
    },
    [atributo.key]
  )

  const huboCambios = (): boolean => {
    const valoresIniciales = valoresInicialesRef.current
    for (const atributo of config.atributos) {
      const inicial = valoresIniciales[atributo.key]
      const final = valores[atributo.key]
      if (inicial !== final) {
        return true
      }
    }
    return false
  }

  const handleNext = async () => {
    if (currentStep < config.atributos.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      if (huboCambios()) {
        // Guardar si hubo cambios
        handleClose()
        return
      }

      setIsSaving(true)
      try {
        const payload = config.construirPayload(valores)
        const resultado = await GestorMascotas.actualizar(mascotaId, payload)

        if (!resultado.success) {
          Alert.alert(t('comun:error'), t('mascotas:errores.error_guardar'))
          return
        }

        if (onCompleted) {
          onCompleted(payload)
        }
        handleClose()
      } catch (error) {
        Alert.alert(t('comun:error'), t('mascotas:errores.error_guardar'))
        console.error('Error al guardar datos del asistente:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  const valorActual = valores[atributo.key]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Icon name="chevron-left" size={24} color={COLOR.PRIMARIO} />
          </Pressable>
          <Text style={styles.headerTitle}>{config.titulo}</Text>
          <View style={styles.closePlaceholder} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          {config.atributos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section: Imagen */}
          <View
            style={[
              styles.heroContainer,
              config.compactSize && { height: 200 },
              !config.compactSize && { height: 300 },
            ]}
          >
            <View style={styles.imagenContainer}>
              {React.createElement(
                config.imagenesPorAtributo[atributo.key] ||
                  config.imagenesPorAtributo[
                    Object.keys(config.imagenesPorAtributo)[0]
                  ],
                {
                  width: config.compactSize ? 180 : 270,
                  height: config.compactSize ? 180 : 270,
                }
              )}
            </View>

            {/* Nombre de mascota + paso (superpuesto arriba) */}
            <View
              style={[
                styles.stepHeader,
                config.compactSize && {
                  top: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                },
                !config.compactSize && {
                  top: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                },
              ]}
            >
              <Text
                style={[
                  styles.petName,
                  config.compactSize && { fontSize: 18 },
                  !config.compactSize && { fontSize: 24 },
                ]}
              >
                {petName}
              </Text>
              <Text
                style={[
                  styles.stepInfo,
                  config.compactSize && { fontSize: 11 },
                  !config.compactSize && { fontSize: 12 },
                ]}
              >
                {t('mascotas:asistente.paso', {
                  actual: currentStep + 1,
                  total: config.atributos.length,
                })}
              </Text>
            </View>

            {/* Escenario (superpuesto abajo) */}
            {atributo.scenarioKey && (
              <View
                style={[
                  styles.scenarioBox,
                  config.compactSize && {
                    bottom: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                  },
                  !config.compactSize && {
                    bottom: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scenarioText,
                    config.compactSize && {
                      fontSize: 11,
                      lineHeight: 15,
                    },
                    !config.compactSize && {
                      fontSize: 13,
                      lineHeight: 18,
                    },
                  ]}
                >
                  {t(atributo.scenarioKey)}
                </Text>
              </View>
            )}
          </View>

          {/* Pregunta del atributo */}
          <Text
            style={[
              styles.pregunta,
              config.compactSize && {
                fontSize: 13,
                marginBottom: 6,
              },
              !config.compactSize && {
                fontSize: 15,
                marginBottom: 8,
              },
            ]}
          >
            {t(atributo.preguntaKey)}
          </Text>

          {/* Opciones */}
          <View
            style={[
              styles.optionsContainer,
              config.columnasOpciones === 2 && styles.optionsContainerGrid,
            ]}
          >
            {atributo.opciones.map(opcion => (
              <Pressable
                key={opcion.valor}
                style={[
                  styles.optionCard,
                  config.columnasOpciones === 2 && styles.optionCardGrid,
                  config.compactSize && {
                    padding: 10,
                    minHeight: 110,
                  },
                  !config.compactSize && {
                    padding: 12,
                    minHeight: 'auto',
                  },
                  valorActual === opcion.valor && styles.optionCardSelected,
                ]}
                onPress={() => handleSelectOption(opcion.valor)}
              >
                <View
                  style={[
                    styles.optionContent,
                    config.columnasOpciones === 2 && {
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIconWrapper,
                      config.columnasOpciones === 2 && {
                        marginRight: 0,
                        marginBottom: 8,
                      },
                      !config.columnasOpciones && {
                        marginRight: 12,
                      },
                    ]}
                  >
                    {opcion.icon && (
                      <Icon
                        name={opcion.icon as any}
                        size={24}
                        color={
                          valorActual === opcion.valor
                            ? COLOR.PRIMARIO
                            : COLOR.SUBTEXTO
                        }
                      />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionName,
                        config.compactSize && {
                          fontSize: 13,
                          marginBottom: 2,
                        },
                        !config.compactSize && {
                          fontSize: 15,
                          marginBottom: 4,
                        },
                      ]}
                    >
                      {t(opcion.nombre)}
                    </Text>
                    {opcion.descripcion && (
                      <Text
                        style={[
                          styles.optionDesc,
                          config.compactSize && {
                            fontSize: 11,
                            lineHeight: 15,
                          },
                          !config.compactSize && {
                            fontSize: 12,
                            lineHeight: 17,
                          },
                        ]}
                      >
                        {t(opcion.descripcion)}
                      </Text>
                    )}
                  </View>
                </View>
                {valorActual === opcion.valor && (
                  <View style={styles.selectedCheckmark}>
                    <Icon name="paw" size={14} color={COLOR.BASE} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <Button
            title={t('comun:atras')}
            onPress={handlePrev}
            variant="secundario"
            disabled={currentStep === 0}
            style={styles.buttonBack}
          />
          <Button
            title={
              currentStep === config.atributos.length - 1
                ? t('mascotas:asistente.completar')
                : t('comun:siguiente')
            }
            onPress={handleNext}
            loading={isSaving}
            variant="primario"
            disabled={!valorActual || isSaving}
            style={styles.buttonNext}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  closePlaceholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.BORDE,
  },
  progressDotActive: {
    backgroundColor: COLOR.PRIMARIO,
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 4,
  },
  heroContainer: {
    position: 'relative',
    height: 300,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLOR.PRIMARIO}08`,
  },
  stepHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 5,
    backgroundColor: `${COLOR.BASE}90`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  stepInfo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  scenarioBox: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.PRIMARIO,
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}40`,
    zIndex: 6,
  },
  scenarioText: {
    fontSize: 13,
    color: COLOR.TEXTO,
    lineHeight: 18,
    fontWeight: '500',
  },
  pregunta: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  optionsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  optionCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLOR.TEXTO}08`,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: `${COLOR.BORDE}60`,
  },
  optionCardGrid: {
    width: '48%',
    minHeight: 110,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  optionCardSelected: {
    backgroundColor: `${COLOR.PRIMARIO}25`,
    borderColor: COLOR.PRIMARIO,
    borderWidth: 2,
    paddingRight: 16,
  },
  optionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLOR.PRIMARIO}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    lineHeight: 17,
  },
  selectedCheckmark: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLOR.BASE,
    zIndex: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: `${COLOR.BORDE}40`,
    backgroundColor: COLOR.BASE,
  },
  buttonBack: {
    flex: 1,
  },
  buttonNext: {
    flex: 1,
  },
})
