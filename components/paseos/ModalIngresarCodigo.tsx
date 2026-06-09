import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'

interface MascotaPorTutor {
  tutorId: string
  tutorNombre: string
  mascotas: { id: string; nombre: string }[]
}

interface ModalIngresarCodigoProps {
  visible: boolean
  mascotasPorTutor: MascotaPorTutor[]
  intentosFallidosPorTutor?: Record<string, number>
  onVerificar: (_tutorId: string, _codigo: string) => Promise<void>
  onCerrar: () => void
  isLoading?: boolean
}
export function ModalIngresarCodigo({
  visible,
  mascotasPorTutor = [],
  intentosFallidosPorTutor = {},
  onVerificar,
  onCerrar,
  isLoading = false,
}: ModalIngresarCodigoProps) {
  const { t } = useTranslation()

  const [codigosIngresados, setCodigosIngresados] = useState<
    Record<string, string>
  >({})
  const [erroresPorTutor, setErroresPorTutor] = useState<
    Record<string, string>
  >({})
  const [validadosLocal, setValidadosLocal] = useState<Record<string, boolean>>(
    {}
  )
  const [intentosLocales, setIntentosLocales] = useState<
    Record<string, number>
  >({})

  const inputRefs = useRef<Record<string, TextInput | null>>({})
  const shouldFocusRef = useRef<string | null>(null)

  // Sincronizar intentosLocales con intentosFallidosPorTutor cuando llegan actualizaciones del servidor
  useEffect(() => {
    if (visible && intentosFallidosPorTutor) {
      console.log(
        '[ModalIngresarCodigo] Sincronizando intentos desde servidor:',
        intentosFallidosPorTutor
      )
      // Solo actualizar si hay valores en el servidor que son mayores a los locales
      setIntentosLocales(prevLocales => {
        const nuevosIntentos = { ...prevLocales }
        let cambios = false

        Object.keys(intentosFallidosPorTutor).forEach(tutorId => {
          const intentosServidor = intentosFallidosPorTutor[tutorId] || 0
          const intentosLocal = prevLocales[tutorId] || 0

          if (intentosServidor > intentosLocal) {
            nuevosIntentos[tutorId] = intentosServidor
            cambios = true
          }
        })

        return cambios ? nuevosIntentos : prevLocales
      })
    }
  }, [visible, intentosFallidosPorTutor])

  // Efecto para enfocar el input después de un error (cuando se limpia el código)
  useEffect(() => {
    if (shouldFocusRef.current) {
      const tutorId = shouldFocusRef.current
      shouldFocusRef.current = null

      // Usar setTimeout para asegurar que React terminó de actualizar el DOM
      const timerId = setTimeout(() => {
        inputRefs.current[tutorId]?.focus()
      }, 50)

      return () => clearTimeout(timerId)
    }
    return undefined
  }, [codigosIngresados, erroresPorTutor])

  const handleCodigoChange = (tutorId: string, text: string) => {
    const soloNumeros = text.replace(/[^0-9]/g, '')
    const limitado = soloNumeros.slice(0, 6)
    setCodigosIngresados(prev => ({ ...prev, [tutorId]: limitado }))
    setErroresPorTutor(prev => ({ ...prev, [tutorId]: '' }))
  }

  const handleVerificarTutor = async (tutorId: string) => {
    const codigo = codigosIngresados[tutorId] || ''

    if (codigo.length !== 6) {
      setErroresPorTutor(prev => ({
        ...prev,
        [tutorId]: t('paseos:validacion_codigo.codigo_debe_tener_6'),
      }))
      shouldFocusRef.current = tutorId
      return
    }

    try {
      setErroresPorTutor(prev => ({ ...prev, [tutorId]: '' }))
      await onVerificar(tutorId, codigo)
      // ✅ Solo marcar como validado si onVerificar NO lanza error
      setValidadosLocal(prev => ({ ...prev, [tutorId]: true }))
      setCodigosIngresados(prev => ({ ...prev, [tutorId]: '' }))
    } catch (err: any) {
      // ❌ Error: incrementar intentos localmente e limpiar código
      const intentosActuales = intentosLocales[tutorId] || 0
      const nuevoIntentos = intentosActuales + 1
      setIntentosLocales(prev => ({ ...prev, [tutorId]: nuevoIntentos }))

      setErroresPorTutor(prev => ({
        ...prev,
        [tutorId]: err.message || 'Código incorrecto',
      }))
      setCodigosIngresados(prev => ({ ...prev, [tutorId]: '' }))

      // NO marcar como validado
      setValidadosLocal(prev => ({ ...prev, [tutorId]: false }))

      // Marcar que este input necesita foco después de que React actualice
      shouldFocusRef.current = tutorId
    }
  }

  const handleCerrar = () => {
    setCodigosIngresados({})
    setErroresPorTutor({})
    setValidadosLocal({})
    setIntentosLocales({})
    onCerrar()
  }

  const todosValidados =
    mascotasPorTutor.length > 0 &&
    mascotasPorTutor.every(t => validadosLocal[t.tutorId])

  // Log de depuración cuando se abre el modal
  useEffect(() => {
    if (visible) {
      console.log('[ModalIngresarCodigo] Modal abierto con:')
      console.log('  - mascotasPorTutor:', mascotasPorTutor.length)
      console.log('  - intentosFallidosPorTutor:', intentosFallidosPorTutor)
      console.log('  - intentosLocales:', intentosLocales)
    }
  }, [visible])

  if (!visible) return null

  return (
    <BlurView intensity={90} style={styles.blurContainer}>
      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardContainer}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.titulo}>
              {t('paseos:validacion_codigo.titulo')}
            </Text>
            <Text style={styles.subtitulo}>
              {t('paseos:validacion_codigo.ingresa_codigo')}
            </Text>
          </View>

          {mascotasPorTutor.map((tutorData, index) => {
            const codigo = codigosIngresados[tutorData.tutorId] || ''
            const error = erroresPorTutor[tutorData.tutorId]
            const validado = validadosLocal[tutorData.tutorId]
            // Usar intentos locales (actualizados inmediatamente) o los del servidor
            const intentosFallidos = Math.max(
              intentosLocales[tutorData.tutorId] || 0,
              intentosFallidosPorTutor[tutorData.tutorId] || 0
            )
            const intentosRestantes = Math.max(0, 3 - intentosFallidos)
            const estaBloqueado = intentosRestantes === 0

            return (
              <View key={tutorData.tutorId} style={styles.contenido}>
                {!validado ? (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>
                      {t('paseos:validacion_codigo.codigo_digitos')}
                    </Text>
                    <TextInput
                      ref={el => {
                        if (el) inputRefs.current[tutorData.tutorId] = el
                      }}
                      style={[styles.input, error && styles.inputError]}
                      placeholder="000000"
                      placeholderTextColor={COLOR.INACTIVO}
                      keyboardType="numeric"
                      maxLength={6}
                      value={codigo}
                      onChangeText={text =>
                        handleCodigoChange(tutorData.tutorId, text)
                      }
                      editable={!estaBloqueado && !isLoading && !validado}
                      autoFocus={index === 0}
                    />

                    <View style={styles.digitosVisuales}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.digito,
                            i < codigo.length && styles.digitoLleno,
                          ]}
                        >
                          {codigo[i] && (
                            <Text style={styles.digitoTexto}>●</Text>
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Mostrar error solo si NO está bloqueado (para evitar duplicados) */}
                    {error && !estaBloqueado && (
                      <View style={styles.errorBox}>
                        <Icon
                          name="exclamation-circle"
                          size={16}
                          color={COLOR.ERROR}
                        />
                        <Text style={styles.errorTexto}>{error}</Text>
                      </View>
                    )}

                    {intentosRestantes > 0 && !estaBloqueado && (
                      <Text
                        style={[
                          styles.intentosTexto,
                          intentosRestantes === 1 && styles.intentosTextoUltimo,
                        ]}
                      >
                        {intentosRestantes === 3
                          ? t('paseos:validacion_codigo.tienes_intentos')
                          : t(
                              `paseos:validacion_codigo.${
                                intentosRestantes === 1
                                  ? 'intento_restante'
                                  : 'intentos_restantes'
                              }`,
                              { count: intentosRestantes }
                            )}
                      </Text>
                    )}

                    {estaBloqueado && (
                      <View style={styles.bloqueadoBox}>
                        <Text style={styles.bloqueadoTexto}>
                          {t('paseos:validacion_codigo.intentos_agotados')}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.validadoBox}>
                    <Icon
                      name="check-circle"
                      size={24}
                      color={COLOR.EXITO}
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.validadoTexto}>
                      {t('paseos:validacion_codigo.codigo_validado')}
                    </Text>
                  </View>
                )}
              </View>
            )
          })}

          <View style={styles.botonesContainer}>
            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={handleCerrar}
              disabled={isLoading}
            >
              <Text style={styles.botonSecundarioTexto}>
                {t('paseos:validacion_codigo.cancelar')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonPrimario,
                (mascotasPorTutor.some(t => {
                  const codigo = codigosIngresados[t.tutorId] || ''
                  const validado = validadosLocal[t.tutorId]
                  const intentosFallidos = Math.max(
                    intentosLocales[t.tutorId] || 0,
                    intentosFallidosPorTutor[t.tutorId] || 0
                  )
                  const estaBloqueado = intentosFallidos >= 3
                  return (
                    codigo.length !== 6 ||
                    estaBloqueado ||
                    isLoading ||
                    validado
                  )
                }) ||
                  todosValidados) &&
                  styles.botonDeshabilitado,
              ]}
              onPress={() => {
                const tutorPendiente = mascotasPorTutor.find(
                  t => !validadosLocal[t.tutorId]
                )
                if (tutorPendiente) {
                  handleVerificarTutor(tutorPendiente.tutorId)
                }
              }}
              disabled={
                isLoading ||
                todosValidados ||
                mascotasPorTutor.every(t => {
                  const codigo = codigosIngresados[t.tutorId] || ''
                  const validado = validadosLocal[t.tutorId]
                  const intentosFallidos = Math.max(
                    intentosLocales[t.tutorId] || 0,
                    intentosFallidosPorTutor[t.tutorId] || 0
                  )
                  const estaBloqueado = intentosFallidos >= 3
                  return codigo.length !== 6 || estaBloqueado || validado
                })
              }
            >
              <Text style={styles.botonPrimarioTexto}>
                {isLoading
                  ? t('paseos:validacion_codigo.verificando')
                  : todosValidados
                    ? t('paseos:validacion_codigo.todos_validados')
                    : t('paseos:validacion_codigo.verificar')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BlurView>
  )
}

