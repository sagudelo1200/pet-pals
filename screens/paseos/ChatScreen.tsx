import React, { useRef, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { Icon } from '@/components/ui'
import { Mensaje } from '@/models/Chat'
import { useMensajesPaseo } from '@/hooks/chat/useMensajesPaseo'
import { useAuth } from '@/context/AuthContext'
import { COLOR } from '@/constants'
import { InputFooter } from './InputFooter'
import type { AuthStackParamList } from '@/navigation/types'

type Nav = StackNavigationProp<AuthStackParamList, 'Chat'>

interface ChatScreenParams {
  paseoId: string
}

/**
 * ChatScreen: Pantalla completa para chat de paseos
 */
export const ChatScreen: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const route = useRoute()
  const { user } = useAuth()
  const inputRef = useRef<TextInput>(null)
  const scrollViewRef = useRef<FlashListRef<Mensaje>>(null)
  const [contenido, setContenido] = useState('')

  const params = route.params as ChatScreenParams
  const paseoId = params?.paseoId

  const {
    conversacion,
    mensajes,
    loading,
    error,
    enviando,
    enviarMensaje,
    marcarComoLeido,
  } = useMensajesPaseo(paseoId)

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (mensajes.length > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false })
      }, 50)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [mensajes.length])

  // Marcar como leído (simple)
  useEffect(() => {
    if (conversacion && mensajes.length > 0 && user?.uid) {
      const primerNoLeido = mensajes.find(m => !m.leidos_por?.[user.uid])
      if (primerNoLeido) {
        marcarComoLeido(primerNoLeido.id)
      }
    }
    return undefined
  }, [conversacion?.id, mensajes.length, user?.uid, marcarComoLeido])

  const handleEnviar = async () => {
    if (!contenido.trim() || enviando) return

    const resultado = await enviarMensaje(contenido)
    if (resultado) {
      setContenido('')
      inputRef.current?.clear()
    }
  }

  const renderMensaje = (item: Mensaje) => {
    const esDelUsuario = item.autor_uid === user?.uid
    const esDelTutor = item.autor_uid === conversacion?.tutor_id

    return (
      <View
        style={[styles.msg, esDelUsuario ? styles.msgUser : styles.msgOther]}
      >
        {!esDelUsuario && (
          <Text style={styles.badge}>{esDelTutor ? '👤' : '🚶'}</Text>
        )}
        <View
          style={[
            styles.bubble,
            esDelUsuario ? styles.bubbleUser : styles.bubbleOther,
          ]}
        >
          <Text
            style={[
              styles.text,
              esDelUsuario ? styles.textUser : styles.textOther,
            ]}
          >
            {item.contenido}
          </Text>
          <Text
            style={[
              styles.time,
              esDelUsuario ? styles.timeUser : styles.timeOther,
            ]}
          >
            {item.creado_en
              ? new Date(item.creado_en).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <Screen>
      <ScreenHeader
        title={t('chat:titulo') || 'Chat'}
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLOR.ENFASIS} />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Icon name="exclamation-circle" size={48} color={COLOR.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          {mensajes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="comments" size={48} color={COLOR.BORDE} />
              <Text style={styles.emptyText}>
                {t('chat:sin_mensajes') || 'Sin mensajes'}
              </Text>
            </View>
          ) : (
            <FlashList
              ref={scrollViewRef}
              data={mensajes}
              renderItem={({ item }) => renderMensaje(item)}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.contentContainer}
              scrollEnabled={true}
              keyboardDismissMode="on-drag"
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoiding}
          >
            <InputFooter
              inputRef={inputRef}
              contenido={contenido}
              setContenido={setContenido}
              handleEnviar={handleEnviar}
              enviando={enviando}
              conversacion={conversacion}
            />
          </KeyboardAvoidingView>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    flexDirection: 'column',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msg: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  msgUser: {
    justifyContent: 'flex-end',
  },
  msgOther: {
    justifyContent: 'flex-start',
  },
  badge: {
    fontSize: 12,
    marginRight: 6,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bubbleUser: {
    backgroundColor: COLOR.ENFASIS,
  },
  bubbleOther: {
    backgroundColor: COLOR.BLOQUE,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: COLOR.BASE,
  },
  textOther: {
    color: COLOR.TEXTO,
  },
  time: {
    fontSize: 11,
    marginTop: 4,
  },
  timeUser: {
    color: COLOR.TEXTO,
  },
  timeOther: {
    color: COLOR.SUBTEXTO,
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
})
