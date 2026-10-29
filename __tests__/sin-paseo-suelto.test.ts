/* eslint-env jest */
/**
 * Guardia de arquitectura: el texto 'paseo' no debe aparecer suelto en el
 * código de producción. Cada lugar que asume "esto es un paseo" usa TIPO_PASEO
 * o esPaseo (functions/src/compartido/servicios.ts), así se pueden encontrar
 * todos cuando llegue otro servicio y decidir uno por uno si se generaliza.
 *
 * Si este test falla porque agregaste un 'paseo' suelto: usa TIPO_PASEO o
 * esPaseo. Si el texto es de verdad otra cosa (una etiqueta, un tipo de fuente),
 * agrégalo a PERMITIDOS con la razón.
 */
// Jest se ejecuta desde la raíz del proyecto
const { readdirSync, readFileSync } = require('fs')

const CARPETAS = [
  'components',
  'constants',
  'context',
  'hooks',
  'logic',
  'models',
  'navigation',
  'screens',
  'services',
  'utils',
  'functions/src',
]

/** Archivos donde 'paseo' es legítimo, con la razón. */
const PERMITIDOS: Record<string, string> = {
  'functions/src/compartido/servicios.ts':
    'definición del catálogo y de TIPO_PASEO',
  'functions/src/compartido/territorio.ts':
    'fuente de una observación (paseo, explorador o inferencia), no el tipo de operación',
  'functions/src/territorio/funciones.ts':
    'etiqueta del registro de fallos, no el tipo de operación',
  'models/Paseo.ts':
    'discriminador del modelo: Extract<TipoServicio, paseo> falla al compilar si el catálogo lo pierde',
}

function archivos(dir: string, acumulado: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = `${dir}/${entrada.name}`
    if (entrada.isDirectory()) {
      if (['node_modules', '__tests__', '__mocks__', 'lib'].includes(entrada.name)) continue
      archivos(ruta, acumulado)
    } else if (/\.(ts|tsx)$/.test(entrada.name) && !/\.(test|d)\.tsx?$/.test(entrada.name)) {
      acumulado.push(ruta)
    }
  }
  return acumulado
}

const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('el texto "paseo" no aparece suelto en el código de producción', () => {
  const sueltos = CARPETAS.flatMap(c => archivos(c))
    .map(ruta => ({
      archivo: ruta,
      texto: sinComentarios(readFileSync(ruta, 'utf8') as string),
    }))
    .filter(({ texto }) => /['"]paseo['"]/.test(texto))
    .map(({ archivo }) => archivo)

  test('solo en los archivos permitidos', () => {
    const noPermitidos = sueltos.filter(a => !(a in PERMITIDOS))
    expect(noPermitidos).toEqual([])
  })

  test('la lista de permitidos no guarda archivos que ya no lo necesitan', () => {
    const sobran = Object.keys(PERMITIDOS).filter(a => !sueltos.includes(a))
    expect(sobran).toEqual([])
  })
})
