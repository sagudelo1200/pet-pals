/* eslint-env jest */
/**
 * La lógica del mapa donde el admin pinta una zona corre dentro de un WebView.
 * Aquí se ejecuta ese mismo script con un navegador de mentira (Leaflet y el
 * DOM simulados, h3-js de verdad) para comprobar qué pasa al tocar hexágonos.
 */
import * as h3 from 'h3-js'
import { construirHTMLEditorZona } from '../editorZonaHtml'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vm = require('vm')

const R7 = h3.latLngToCell(4.6486, -74.0628, 7)
const R8 = h3.latLngToCell(4.6486, -74.0628, 8)
const OTRO_R8 = h3.cellToChildren(R7, 8).find(c => c !== R8) as string
const OTRO_R7 = h3.gridDisk(R7, 1).find(c => c !== R7) as string

interface Poligono {
  celda: string
  estilo: any
  alTocar?: () => void
}

function abrirMapa(
  opciones: { celdas?: string[]; excluidas?: string[]; ajenas?: any[] } = {},
  zoom = 13
) {
  const html = construirHTMLEditorZona({
    centro: h3.cellToLatLng(R7) as [number, number],
    celdas: opciones.celdas ?? [],
    excluidas: opciones.excluidas ?? [],
    ajenas: opciones.ajenas ?? [],
  })
  const bloques = html.split('<script>').slice(1)
  const script = bloques[bloques.length - 1].split('</script>')[0]

  const poligonos: Poligono[] = []
  const elementos: Record<string, any> = {}
  const elemento = (id: string) =>
    (elementos[id] ??= {
      textContent: '',
      style: {},
      disabled: false,
      addEventListener: (_e: string, f: () => void) => (elemento(id).alClick = f),
      classList: { toggle: () => {} },
    })
  const botones: Record<string, any[]> = { '#escala button': [], '#accion button': [] }
  for (const [grupo, atributo, valores] of [
    ['#escala button', 'data-escala', ['7', '8']],
    ['#accion button', 'data-accion', ['agregar', 'excluir']],
  ] as const) {
    for (const valor of valores) {
      const b: any = {
        getAttribute: (a: string) => (a === atributo ? valor : null),
        addEventListener: (_e: string, f: () => void) => (b.alClick = f),
        classList: { toggle: () => {} },
      }
      botones[grupo].push(b)
    }
  }

  const mensajes: any[] = []
  let zoomActual = zoom
  const capa = { addTo: () => capa, clearLayers: () => (poligonos.length = 0), addLayer: () => {} }
  const mapa: any = {
    getZoom: () => zoomActual,
    setZoom: (z: number) => {
      zoomActual = z
      mapa.alMover?.()
    },
    getBounds: () => ({
      getSouth: () => 4.63,
      getNorth: () => 4.67,
      getWest: () => -74.08,
      getEast: () => -74.04,
    }),
    on: (_e: string, f: () => void) => (mapa.alMover = f),
    addLayer: () => {},
    removeLayer: () => {},
    attributionControl: {
      setPrefix: () => {},
      getContainer: () => ({ addEventListener: () => {} }),
    },
  }
  const L = {
    map: () => mapa,
    control: { zoom: () => ({ addTo: () => {} }) },
    tileLayer: () => ({ addTo: () => {} }),
    layerGroup: () => capa,
    polygon: (limites: number[][], estilo: any) => {
      // Se identifica el hexágono por su centro aproximado
      const lat = limites.reduce((a, p) => a + p[0], 0) / limites.length
      const lng = limites.reduce((a, p) => a + p[1], 0) / limites.length
      // eslint-disable-next-line no-unused-vars
      const poli: Poligono & { setStyle: (nuevo: any) => void; on: any } = {
        celda: '',
        estilo,
        setStyle: nuevo => (poli.estilo = nuevo),
        on: (_e: string, f: () => void) => (poli.alTocar = f),
      }
      ;(poli as any).centro = [lat, lng]
      poligonos.push(poli)
      return poli
    },
    DomUtil: { create: () => ({ style: {}, addEventListener: () => {} }) },
    DomEvent: { on: () => {}, disableClickPropagation: () => {} },
    Control: { extend: () => class {} },
  }
  const contexto: any = {
    h3,
    L,
    document: {
      getElementById: elemento,
      querySelectorAll: (sel: string) => botones[sel] ?? [],
      createElement: () => ({ style: {} }),
    },
    window: { ReactNativeWebView: { postMessage: (m: string) => mensajes.push(JSON.parse(m)) } },
    console,
    setTimeout,
    clearTimeout,
  }
  vm.runInNewContext(script, contexto)

  /** Poligono dibujado de una celda (por la celda que contiene su centro). */
  const poligonoDe = (celda: string) =>
    poligonos.find(p => {
      const [lat, lng] = (p as any).centro
      return h3.latLngToCell(lat, lng, h3.getResolution(celda)) === celda
    })!

  return {
    contexto,
    mensajes,
    poligonoDe,
    tocar: (celda: string) => poligonoDe(celda).alTocar!(),
    elegirAccion: (accion: 'agregar' | 'excluir') =>
      botones['#accion button'].find(b => b.getAttribute('data-accion') === accion).alClick(),
    elegirEscala: (escala: '7' | '8') =>
      botones['#escala button'].find(b => b.getAttribute('data-escala') === escala).alClick(),
    guardar: () => elemento('guardar').alClick(),
    aviso: () => elemento('aviso').textContent as string,
    conteo: () => elemento('conteo').textContent as string,
    celdas: () => [...contexto.celdas].sort(),
    excluidas: () => [...contexto.excluidas].sort(),
  }
}

