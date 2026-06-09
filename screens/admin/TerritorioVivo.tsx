import React, { useMemo } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useZonasH3 } from '@/hooks/admin/useZonasH3'
import { COLOR } from '@/constants'
import { construirHTML } from './territorioVivoHtml'

// ─── Componente ──────────────────────────────────────────────────────────────
const TerritorioVivo: React.FC = () => {
  const { zonas, cargando, error } = useZonasH3()
  const insets = useSafeAreaInsets()

  // Calcular altura del tab bar para dejar espacio
  const tabBarHeight =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  const htmlSource = useMemo(
    () => construirHTML(zonas, insets.top, tabBarHeight),
    [zonas, insets.top, tabBarHeight]
  )

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        <Text style={styles.textoEstado}>Cargando zonas…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.contenedor}>
      {/* Badge de conteo */}
      <View style={[styles.badge, { top: insets.top + 12 }]}>
        <Text style={styles.badgeTexto}>{zonas.length} zonas</Text>
      </View>

      <WebView
        source={{ html: htmlSource }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        // Android: permite cargar recursos mixtos (CDN http/https)
        mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
        // Oculta el scroll nativo del WebView para que Leaflet controle el gesto
        scrollEnabled={false}
        // Bloquear navegación externa (ej. tap en la marca de agua "Leaflet")
        onShouldStartLoadWithRequest={request => {
          // Permitir solo la carga inicial del HTML en memoria
          return request.url === 'about:blank' || request.url === ''
        }}
        onError={e =>
          console.warn('[TerritorioVivo] WebView error:', e.nativeEvent)
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  webview: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  centrado: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  textoEstado: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
  },
  textoError: {
    color: COLOR.ERROR,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(18,25,24,0.90)',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeTexto: {
    color: COLOR.TEXTO,
    fontSize: 12,
    fontWeight: '600',
  },
})

export default TerritorioVivo
