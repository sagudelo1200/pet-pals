import React, { useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { cellToLatLng } from 'h3-js'
import { COLOR } from '@/constants'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { CampoMotivo } from '@/components/admin/CampoMotivo'
import { estilosAdmin } from '@/components/admin/estilosAdmin'
import { VisorEnlaceMapa } from '@/components/ui/VisorEnlaceMapa'
import { urlEnlaceMapa } from '@/services/maps/carto'
import { useZonasNegocio } from '@/hooks/admin/useZonasNegocio'
import { guardarZona } from '@/services/firebase/zonas'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import { ESTADOS_ZONA, type EstadoZona } from '@/models/Zona'
import type { AuthStackParamList } from '@/navigation/types'
import { construirHTMLEditorZona, type CeldaAjena } from './editorZonaHtml'

// Bogotá, para centrar el mapa cuando la zona aún no tiene celdas
const CENTRO_POR_DEFECTO: [number, number] = [4.6486, -74.0628]

const COLOR_ESTADO: Record<EstadoZona, string> = {
  piloto: COLOR.ALERTA,
  activa: COLOR.EXITO,
  cerrada: COLOR.SUBTEXTO,
}

/**
 * Editor de una zona (admin): nombre, ciudad y estado, y el mapa donde se pintan
 * sus celdas. Guardar pasa por el servidor, que evita que dos zonas se adueñen
 * de la misma celda y deja el historial.
 */
const EditorZona: React.FC = () => {
  const navigation = useNavigation()
  const { params } = useRoute<RouteProp<AuthStackParamList, 'EditorZona'>>()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<WebView>(null)
  const { zonas, mapa, cargando } = useZonasNegocio()

  const zona = params?.zonaId ? zonas.find(z => z.id === params.zonaId) : undefined

  const [nombre, setNombre] = useState<string | null>(null)
  const [ciudad, setCiudad] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoZona | null>(null)
  const [motivo, setMotivo] = useState('')
  const [datosVisibles, setDatosVisibles] = useState(!params?.zonaId)
  const [guardando, setGuardando] = useState(false)
  const [enlaceMapa, setEnlaceMapa] = useState<string | null>(null)

  // Lo escrito manda; si no se ha tocado, lo que ya tiene la zona
  const nombreActual = nombre ?? zona?.nombre ?? ''
  const ciudadActual = ciudad ?? zona?.ciudad ?? ''
  const estadoActual = estado ?? zona?.estado ?? 'piloto'

  // El mapa se arma una sola vez, cuando las zonas ya cargaron
  const html = useMemo(() => {
    if (cargando) return null
    const ajenas: CeldaAjena[] = []
    const nombres = new Map(zonas.map(z => [z.id, z.nombre]))
    for (const [celda, entrada] of mapa) {
      const dueña = entrada.zona_id ?? entrada.excluida_de
      if (dueña && dueña !== zona?.id) {
        ajenas.push({ celda, nombre: nombres.get(dueña) ?? dueña })
      }
    }
    const primera = zona?.celdas[0]
    return construirHTMLEditorZona({
      centro: primera ? cellToLatLng(primera) : CENTRO_POR_DEFECTO,
      celdas: zona?.celdas ?? [],
      excluidas: zona?.excluidas ?? [],
      ajenas,
      topInset: 0,
      bottomInset: insets.bottom,
    })
    // eslint-disable-next-line
  }, [cargando, zona?.id, insets.bottom])

  const reactivarBoton = () =>
    webViewRef.current?.injectJavaScript(`
      var b = document.getElementById('guardar');
      if (b) { b.disabled = false; b.textContent = 'Guardar zona'; }
      true;
    `)

  const alRecibir = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      const enlace = urlEnlaceMapa(data)
      if (enlace) {
        setEnlaceMapa(enlace)
        return
      }
      if (data.type !== 'save') return

      if (!nombreActual.trim() || !ciudadActual.trim() || !motivo.trim()) {
        setDatosVisibles(true)
        Alert.alert(
          'Faltan datos',
          'Escribe el nombre, la ciudad y el motivo del cambio.'
        )
        reactivarBoton()
        return
      }

      setGuardando(true)
      try {
        await guardarZona({
          id: zona?.id,
          nombre: nombreActual,
          ciudad: ciudadActual,
          estado: estadoActual,
          celdas: data.celdas,
          excluidas: data.excluidas,
          motivo,
        })
        Alert.alert('Listo', 'La zona quedó guardada.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ])
      } catch (error) {
        Alert.alert('No se pudo guardar', mensajeErrorCallable(error))
        reactivarBoton()
      } finally {
        setGuardando(false)
      }
    } catch (e) {
      console.error('[EditorZona] mensaje inválido del mapa:', e)
      reactivarBoton()
    }
  }

  const titulo = zona ? zona.nombre : 'Nueva zona'

  if (params?.zonaId && !cargando && !zona) {
    return (
      <View style={[styles.contenedor, { paddingTop: insets.top }]}>
        <ScreenHeader title="Zona" />
        <View style={styles.centrado}>
          <Text style={styles.texto}>Esta zona ya no existe.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={titulo}
        subtitle="Toca los hexágonos para sumarlos a la zona"
      />

      <Pressable
        style={styles.cabeceraDatos}
        onPress={() => setDatosVisibles(v => !v)}
      >
        <Text style={styles.textoCabecera}>
          {datosVisibles ? '▾' : '▸'} Datos de la zona
        </Text>
        <Text style={[styles.estado, { color: COLOR_ESTADO[estadoActual] }]}>
          {estadoActual}
        </Text>
      </Pressable>

      {datosVisibles && (
        <View style={styles.datos}>
          <Text style={estilosAdmin.label}>Nombre</Text>
          <TextInput
            style={estilosAdmin.input}
            value={nombreActual}
            onChangeText={setNombre}
            placeholder="Ej: Chicó"
            placeholderTextColor={COLOR.SUBTEXTO}
            maxLength={60}
          />
          <Text style={estilosAdmin.label}>Ciudad</Text>
          <TextInput
            style={estilosAdmin.input}
            value={ciudadActual}
            onChangeText={setCiudad}
            placeholder="Ej: Bogotá"
            placeholderTextColor={COLOR.SUBTEXTO}
            maxLength={60}
          />
          <Text style={estilosAdmin.label}>Estado</Text>
          <View style={styles.estados}>
            {ESTADOS_ZONA.map(e => (
              <Pressable
                key={e}
                onPress={() => setEstado(e)}
                style={[
                  styles.chip,
                  estadoActual === e && { borderColor: COLOR_ESTADO[e] },
                ]}
              >
                <Text
                  style={[
                    styles.textoChip,
                    estadoActual === e && { color: COLOR_ESTADO[e] },
                  ]}
                >
                  {e}
                </Text>
              </Pressable>
            ))}
          </View>
          <CampoMotivo value={motivo} onChange={setMotivo} />
        </View>
      )}

      {html ? (
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          mixedContentMode={
            Platform.OS === 'android' ? ('always' as const) : undefined
          }
          onShouldStartLoadWithRequest={request =>
            request.url === 'about:blank' || request.url === ''
          }
          onMessage={alRecibir}
        />
      ) : (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      )}

      {guardando && (
        <View style={styles.guardando} pointerEvents="none">
          <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
        </View>
      )}

      <VisorEnlaceMapa url={enlaceMapa} onCerrar={() => setEnlaceMapa(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  webview: { flex: 1, backgroundColor: COLOR.BASE },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  texto: { color: COLOR.SUBTEXTO, fontSize: 14 },
  cabeceraDatos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  textoCabecera: { color: COLOR.TEXTO, fontSize: 14, fontWeight: '600' },
  estado: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  datos: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  estados: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  textoChip: { color: COLOR.SUBTEXTO, fontSize: 13, fontWeight: '600' },
  guardando: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(18,25,24,0.92)',
  },
})

export default EditorZona
