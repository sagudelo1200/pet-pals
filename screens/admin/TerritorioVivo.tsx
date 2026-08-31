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
import { useZonasH3Filtrado } from '@/hooks/admin/useZonasH3Filtrado'
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
  const {
    zonas,
    ciudades,
    ciudadSeleccionada,
    setCiudadSeleccionada,
    cargando,
    error,
    totalZonas,
  } = useZonasH3Filtrado()
  const insets = useSafeAreaInsets()
  const [zonaSeleccionada, setZonaSeleccionada] =
    useState<ZonaSeleccionada | null>(null)
  const [conteoZonas, setConteoZonas] = useState<number>(0)
  const [resolucionActual, setResolucionActual] = useState<'r8' | 'r9'>('r8')
  const [mostrarSelectorCiudad, setMostrarSelectorCiudad] = useState(false)

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
    () =>
      construirHTML(zonas, insets.top, tabBarHeight, {
        ciudad: ciudadSeleccionada,
        totalZonas,
      }),
    [zonas, insets.top, tabBarHeight, ciudadSeleccionada, totalZonas]
  )

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.tipo === 'ZONA_SELECCIONADA') {
        setZonaSeleccionada(data)
      } else if (data.tipo === 'CONTEO_ACTUALIZADO') {
        setConteoZonas(data.zonasRenderizadas)
        setResolucionActual(data.resolucion === 'r8' ? 'r8' : 'r9')
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
      {/* Selector de ciudad (si hay múltiples) */}
      {ciudades.length > 1 ? (
        <View style={[styles.selectorCiudad, { top: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => setMostrarSelectorCiudad(!mostrarSelectorCiudad)}
            style={styles.botonCiudad}
            activeOpacity={0.7}
          >
            <Text style={styles.textoCiudad}>
              📍 {ciudadSeleccionada.toUpperCase()}
            </Text>
            <Icon
              name={mostrarSelectorCiudad ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLOR.PRIMARIO}
            />
          </TouchableOpacity>

          {mostrarSelectorCiudad && (
            <View style={styles.dropdownCiudades}>
              {ciudades.map(ciudad => (
                <TouchableOpacity
                  key={ciudad}
                  onPress={() => {
                    setCiudadSeleccionada(ciudad)
                    setMostrarSelectorCiudad(false)
                  }}
                  style={[
                    styles.opcionCiudad,
                    ciudadSeleccionada === ciudad && styles.opcionCiudadActiva,
                  ]}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.textoOpcion,
                      ciudadSeleccionada === ciudad && styles.textoOpcionActivo,
                    ]}
                  >
                    {ciudad.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        /* Badge de conteo simple (si hay solo 1 ciudad) */
        <View style={[styles.badge, { top: insets.top + 12 }]}>
          <Text style={styles.badgeTexto}>
            {conteoZonas > 0
              ? `${conteoZonas} zonas R${resolucionActual.toUpperCase()}`
              : `${zonas.length} zonas`}
          </Text>
        </View>
      )}

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
  selectorCiudad: {
    position: 'absolute',
    right: 12,
    zIndex: 15,
    backgroundColor: 'rgba(18,25,24,0.95)',
    borderWidth: 1,
    borderColor: COLOR.PRIMARIO,
    borderRadius: 8,
    minWidth: 140,
    overflow: 'hidden',
  },
  botonCiudad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  textoCiudad: {
    color: COLOR.TEXTO,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownCiudades: {
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: 'rgba(10,15,14,0.98)',
  },
  opcionCiudad: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  opcionCiudadActiva: {
    backgroundColor: 'rgba(29,143,115,0.2)',
  },
  textoOpcion: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    fontWeight: '500',
  },
  textoOpcionActivo: {
    color: COLOR.PRIMARIO,
    fontWeight: '700',
  },
})

export default TerritorioVivo
