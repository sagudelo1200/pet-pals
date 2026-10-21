/**
 * FinalizarPaseoModal
 * Cuidador finaliza paseo: tomar fotos + observaciones
 *
 * Flujo:
 * 1. Tomar foto de confirmación (mascota)
 * 2. Agregar observaciones (opcional)
 * 3. Confirmar → las observaciones quedan en el historial del paseo
 * 4. Estado: FINALIZADO → el servidor genera el cobro y el pago al cuidador
 */

import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  TextInput,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import { COLOR } from '@/constants'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { ServicioPaseo } from '@/services/firebase'

interface FinalizarPaseoModalProps {
  visible: boolean
  paseoId: string
  nombreMascota: string
  nombreTutor: string
  duracionMinutos: number
  onSuccess: () => void
  onDismiss: () => void
}

export const FinalizarPaseoModal: React.FC<FinalizarPaseoModalProps> = ({
  visible,
  paseoId,
  nombreMascota,
  nombreTutor,
  duracionMinutos,
  onSuccess,
  onDismiss,
}) => {
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== 'granted') {
        setError('Necesitamos acceso a la cámara')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri)
        setError(null)
      }
    } catch (err) {
      console.error('[FinalizarPaseoModal] Error cámara:', err)
      setError('Error al tomar foto')
    }
  }

  const handleSeleccionarGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== 'granted') {
        setError('Necesitamos acceso a la galería')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFotoUri(result.assets[0].uri)
        setError(null)
      }
    } catch (err) {
      console.error('[FinalizarPaseoModal] Error galería:', err)
      setError('Error al seleccionar foto')
    }
  }

  const handleConfirmarFinalizacion = async () => {
    if (!fotoUri) {
      setError('Debes tomar una foto de confirmación')
      return
    }

    setLoading(true)

    try {
      // Las observaciones quedan en el historial del paseo; si falla no
      // bloquea la finalización
      if (observaciones.trim()) {
        const res = await ServicioPaseo.registrarEvento(
          paseoId,
          'NOTA_FINALIZACION',
          { observaciones: observaciones.trim(), duracion_minutos: duracionMinutos }
        )
        if (!res.success) {
          console.warn('[FinalizarPaseoModal] Error guardando observaciones:', res)
        }
      }

      Alert.alert(
        '✅ Paseo Finalizado',
        'El servicio ha sido registrado. Esperando confirmación del tutor.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFotoUri(null)
              setObservaciones('')
              setError(null)
              onSuccess()
            },
          },
        ]
      )
    } catch (err) {
      console.error('[FinalizarPaseoModal] Error:', err)
      setError(err instanceof Error ? err.message : 'Error al finalizar paseo')
    } finally {
      setLoading(false)
    }
  }

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
            <View style={styles.header}>
              <Pressable style={styles.closeButton} onPress={onDismiss}>
                <Icon name="times" size={24} color={COLOR.TEXTO} />
              </Pressable>

              <View style={styles.headerContent}>
                <Text style={styles.titulo}>Finalizar Paseo</Text>
                <Text style={styles.subtitulo}>
                  {nombreMascota} - {nombreTutor}
                </Text>
              </View>

              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Información del paseo */}
              <Card style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Icon name="clock" size={16} color={COLOR.PRIMARIO} />
                  <Text style={styles.infoTexto}>
                    Duración: {duracionMinutos} minutos
                  </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 8 }]}>
                  <Icon name="smile" size={16} color={COLOR.PRIMARIO} />
                  <Text style={styles.infoTexto}>
                    Confirma con foto del paseo finalizado
                  </Text>
                </View>
              </Card>

              {/* Sección de foto */}
              <Card style={styles.fotoCard}>
                <Text style={styles.seccionTitulo}>Foto de Confirmación</Text>

                {fotoUri ? (
                  <View style={styles.fotoContainer}>
                    <Image
                      source={{ uri: fotoUri }}
                      style={styles.foto}
                      resizeMode="cover"
                    />
                    <Pressable
                      style={styles.cambiarFotoButton}
                      onPress={handleTomarFoto}
                    >
                      <Icon name="camera" size={20} color={COLOR.PRIMARIO} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.fotoPlaceholder}>
                    <LinearGradient
                      colors={[`${COLOR.PRIMARIO}10`, `${COLOR.PRIMARIO}05`]}
                      style={styles.placeholderGradient}
                    >
                      <Icon name="camera" size={48} color={COLOR.PRIMARIO} />
                      <Text style={styles.placeholderText}>
                        Toma una foto del paseo
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.botonesFoto}>
                  <Pressable
                    style={styles.botonFoto}
                    onPress={handleTomarFoto}
                    disabled={loading}
                  >
                    <Icon name="camera" size={18} color="white" />
                    <Text style={styles.botonFotoTexto}>Cámara</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.botonFoto, styles.botonFotoSecundario]}
                    onPress={handleSeleccionarGaleria}
                    disabled={loading}
                  >
                    <Icon name="image" size={18} color={COLOR.PRIMARIO} />
                    <Text style={styles.botonFotoTextoSecundario}>Galería</Text>
                  </Pressable>
                </View>
              </Card>

              {/* Observaciones */}
              <Card style={styles.obsCard}>
                <Text style={styles.seccionTitulo}>
                  Observaciones (Opcional)
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="¿Cómo le fue a la mascota? (ej: 'Muy feliz, corrió todo el tiempo')"
                  placeholderTextColor={COLOR.SUBTEXTO}
                  multiline
                  numberOfLines={4}
                  value={observaciones}
                  onChangeText={setObservaciones}
                  editable={!loading}
                />
                <Text style={styles.charCount}>{observaciones.length}/200</Text>
              </Card>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Icon name="exclamation-circle" size={16} color={COLOR.ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.infoGeneralContainer}>
                <Icon name="info" size={16} color={COLOR.PRIMARIO} />
                <Text style={styles.infoGeneralTexto}>
                  Después de confirmar, el tutor validará la entrega y procederá
                  al pago. Recibirás notificación cuando se liquide.
                </Text>
              </View>
            </ScrollView>

            {/* Botones de acción */}
            <View style={styles.footer}>
              <Pressable
                style={styles.botonCancelar}
                onPress={onDismiss}
                disabled={loading}
              >
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.botonConfirmar,
                  (!fotoUri || loading) && styles.botonDisabled,
                ]}
                onPress={handleConfirmarFinalizacion}
                disabled={!fotoUri || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color="white" />
                    <Text style={styles.botonConfirmarTexto}>
                      Confirmar Finalización
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
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
    minHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLOR.SUBTEXTO}10`,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  subtitulo: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoCard: {
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTexto: {
    fontSize: 13,
    color: COLOR.TEXTO,
    flex: 1,
  },
  fotoCard: {
    padding: 14,
  },
  seccionTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  fotoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  foto: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },
  cambiarFotoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLOR.SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fotoPlaceholder: {
    marginBottom: 12,
  },
  placeholderGradient: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${COLOR.PRIMARIO}40`,
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: COLOR.PRIMARIO,
    fontWeight: '500',
  },
  botonesFoto: {
    flexDirection: 'row',
    gap: 10,
  },
  botonFoto: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  botonFotoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  botonFotoSecundario: {
    backgroundColor: COLOR.SECUNDARIO,
    borderWidth: 1,
    borderColor: `${COLOR.PRIMARIO}30`,
  },
  botonFotoTextoSecundario: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
  },
  obsCard: {
    padding: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: `${COLOR.SUBTEXTO}20`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLOR.TEXTO,
    textAlignVertical: 'top',
    marginBottom: 6,
    fontFamily: 'System',
  },
  charCount: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLOR.ERROR}10`,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLOR.ERROR,
    flex: 1,
  },
  infoGeneralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${COLOR.PRIMARIO}10`,
    borderRadius: 8,
  },
  infoGeneralTexto: {
    fontSize: 12,
    color: COLOR.PRIMARIO,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: `${COLOR.SUBTEXTO}10`,
  },
  botonCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLOR.SUBTEXTO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonCancelarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  botonConfirmar: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLOR.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  botonDisabled: {
    opacity: 0.5,
  },
  botonConfirmarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
})
