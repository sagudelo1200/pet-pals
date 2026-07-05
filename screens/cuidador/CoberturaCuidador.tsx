import React, { useState, useMemo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '@/context/AuthContext'
import { useCoberturaCuidador } from '@/hooks/cuidador/useCoberturaCuidador'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { COLOR } from '@/constants'
import { coordsAH3 } from '@/services/geo'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { construirHTMLCobertura } from './coberturaHtml'

export default function CoberturaCuidador() {
  const navigation = useNavigation()
  const { user, profile } = useAuth()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<WebView>(null)

  // Fallback: calcular h3 desde la dirección principal si PerfilPublico.h3_home aún no fue guardado
  const h3HomeDesdeAuth = useMemo(() => {
    const principal = profile?.ubicaciones?.find(u => u.es_principal)
    // Primero intenta usar h3_index guardado en la referencia
    if (principal?.h3_index) {
      return principal.h3_index
    }
    // Fallback: recalcular desde coordenadas si h3_index no está disponible
    if (!principal?.coordenadas) return null
    return coordsAH3(
      principal.coordenadas.latitude,
      principal.coordenadas.longitude
    )
  }, [profile?.ubicaciones])

  const { h3Home, selectedCells, loading } = useCoberturaCuidador(
    user?.uid ?? null,
    h3HomeDesdeAuth
  )

  const [saving, setSaving] = useState(false)

  // HTML generado una sola vez cuando los datos están listos.
  // selectedCells se pasa como estado inicial; el WebView gestiona cambios internamente.
  const htmlSource = useMemo(() => {
    if (!h3Home) return null
    return construirHTMLCobertura(
      h3Home,
      selectedCells,
      insets.bottom,
      insets.top
    )
    // eslint-disable-next-line
  }, [h3Home, insets.bottom, insets.top])

  const handleMessage = async (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string
        cells: string[]
      }
      if (msg.type !== 'save' || !user?.uid) return

      setSaving(true)
      const res = await GestorPerfilPublico.actualizarCeldasCobertura(
        user.uid,
        msg.cells
      )
      setSaving(false)

      if (res.success) {
        Alert.alert('Listo', 'Tu cobertura ha sido actualizada.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      } else {
        Alert.alert(
          'Error',
          'No se pudo guardar la cobertura. Intenta de nuevo.'
        )
        // Reactivar el botón en el WebView si el guardado falla
        webViewRef.current?.injectJavaScript(`
          var btn = document.getElementById('save-btn');
          if (btn) { btn.disabled = false; btn.textContent = 'Guardar cobertura'; }
          true;
        `)
      }
    } catch (e) {
      setSaving(false)
      console.warn('[CoberturaCuidador] handleMessage error', e)
    }
  }

  // ── Estados intermedios ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Cobertura" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      </View>
    )
  }

  if (!h3Home) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title="Cobertura" />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            Agrega una dirección en tu perfil para definir tus zonas de
            cobertura.
          </Text>
        </View>
      </View>
    )
  }

  // ── Vista principal ──────────────────────────────────────────────────────

  return (
    // View plano, sin TouchableWithoutFeedback ni KeyboardAvoidingView
    // (Screen los añade y bloquean los eventos táctiles del WebView)
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Zonas de cobertura"
        subtitle="Toca los hexágonos para activar o desactivar"
      />

      {/* @ts-expect-error - WebView type conflict with react-native globals */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlSource! }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        scrollEnabled={false}
        mixedContentMode={
          Platform.OS === 'android' ? ('always' as any) : undefined
        }
        onMessage={handleMessage}
        onError={(e: any) => {
          console.warn('[CoberturaCuidador] WebView error:', e.nativeEvent)
        }}
      />

      {/* Banner de guardado: pointerEvents none para no bloquear el WebView */}
      {saving && (
        <View style={styles.savingBanner} pointerEvents="none">
          <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  webview: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: COLOR.SUBTEXTO,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  savingBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingVertical: 6,
    backgroundColor: 'rgba(18,25,24,0.92)',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
})
