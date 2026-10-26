/**
 * ModalValidacionEntrega
 * Tutor valida la entrega del paseo ingresando código de 6 dígitos
 *
 * Flujo:
 * 1. Tutor ingresa código
 * 2. Sistema valida con validarRecepcionTutor()
 * 3. Si correcto → transiciona a COMPLETADO → "Proceder a pago"
 * 4. Si incorrecto → muestra intentos restantes
 */

import React, { useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { validarRecepcionTutor } from '@/logic/paseos/casosDeUso'
import { useCodigoInput } from '@/hooks'
import { useTranslation } from 'react-i18next'

interface ModalValidacionEntregaProps {
  visible: boolean
  paseoId: string
  tutorId: string
  nombreMascota: string
  nombreCuidador: string
  onSuccess: () => void
  onDismiss: () => void
}

export const ModalValidacionEntrega: React.FC<ModalValidacionEntregaProps> = ({
  visible,
  paseoId,
  tutorId,
  nombreMascota,
  nombreCuidador,
  onSuccess,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation(['tutor', 'comun'])
  const {
    codigo,
    loading,
    bloqueado,
    intentosRestantes,
    error,
    handleDigito,
    handleBorrar,
    handleValidar,
    resetear,
  } = useCodigoInput({
    digitos: 6,
    maxIntentos: 3,
    onValidar: async cod => {
      return validarRecepcionTutor(paseoId, tutorId, cod)
    },
  })

  // Resetear cuando se abre/cierra el modal
  useEffect(() => {
    if (visible) {
      resetear()
    }
  }, [visible, resetear])

  const handleConfirmar = async () => {
    const resultado = await handleValidar()
    if (resultado.success) {
      // ✅ Validación exitosa
      Alert.alert(
        t('tutor:entrega.validada'),
        t('tutor:entrega.validada_desc'),
        [
        {
          text: t('comun:ok'),
          onPress: onSuccess,
        },
      ])
    } else if (bloqueado) {
      // ❌ Intentos agotados
      Alert.alert(
        t('tutor:entrega.intentos_agotados'),
        t('tutor:entrega.contacta_cuidador'),
        [{ text: t('comun:ok'), onPress: onDismiss }]
      )
    }
  }

  const DigitInput = ({ index }: { index: number }) => (
    <View style={styles.digitBox}>
      <Text style={styles.digitText}>{codigo[index] || ''}</Text>
    </View>
  )

  const DigitButton = ({ digit }: { digit: string }) => (
    <Pressable
      style={styles.numberButton}
      onPress={() => handleDigito(digit)}
      disabled={loading || codigo.length >= 6}
    >
      <Text style={styles.numberText}>{digit}</Text>
    </Pressable>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={[`${COLOR.PRIMARIO}05`, `${COLOR.SECUNDARIO}05`]}
          style={styles.background}
        >
          <View style={styles.content}>
            {/* Scroll de respaldo: en pantallas cortas el botón sigue accesible */}
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            >
              <Pressable style={styles.closeButton} onPress={onDismiss}>
                <Icon name="times" size={24} color={COLOR.SUBTEXTO} />
              </Pressable>

              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[COLOR.EXITO, `${COLOR.EXITO}80`]}
                    style={styles.checkIcon}
                  >
                    <Icon name="check-circle" size={32} color="white" />
                  </LinearGradient>
                </View>
                <Text style={styles.titulo}>{t('tutor:entrega.titulo')}</Text>
                <Text style={styles.subtitulo}>
                  {t('tutor:entrega.entregado_por', {
                    mascota: nombreMascota,
                    cuidador: nombreCuidador,
                  })}
                </Text>
              </View>

              <Card style={styles.card}>
                <Text style={styles.instruccion}>
                  {t('tutor:entrega.ingresa_codigo')}
                </Text>

                {/* Input visual */}
                <View style={styles.digitContainer}>
                  <DigitInput index={0} />
                  <DigitInput index={1} />
                  <DigitInput index={2} />
                  <DigitInput index={3} />
                  <DigitInput index={4} />
                  <DigitInput index={5} />
                </View>

                {/* Teclado numérico */}
                <View style={styles.keypad}>
                  <View style={styles.row}>
                    <DigitButton digit="1" />
                    <DigitButton digit="2" />
                    <DigitButton digit="3" />
                  </View>
                  <View style={styles.row}>
                    <DigitButton digit="4" />
                    <DigitButton digit="5" />
                    <DigitButton digit="6" />
                  </View>
                  <View style={styles.row}>
                    <DigitButton digit="7" />
                    <DigitButton digit="8" />
                    <DigitButton digit="9" />
                  </View>
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.numberButton, styles.clearButton]}
                      onPress={resetear}
                      disabled={loading}
                    >
                      <Text style={styles.clearText}>{t('tutor:entrega.limpiar')}</Text>
                    </Pressable>
                    <DigitButton digit="0" />
                    <Pressable
                      style={[styles.numberButton, styles.backspaceButton]}
                      onPress={handleBorrar}
                      disabled={loading || codigo.length === 0}
                    >
                      <Icon name="backspace" size={20} color={COLOR.SUBTEXTO} />
                    </Pressable>
                  </View>
                </View>

                {/* Error */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Icon
                      name="exclamation-circle"
                      size={16}
                      color={COLOR.ERROR}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Intentos */}
                <Text style={styles.intentos}>
                  {t('tutor:entrega.intentos_restantes', {
                    restantes: intentosRestantes,
                  })}
                </Text>

                {/* Botón validar */}
                <Pressable
                  style={[
                    styles.botonValidar,
                    (loading || codigo.length !== 6 || bloqueado) &&
                      styles.botonDisabled,
                  ]}
                  onPress={handleConfirmar}
                  disabled={loading || codigo.length !== 6 || bloqueado}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Icon name="check" size={20} color="white" />
                      <Text style={styles.botonText}>{t('tutor:entrega.validar_codigo')}</Text>
                    </>
                  )}
                </Pressable>
              </Card>
            </ScrollView>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  background: {
    flex: 1,
  },
  content: {
    backgroundColor: COLOR.BLOQUE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '94%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  checkIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  card: {
    padding: 20,
  },
  instruccion: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 14,
    textAlign: 'center',
  },
  digitContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  digitBox: {
    width: 44,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLOR.PRIMARIO}10`,
  },
  digitText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  keypad: {
    gap: 8,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  // Altura fija: con aspectRatio 1 las teclas eran cuadradas a todo el ancho
  // (~90 px) y el teclado empujaba el botón fuera de la pantalla
  numberButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  numberText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  clearButton: {
    backgroundColor: `${COLOR.ERROR}10`,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.ERROR,
  },
  backspaceButton: {
    backgroundColor: COLOR.SECUNDARIO,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${COLOR.ERROR}10`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLOR.ERROR,
    flex: 1,
  },
  intentos: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 16,
  },
  botonValidar: {
    flexDirection: 'row',
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  botonDisabled: {
    opacity: 0.5,
  },
  botonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
})
