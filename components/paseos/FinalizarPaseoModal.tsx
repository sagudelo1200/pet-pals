/**
 * FinalizarPaseoModal
 * Cuidador finaliza paseo: foto del grupo (si la configuración la exige) +
 * observaciones
 *
 * Flujo:
 * 1. Foto del grupo: solo si `paseos.foto_entrega_obligatoria` está activa
 *    (requiere Firebase Storage); si no, el cierre no depende de la foto
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
import { useConfiguracion } from '@/hooks/configuracion/useConfiguracion'
import { subirFotoEntrega } from '@/services/firebase/evidencias/fotoEntrega'
import { useTranslation } from 'react-i18next'

interface FinalizarPaseoModalProps {
  visible: boolean
  paseoId: string
  /** Nombres de todas las mascotas del paseo ("Max, Luna y Rocky") */
  nombresMascotas: string
  cantidadMascotas: number
  duracionMinutos: number
  onSuccess: () => void
  onDismiss: () => void
}

export const FinalizarPaseoModal: React.FC<FinalizarPaseoModalProps> = ({
  visible,
  paseoId,
  nombresMascotas,
  cantidadMascotas,
  duracionMinutos,
  onSuccess,
  onDismiss,
}) => {
  const { t } = useTranslation(['paseos', 'comun'])
  const { foto_entrega_obligatoria: requiereFoto } = useConfiguracion('paseos')
  const [fotoUri, setFotoUri] = useState<string | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== 'granted') {
        setError(t('paseos:finalizar.sin_camara'))
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
      setError(t('paseos:finalizar.error_foto'))
    }
  }

  const handleSeleccionarGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== 'granted') {
        setError(t('paseos:finalizar.sin_galeria'))
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
      setError(t('paseos:finalizar.error_galeria'))
    }
  }

  const handleConfirmarFinalizacion = async () => {
    if (requiereFoto && !fotoUri) {
      setError(t('paseos:finalizar.foto_requerida'))
      return
    }

    setLoading(true)

    try {
      // Foto del grupo: si es obligatoria, debe quedar guardada antes de cerrar
      if (requiereFoto && fotoUri) {
        const foto = await subirFotoEntrega(paseoId, fotoUri)
        if (!foto.success) {
          setError(t('paseos:finalizar.error_guardar_foto'))
          return
        }
        await ServicioPaseo.actualizar(paseoId, {
          foto_entrega_grupo: foto.url,
        } as any)
      }

      // Las observaciones quedan en el historial del paseo; si falla no
      // bloquea la finalización
      if (observaciones.trim()) {
        const res = await ServicioPaseo.registrarEvento(
          paseoId,
          'NOTA_FINALIZACION',
          {
            observaciones: observaciones.trim(),
            duracion_minutos: duracionMinutos,
          }
        )
        if (!res.success) {
          console.warn(
            '[FinalizarPaseoModal] Error guardando observaciones:',
            res
          )
        }
      }

      Alert.alert(
        t('paseos:finalizar.exito_titulo'),
        t('paseos:finalizar.exito_mensaje'),
        [
          {
            text: t('comun:ok'),
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
      setError(err instanceof Error ? err.message : t('paseos:finalizar.error'))
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
                <Text style={styles.titulo}>{t('paseos:finalizar.titulo')}</Text>
                <Text style={styles.subtitulo}>{nombresMascotas}</Text>
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
                    {t('paseos:finalizar.duracion', {
                      minutos: duracionMinutos,
                    })}
                  </Text>
                </View>
                {requiereFoto && (
                  <View style={[styles.infoRow, { marginTop: 8 }]}>
                    <Icon name="smile" size={16} color={COLOR.PRIMARIO} />
                    <Text style={styles.infoTexto}>
                      {t('paseos:finalizar.confirma_con_foto')}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Sección de foto (solo si la configuración la exige) */}
              {requiereFoto && (
                <Card style={styles.fotoCard}>
                  <Text style={styles.seccionTitulo}>
                    {cantidadMascotas > 1
                      ? t('paseos:finalizar.foto_grupo')
                      : t('paseos:finalizar.foto_confirmacion')}
                  </Text>
                  {cantidadMascotas > 1 && (
                    <Text style={styles.infoTexto}>
                      {t('paseos:finalizar.procura_todos', {
                        nombres: nombresMascotas,
                      })}
                    </Text>
                  )}

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
                          {t('paseos:finalizar.toma_foto')}
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
                      <Text style={styles.botonFotoTexto}>{t('paseos:finalizar.camara')}</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.botonFoto, styles.botonFotoSecundario]}
                      onPress={handleSeleccionarGaleria}
                      disabled={loading}
                    >
                      <Icon name="image" size={18} color={COLOR.PRIMARIO} />
                      <Text style={styles.botonFotoTextoSecundario}>
                        {t('paseos:finalizar.galeria')}
                      </Text>
                    </Pressable>
                  </View>
                </Card>
              )}

              {/* Observaciones */}
              <Card style={styles.obsCard}>
                <Text style={styles.seccionTitulo}>
                  {t('paseos:finalizar.observaciones')}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('paseos:finalizar.observaciones_placeholder')}
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
                  <Icon
                    name="exclamation-circle"
                    size={16}
                    color={COLOR.ERROR}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.infoGeneralContainer}>
                <Icon name="info" size={16} color={COLOR.PRIMARIO} />
                <Text style={styles.infoGeneralTexto}>
                  {t('paseos:finalizar.info_posterior')}
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
                <Text style={styles.botonCancelarTexto}>{t('comun:cancelar')}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.botonConfirmar,
                  ((requiereFoto && !fotoUri) || loading) &&
                    styles.botonDisabled,
                ]}
                onPress={handleConfirmarFinalizacion}
                disabled={(requiereFoto && !fotoUri) || loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon name="check-circle" size={18} color="white" />
                    <Text style={styles.botonConfirmarTexto}>
                      {t('paseos:finalizar.confirmar')}
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
