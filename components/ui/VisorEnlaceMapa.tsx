import React from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HOSTS_ATRIBUCION } from '@/services/maps/carto'
import { COLOR } from '@/constants'
import Icon from './Icon'
import { useTranslation } from 'react-i18next'

interface Props {
  url: string | null
  onCerrar: () => void
}

/**
 * Visor interno para los enlaces de atribución del mapa (OSM / CARTO).
 * Solo permite navegar dentro de los hosts de atribución.
 */
export const VisorEnlaceMapa: React.FC<Props> = ({ url, onCerrar }) => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation('comun')

  return (
    <Modal
      visible={!!url}
      animationType="slide"
      transparent
      onRequestClose={onCerrar}
    >
      <Pressable style={styles.fondo} onPress={onCerrar} />
      <View style={[styles.contenedor, { paddingBottom: insets.bottom }]}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo} numberOfLines={1}>
            {t('mapa.creditos')}
          </Text>
          <TouchableOpacity
            onPress={onCerrar}
            style={styles.cerrar}
            accessibilityLabel={t('cerrar')}
            activeOpacity={0.7}
          >
            <Icon name="times" size={20} color={COLOR.TEXTO} />
          </TouchableOpacity>
        </View>
        {url && (
          <WebView
            source={{ uri: url }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <ActivityIndicator
                style={StyleSheet.absoluteFill}
                size="large"
                color={COLOR.PRIMARIO}
              />
            )}
            onShouldStartLoadWithRequest={req => {
              try {
                const u = new URL(req.url)
                return (
                  u.protocol === 'https:' &&
                  HOSTS_ATRIBUCION.includes(u.hostname)
                )
              } catch {
                return false
              }
            }}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  contenedor: {
    height: '55%',
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  titulo: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '600', flex: 1 },
  cerrar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: { flex: 1, backgroundColor: COLOR.BASE },
})

export default VisorEnlaceMapa
