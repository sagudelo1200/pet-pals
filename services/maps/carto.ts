import Constants from 'expo-constants'

const BASE = 'https://basemaps.cartocdn.com/rastertiles'

const apiKey: string | undefined = Constants.expoConfig?.extra?.carto?.apiKey

if (!apiKey) {
  console.warn('[carto] CARTO_API_KEY no configurada: los mapas no cargarán')
}

const urlTiles = (estilo: string) =>
  `${BASE}/${estilo}/{z}/{x}/{y}.png${apiKey ? `?key=${apiKey}` : ''}`

/** URLs de tiles raster de CARTO listas para L.tileLayer (modo oscuro / claro) */
export const CARTO_TILES = {
  oscuro: urlTiles('dark_all'),
  claro: urlTiles('voyager'),
}

/** Hosts a los que se permite navegar desde la atribución del mapa */
export const HOSTS_ATRIBUCION = [
  'openstreetmap.org',
  'www.openstreetmap.org',
  'carto.com',
  'www.carto.com',
]

/** Atribución exigida por CARTO/OSM, con enlaces a sus páginas de créditos */
export const CARTO_ATRIBUCION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attribution/">CARTO</a>'

/** Tipo del mensaje que el WebView envía a la app al tocar un enlace de atribución */
export const MENSAJE_ENLACE_MAPA = 'ABRIR_ENLACE_MAPA'

/** CSS de la atribución: legible y con área táctil cómoda */
export const CSS_ATRIBUCION = `
    .leaflet-container .leaflet-control-attribution {
      font-size: 9px;
      line-height: 1.3;
      padding: 0 3px;
      margin: 0 !important;
      border-radius: 4px;
      background: rgba(18, 25, 24, 0.6) !important;
      color: rgba(235, 244, 242, 0.6);
    }
    .leaflet-container .leaflet-control-attribution a {
      padding: 2px 1px;
      display: inline-block;
      color: rgba(235, 244, 242, 0.75);
    }`

/**
 * JS para el WebView (ejecutar tras crear `map`): oculta el prefijo "Leaflet"
 * y envía los toques sobre enlaces de atribución a la app, para abrirlos en un
 * visor interno en lugar de navegar fuera del mapa.
 */
export const JS_ATRIBUCION = `
    map.attributionControl.setPrefix(false);
    map.attributionControl.getContainer().addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ tipo: '${MENSAJE_ENLACE_MAPA}', type: '${MENSAJE_ENLACE_MAPA}', url: a.href })
      );
    });`

/** Devuelve la URL si el mensaje del WebView es un enlace de atribución permitido */
export function urlEnlaceMapa(data: unknown): string | null {
  const msg = data as { tipo?: string; url?: string } | null
  if (msg?.tipo !== MENSAJE_ENLACE_MAPA || !msg.url) return null
  try {
    const u = new URL(msg.url)
    if (u.protocol !== 'https:' || !HOSTS_ATRIBUCION.includes(u.hostname)) {
      return null
    }
    return u.toString()
  } catch {
    return null
  }
}

/** Reemplaza los placeholders de tiles/atribución en una plantilla HTML */
export function inyectarCarto(html: string): string {
  return html
    .split('{{CARTO_TILE_OSCURO}}')
    .join(CARTO_TILES.oscuro)
    .split('{{CARTO_TILE_CLARO}}')
    .join(CARTO_TILES.claro)
    .split('{{CARTO_ATRIBUCION}}')
    .join(CARTO_ATRIBUCION)
    .split('{{CARTO_CSS_ATRIBUCION}}')
    .join(CSS_ATRIBUCION)
    .split('{{CARTO_JS_ATRIBUCION}}')
    .join(JS_ATRIBUCION)
}
