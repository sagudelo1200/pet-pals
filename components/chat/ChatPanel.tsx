import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Icon } from '@/components/ui'
import { Mensaje } from '@/models/Chat'
import { useMensajesPaseo } from '@/hooks/chat/useMensajesPaseo'
import { useAuth } from '@/context/AuthContext'
import { COLOR } from '@/constants'

interface ChatPanelProps {
  /** ID del paseo asociado al chat */
  paseoId: string
  /** Controla si el bottom sheet está visible */
  visible: boolean
  /** Callback cuando se cierra el panel */
  onClose: () => void
}

/**
 * ChatPanel: Bottom sheet reutilizable para chat de paseos.
 * Props: paseoId, visible, onClose
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  paseoId,
  visible,
  onClose,
}) => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const inputRef = useRef<TextInput>(null)
  const [contenido, setContenido] = useState('')

  const {
    conversacion,
    mensajes,
    loading,
    error,
    enviando,
    enviarMensaje,
    marcarComoLeido,
  } = useMensajesPaseo(paseoId)

  // Marcar como leído el primer mensaje no leído cuando el panel abre
  useEffect(() => {
    if (visible && conversacion && mensajes.length > 0 && user?.uid) {
      const primerNoLeido = mensajes.find(m => !m.leidos_por?.[user.uid])
      if (primerNoLeido) {
        marcarComoLeido(primerNoLeido.id)
      }
    }
  }, [visible, conversacion, mensajes, user?.uid, marcarComoLeido])

  const handleEnviar = async () => {
    if (!contenido.trim() || enviando) return

    const resultado = await enviarMensaje(contenido)
    if (resultado) {
      setContenido('')
      inputRef.current?.clear()
    }
  }

  const renderMensaje = ({ item }: { item: Mensaje }) => {
    const esDelUsuario = item.autor_uid === user?.uid
    const esDelTutor = item.autor_uid === conversacion?.tutor_id

    return (
      <View
        style={[
          styles.mensajeContainer,
          esDelUsuario && styles.mensajeDelUsuario,
        ]}
      >
        {/* Indicador de rol del autor (encima del mensaje) */}
        {!esDelUsuario && (
          <View style={styles.autorBadgeWrapper}>
            <Text style={styles.autorLabel}>
              {esDelTutor ? '👤 Tutor' : '🚶 Cuidador'}
            </Text>
          </View>
        )}

        {/* Burbuja de mensaje */}
        <View
          style={[
            styles.burbuja,
            esDelUsuario ? styles.burbujaDelUsuario : styles.burbujaDelOtro,
            // Estilos especiales por tipo
            item.tipo_mensaje === 'sistema' && styles.burbujaDelSistema,
            item.tipo_mensaje === 'notificacion' &&
              styles.burbujaDelNotificacion,
          ]}
        >
          {/* Contenido */}
          <Text
            style={[
              styles.contenido,
              esDelUsuario
                ? styles.contenidoDelUsuario
                : styles.contenidoDelOtro,
            ]}
          >
            {item.contenido}
          </Text>

          {/* Timestamp + indicador de leído */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.timestamp,
                esDelUsuario
                  ? styles.timestampDelUsuario
                  : styles.timestampDelOtro,
              ]}
            >
              {item.creado_en
                ? new Date(item.creado_en).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </Text>

            {/* Indicador de leído (solo para mensajes del usuario) */}
            {esDelUsuario &&
              item.leidos_por?.[conversacion?.cuidador_id || ''] && (
                <Icon
                  name="check"
                  size={12}
                  color={COLOR.ENFASIS}
                  style={styles.iconoLeido}
                />
              )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height="80%"
      showBackdrop={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {t('chat:titulo') || 'Chat del Paseo'}
              </Text>
              <Text style={styles.subtitle}>
                {conversacion ? 'En línea' : 'Cargando...'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="times" size={24} color={COLOR.TEXTO} />
            </TouchableOpacity>
          </View>

          {/* Contenedor principal de mensajes - con flex */}
          <View style={styles.listaWrapper}>
            {loading && (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLOR.ENFASIS} />
              </View>
            )}

            {error && (
              <View style={styles.centerContent}>
                <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!loading && !error && mensajes.length === 0 && (
              <View style={styles.centerContent}>
                <Icon name="comments" size={48} color={COLOR.BORDE} />
                <Text style={styles.emptyText}>
                  {t('chat:sin_mensajes') || 'Sin mensajes aún'}
                </Text>
              </View>
            )}

            {!loading && !error && mensajes.length > 0 && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.listaContentPadding}
                scrollEnabled={true}
              >
                {mensajes.map(mensaje => (
                  <View key={mensaje.id}>
                    {renderMensaje({ item: mensaje })}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              placeholder={t('chat:escribe_mensaje') || 'Escribe un mensaje...'}
              placeholderTextColor={COLOR.SUBTEXTO}
              value={contenido}
              onChangeText={setContenido}
              multiline
              maxLength={500}
              style={styles.input}
              editable={!enviando && !!conversacion}
            />
            <TouchableOpacity
              onPress={handleEnviar}
              disabled={enviando || !contenido.trim() || !conversacion}
              style={[
                styles.botonEnviar,
                (enviando || !contenido.trim() || !conversacion) &&
                  styles.botonEnviarDeshabilitado,
              ]}
            >
              {enviando ? (
                <ActivityIndicator size="small" color={COLOR.BASE} />
              ) : (
                <Icon name="paper-plane" size={20} color={COLOR.BASE} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    flexDirection: 'column',
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
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  subtitle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLOR.ERROR,
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    color: COLOR.SUBTEXTO,
    marginTop: 12,
    fontSize: 14,
  },
  mensajesWrapper: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    overflow: 'hidden',
  },
  listaWrapper: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  listaContentPadding: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  mensajeContainer: {
    marginVertical: 6,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginHorizontal: 4,
    minHeight: 40,
  },
  mensajeDelUsuario: {
    alignItems: 'flex-end',
  },
  autorBadgeWrapper: {
    marginBottom: 4,
    marginHorizontal: 0,
  },
  autorLabel: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  burbuja: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  burbujaDelUsuario: {
    backgroundColor: COLOR.ENFASIS,
  },
  burbujaDelOtro: {
    backgroundColor: COLOR.BLOQUE,
  },
  burbujaDelSistema: {
    backgroundColor: COLOR.BORDE,
    opacity: 0.7,
  },
  burbujaDelNotificacion: {
    backgroundColor: COLOR.ALERTA,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.ALERTA,
  },
  contenido: {
    fontSize: 14,
    lineHeight: 20,
  },
  contenidoDelUsuario: {
    color: COLOR.BASE,
  },
  contenidoDelOtro: {
    color: COLOR.TEXTO,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  timestamp: {
    fontSize: 11,
  },
  timestampDelUsuario: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampDelOtro: {
    color: COLOR.SUBTEXTO,
  },
  iconoLeido: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  input: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    minHeight: 44,
    maxHeight: 100,
    color: COLOR.TEXTO,
    fontSize: 14,
  },
  botonEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLOR.ENFASIS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonEnviarDeshabilitado: {
    backgroundColor: COLOR.SUBTEXTO,
    opacity: 0.5,
  },
})
