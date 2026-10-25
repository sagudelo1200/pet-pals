/* eslint-env jest */
import { construirHTMLEditorZona } from '../editorZonaHtml'

const opciones = {
  centro: [4.6486, -74.0628] as [number, number],
  celdas: ['8728301a5ffffff'],
  excluidas: [] as string[],
  ajenas: [{ celda: '8728301a4ffffff', nombre: 'Otra zona' }],
}

/** Contenido del último <script> en línea (el lógica del mapa). */
const scriptEnLinea = (html: string) => {
  const bloques = html.split('<script>').slice(1)
  const ultimo = bloques.filter(b => !b.startsWith(' src='))
  return ultimo[ultimo.length - 1].split('</script>')[0]
}

describe('construirHTMLEditorZona', () => {
  it('lleva los datos de la zona y de las celdas ajenas', () => {
    const html = construirHTMLEditorZona(opciones)
    expect(html).toContain('8728301a5ffffff')
    expect(html).toContain('Otra zona')
    expect(html).toContain('Guardar zona')
    expect(html).toContain('Barrios')
    expect(html).toContain('Ajuste fino')
  })

  it('el script del mapa es JavaScript válido', () => {
    const script = scriptEnLinea(construirHTMLEditorZona(opciones))
    // Solo se compila: así se detectan errores de sintaxis sin necesitar un navegador
    expect(() => new Function(script)).not.toThrow()
  })

  it('un nombre malicioso no puede cerrar el script ni inyectar HTML', () => {
    const html = construirHTMLEditorZona({
      ...opciones,
      ajenas: [{ celda: 'x', nombre: '</script><img src=x onerror=alert(1)>' }],
    })
    expect(html).not.toContain('</script><img')
    expect(html).toContain('\u003c/script>')
    const script = scriptEnLinea(html)
    expect(() => new Function(script)).not.toThrow()
  })

  it('respeta los márgenes seguros del teléfono', () => {
    const html = construirHTMLEditorZona({ ...opciones, topInset: 40, bottomInset: 34 })
    expect(html).toContain('padding: 10px 14px 46px')
    expect(html).toContain('margin-top: 40px')
  })
})