describe('mapa del editor de zonas', () => {
  it('arranca con las celdas de la zona y las cuenta', () => {
    const m = abrirMapa({ celdas: [R7] })
    expect(m.celdas()).toEqual([R7])
    expect(m.conteo()).toBe('1 celda')
  })

  it('tocar un barrio lo suma a la zona; volver a tocarlo lo quita', () => {
    const m = abrirMapa()
    m.tocar(R7)
    expect(m.celdas()).toEqual([R7])
    expect(m.conteo()).toBe('1 celda')
    m.tocar(R7)
    expect(m.celdas()).toEqual([])
    expect(m.conteo()).toBe('0 celdas')
  })

  it('una celda que ya es de otra zona no se puede tomar', () => {
    const m = abrirMapa({ ajenas: [{ celda: R7, nombre: 'Rival' }] })
    m.tocar(R7)
    expect(m.celdas()).toEqual([])
    expect(m.aviso()).toContain('Rival')
  })

  it('una celda fina dentro del barrio de otra zona SÍ se puede tomar (gana la específica)', () => {
    const m = abrirMapa({ ajenas: [{ celda: R7, nombre: 'Rival' }] })
    m.elegirEscala('8')
    m.tocar(R8)
    expect(m.celdas()).toEqual([R8])
  })

  it('excluir abre un hueco dentro de lo que la zona ya cubre y saca la celda de la zona', () => {
    const m = abrirMapa({ celdas: [R7] })
    m.elegirEscala('8')
    m.elegirAccion('excluir')
    m.tocar(OTRO_R8)
    expect(m.excluidas()).toEqual([OTRO_R8])
    expect(m.celdas()).toEqual([R7])
    expect(m.conteo()).toBe('1 celda · 1 excluida')
    m.tocar(OTRO_R8)
    expect(m.excluidas()).toEqual([])
  })

  it('no se puede excluir fuera de lo que la zona cubre', () => {
    const m = abrirMapa()
    m.elegirEscala('8')
    m.elegirAccion('excluir')
    m.tocar(R8)
    expect(m.excluidas()).toEqual([])
    expect(m.aviso()).toContain('ya cubre')
  })

  it('agregar una celda que estaba excluida la saca del hueco', () => {
    const m = abrirMapa({ celdas: [R7], excluidas: [OTRO_R8] })
    m.elegirEscala('8')
    m.tocar(OTRO_R8)
    expect(m.excluidas()).toEqual([])
    expect(m.celdas()).toEqual([OTRO_R8, R7].sort())
  })

  it('el estilo distingue celda propia, heredada, hueco y ajena', () => {
    const m = abrirMapa({
      celdas: [R7],
      excluidas: [OTRO_R8],
      ajenas: [{ celda: OTRO_R7, nombre: 'Rival' }],
    })
    m.elegirEscala('8')
    const propia = m.poligonoDe(R8).estilo
    const hueco = m.poligonoDe(OTRO_R8).estilo
    expect(propia.fillColor).toBe('#1D8F73') // heredada del barrio
    expect(propia.fillOpacity).toBeLessThan(0.3)
    expect(hueco.fillColor).toBe('#C96B67')
  })

  it('guardar manda las celdas y los huecos a la app y bloquea el botón', () => {
    const m = abrirMapa({ celdas: [R7], excluidas: [OTRO_R8] })
    m.guardar()
    expect(m.mensajes).toEqual([{ type: 'save', celdas: [R7], excluidas: [OTRO_R8] }])
  })

  it('con el mapa muy alejado no dibuja miles de hexágonos', () => {
    const m = abrirMapa({}, 9)
    expect(m.contexto.poligonos && Object.keys(m.contexto.poligonos)).toEqual([])
    expect(m.aviso()).toContain('Acerca el mapa')
  })
})
