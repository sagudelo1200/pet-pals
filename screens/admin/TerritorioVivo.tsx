import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useZonasH3 } from '@/hooks/admin/useZonasH3'
import { useDetallesZonaH3 } from '@/hooks/admin/useDetallesZonaH3'
import { PanelDetallesZona } from '@/components/admin/PanelDetallesZona'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { construirHTML } from './territorioVivoHtml'

interface ZonaSeleccionada {
  h3_id: string
  h3_r8: string
  h3_r9: string
  estado: string
  cuidadores: number
  demanda: number
  activos: number
}

// ─── Componente ──────────────────────────────────────────────────────────────
const TerritorioVivo: React.FC = () => {
  const { zonas, cargando, error } = useZonasH3()
  const insets = useSafeAreaInsets()
  const [zonaSeleccionada, setZonaSeleccionada] =
    useState<ZonaSeleccionada | null>(null)

  // Cargar detalles de la zona seleccionada
  const {
    cuidadores,
    solicitudes,
    cargando: cargandoDetalles,
    error: errorDetalles,
  } = useDetallesZonaH3(zonaSeleccionada?.h3_r8 ?? null)

  // Calcular altura del tab bar para dejar espacio
  const tabBarHeight =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  const htmlSource = useMemo(
    () => construirHTML(zonas, insets.top, tabBarHeight),
    [zonas, insets.top, tabBarHeight]
  )

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.tipo === 'ZONA_SELECCIONADA') {
        setZonaSeleccionada(data)
      }
    } catch (err) {
      console.error('[TerritorioVivo] Error parsing WebView message:', err)
    }
  }

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

      {/* Mapa WebView */}
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: htmlSource }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled
          mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
          scrollEnabled={false}
          onShouldStartLoadWithRequest={request => {
            return request.url === 'about:blank' || request.url === ''
          }}
          onMessage={handleWebViewMessage}
          onError={e =>
            console.warn('[TerritorioVivo] WebView error:', e.nativeEvent)
          }
        />
      </View>

      {/* Panel lateral con detalles */}
      {zonaSeleccionada && (
        <View style={[styles.panelLateral, { paddingTop: insets.top }]}>
          {/* Botón cerrar */}
          <TouchableOpacity
            style={styles.botónCerrar}
            onPress={() => setZonaSeleccionada(null)}
            activeOpacity={0.7}
          >
            <Icon name="times" size={20} color={COLOR.TEXTO} />
          </TouchableOpacity>

          <PanelDetallesZona
            h3_id={zonaSeleccionada.h3_id}
            estado={zonaSeleccionada.estado}
            cuidadores={zonaSeleccionada.cuidadores}
            demanda={zonaSeleccionada.demanda}
            activos={zonaSeleccionada.activos}
            cuidadoresLista={cuidadores}
            solicitudesLista={solicitudes}
            cargando={cargandoDetalles}
            error={errorDetalles}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLOR.BASE,
    flexDirection: 'row',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  webview: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  panelLateral: {
    width: 320,
    backgroundColor: COLOR.BASE,
    borderLeftWidth: 1,
    borderLeftColor: '#1F2D2A',
    position: 'relative',
  },
  botónCerrar: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    backgroundColor: 'rgba(18,25,24,0.9)',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 6,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