const styles = StyleSheet.create({
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 24,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    lineHeight: 20,
  },
  contenido: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: COLOR.INACTIVO,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 12,
  },
  inputError: {
    borderColor: COLOR.ERROR,
    backgroundColor: '#C96B6715',
  },
  digitosVisuales: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  digito: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLOR.INACTIVO,
  },
  digitoLleno: {
    backgroundColor: COLOR.PRIMARIO,
    borderColor: COLOR.PRIMARIO,
  },
  digitoTexto: {
    fontSize: 16,
    color: COLOR.HUESO,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C96B6715',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorTexto: {
    fontSize: 12,
    color: COLOR.ERROR,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  intentosTexto: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 10,
  },
  intentosTextoUltimo: {
    color: COLOR.ALERTA,
    fontWeight: '600',
  },
  bloqueadoBox: {
    backgroundColor: '#C96B6715',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bloqueadoTexto: {
    fontSize: 12,
    color: COLOR.ERROR,
    fontWeight: '600',
    textAlign: 'center',
  },
  validadoBox: {
    backgroundColor: '#06B6D412',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#06B6D430',
  },
  validadoTexto: {
    fontSize: 13,
    color: COLOR.EXITO,
    fontWeight: '600',
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  botonSecundario: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLOR.INACTIVO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonSecundarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.SUBTEXTO,
  },
  botonPrimario: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.HUESO,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
})
