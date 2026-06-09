import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native'
import { BlurView } from 'expo-blur'
import * as Clipboard from 'expo-clipboard'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'

interface ModalCodigoRecogidaTutorProps {
  visible: boolean
  codigo?: string
  codigoValidado?: boolean
  esUnicoTutor?: boolean // Si es el único tutor, cierra automáticamente al validarse
  // onConfirmar: acción cuando el tutor confirma la llegada
  onConfirmar: () => void
  onCancelar?: () => void
}

export function ModalCodigoRecogidaTutor({
  visible,
  codigo,
  codigoValidado = false,
  esUnicoTutor = false,
  onConfirmar,
  onCancelar,
}: ModalCodigoRecogidaTutorProps) {
  const { t } = useTranslation()
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!visible) setCopiado(false)
  }, [visible])

  // Si es único tutor y se valida, cerrar automáticamente después de pequeño delay
  useEffect(() => {
    if (codigoValidado && esUnicoTutor && visible) {
      const timer = setTimeout(() => {
        onConfirmar()
      }, 800) // Dar tiempo para que vea el checkmark

      return () => clearTimeout(timer)
    }
    // Retorna undefined si no se cumple la condición
    return undefined
  }, [codigoValidado, esUnicoTutor, visible, onConfirmar])

  const handleConfirmar = () => {
    onConfirmar()
  }

  const handleCopiarCodigo = async () => {
    try {
      const text = codigo || ''
      await Clipboard.setStringAsync(text)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.warn('No se pudo copiar el código', err)
    }
  }

  const handleCancelarPress = () => {
    Alert.alert(
      t('comun:atencion'),
      t('paseos:validacion_codigo.cancelar_confirmacion') ||
        '¿Cancelar la recogida?',
      [
        { text: t('comun:no'), style: 'cancel' },
        { text: t('comun:si'), onPress: () => onCancelar && onCancelar() },
      ]
    )
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={80} style={styles.blurContainer}>
        <View style={styles.container}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.titulo}>
                {t('paseos:validacion_codigo.titulo_tutor') ||
                  'Código de Recogida'}
              </Text>
              <Text style={styles.subtitulo}>
                {t('paseos:validacion_codigo.comparte_codigo_desc') ||
                  'Comparte este código con el cuidador cuando llegue'}
              </Text>
            </View>

            {/* Código grande y copiar */}
            <View style={styles.codigoContainer}>
              <Text style={styles.codigoLabel}>
                {t('paseos:validacion_codigo.codigo_digitos') || 'Código'}:
              </Text>
              <View style={styles.codigoPrincipal}>
                <Text style={styles.codigo}>{codigo || '------'}</Text>
              </View>

              <TouchableOpacity
                style={[styles.botonCopiar, copiado && styles.botonCopiado]}
                onPress={handleCopiarCodigo}
              >
                <Icon
                  name={copiado ? 'check' : 'copy'}
                  size={16}
                  color={COLOR.PRIMARIO}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.botonCopiarTexto}>
                  {copiado
                    ? t('paseos:validacion_codigo.copiado') || 'Copiado'
                    : t('paseos:validacion_codigo.copiar_codigo') ||
                      'Copiar código'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Indicador de validación */}
            {!codigoValidado && (
              <View style={styles.validacionPendiente}>
                <Text style={styles.validacionPendienteTexto}>
                  ⏳ Esperando que el cuidador valide el código...
                </Text>
              </View>
            )}
            {codigoValidado && (
              <View style={styles.validacionExitosa}>
                <Text style={styles.validacionExitosaTexto}>
                  ✅ ¡Código validado!
                </Text>
              </View>
            )}

            {/* Botones */}
            <View style={styles.botonesContainer}>
              {onCancelar && (
                <TouchableOpacity
                  style={styles.botonSecundario}
                  onPress={handleCancelarPress}
                >
                  <Text style={styles.botonSecundarioTexto}>
                    {t('paseos:validacion_codigo.cancelar')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.botonPrimario,
                  !onCancelar && styles.botonFullWidth,
                  !codigoValidado && styles.botonDeshabilitado,
                ]}
                onPress={handleConfirmar}
                disabled={!codigoValidado}
              >
                <Text style={styles.botonPrimarioTexto}>
                  {t('paseos:validacion_codigo.confirmar_entrega')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 16,
    padding: 24,
    paddingBottom: 120,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    shadowColor: COLOR.SOMBRA,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 20,
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
    lineHeight: 20,
  },
  mascotasContainer: {
    display: 'none',
  },
  mascotasLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    marginBottom: 10,
  },
  mascotasList: {
    paddingVertical: 0,
    paddingLeft: 0,
  },
  mascotaItem: {
    display: 'none',
  },
  mascotaNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  codigoContainer: { alignItems: 'center', marginBottom: 24 },
  codigoLabel: { fontSize: 13, fontWeight: '600', color: COLOR.SUBTEXTO },
  codigoPrincipal: {
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLOR.PRIMARIO,
  },
  codigo: {
    fontSize: 48,
    fontWeight: '800',
    color: COLOR.HUESO,
    letterSpacing: 6,
    textAlign: 'center',
  },
  botonCopiar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLOR.PRIMARIO,
    marginBottom: 8,
    backgroundColor: 'transparent',
    zIndex: 30,
    elevation: 10,
  },
  botonCopiado: { backgroundColor: '#06B6D412' },
  botonCopiarTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  instruccionesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FED73312',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  instruccionesTexto: {
    fontSize: 12,
    color: COLOR.ALERTA,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
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
  botonFullWidth: {
    flex: 1,
  },
  botonPrimarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.HUESO,
  },
  validacionPendiente: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  validacionPendienteTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
  },
  validacionExitosa: {
    backgroundColor: '#D4EDDA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  validacionExitosaTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#155724',
  },
  botonDeshabilitado: {
    backgroundColor: COLOR.INACTIVO,
    opacity: 0.6,
  },
})
