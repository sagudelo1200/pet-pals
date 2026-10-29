/**
 * Reglas de Firestore: coherencia con el código.
 *
 * Son pruebas de contrato sobre el TEXTO de firestore.rules (no ejecutan las
 * reglas): comprueban que lo que el código espera y lo que las reglas cubren no
 * se desalineen. Las reglas se ejecutan de verdad con el emulador de Firebase
 * (rules-unit-testing), fuera de la suite de jest.
 */

describe('reglas de Firestore: coherencia con el código', () => {
  // Protege contra el desalineamiento entre los nombres de colección que
  // escribe el cliente y los que cubren las reglas (deny por defecto).
  // Jest se ejecuta desde la raíz del proyecto
  const fs = require('fs')
  const leer = (rel: string): string => fs.readFileSync(rel, 'utf8')

  it('cada colección del motor económico tiene reglas y es de solo lectura para clientes', () => {
    const tipos = leer('functions/src/economia/tipos.ts')
    const reglas = leer('firestore.rules')
    const bloque = tipos.slice(
      tipos.indexOf('export const COLECCION'),
      tipos.indexOf('} as const')
    )
    const colecciones = (bloque.match(/: '[^']+'/g) || []).map(
      (linea: string) => linea.split('\'')[1]
    )

    expect(colecciones).toEqual(
      expect.arrayContaining([
        'operaciones_economicas',
        'movimientos_financieros',
        'obligaciones',
        'deduplicacion_movimientos',
        'liquidaciones',
        'documentos_contables',
      ])
    )
    const extra = ['eventos_economicos', 'versionados', 'configuracion']
    for (const col of [...colecciones, ...extra]) {
      const inicio = reglas.search(new RegExp(`match /${col}/[{]`))
      expect(inicio).toBeGreaterThan(-1)
      // La primera regla de escritura del bloque niega al cliente
      const resto = reglas.slice(inicio)
      expect(resto.slice(0, resto.indexOf('allow write') + 30)).toMatch(
        /allow (read, )?write: if false;/
      )
    }
  })

  it('las áreas de configuración legibles coinciden con el catálogo', () => {
    const {
      AREAS_CONFIGURACION,
      CATALOGO_CONFIGURACION,
    } = require('@/functions/src/compartido/configuracion')
    const reglas = leer('firestore.rules')
    const lista = reglas.match(/area in \[([^\]]+)\]/)
    expect(lista).not.toBeNull()
    const enReglas = lista[1]
      .split(',')
      .map((a: string) => a.trim().replace(/'/g, ''))
    const publicas = AREAS_CONFIGURACION.filter(
      (a: string) => CATALOGO_CONFIGURACION[a].lectura === 'publica'
    )
    expect([...enReglas].sort()).toEqual([...publicas].sort())
  })

  it('las mascotas de un paseo nuevo se pueden crear en el mismo batch que el paseo', () => {
    const reglas = leer('firestore.rules')
    const inicio = reglas.indexOf(
      'match /operaciones/{operacionId}/mascotas/{mascotaId}'
    )
    expect(inicio).toBeGreaterThan(-1)
    const bloque = reglas.slice(inicio, reglas.indexOf('allow update', inicio))
    // Dentro del batch el paseo aún no existe: get() no lo ve, se valida con getAfter
    expect(bloque).toContain('mascota_de_paseo_nuevo(operacionId, mascotaId)')

    const funcion = reglas.slice(
      reglas.indexOf('function mascota_de_paseo_nuevo')
    )
    const cuerpo = funcion.slice(0, funcion.indexOf('// Helper para obtener'))
    expect(cuerpo).toContain('!exists(paseoRuta) && existsAfter(paseoRuta)')
    // Solo el creador del paseo, con su propia mascota y que figure en mascota_ids
    expect(cuerpo).toContain(
      'getAfter(paseoRuta).data.creado_por == request.auth.uid'
    )
    expect(cuerpo).toContain(
      'mascotaId in getAfter(paseoRuta).data.get(\'mascota_ids\', [])'
    )
    expect(cuerpo).toContain(
      'mascotas/$(mascotaId)).data.creado_por == request.auth.uid'
    )
  })

  it('los campos del cierre de entrega solo los escribe el servidor', () => {
    const reglas = leer('firestore.rules')
    const funcion = reglas.slice(
      reglas.indexOf('function campos_entrega_del_servidor')
    )
    const campos = ['requiere_revision', 'cierre_por_equipo', 'en_disputa']
    for (const campo of campos) {
      expect(funcion.slice(0, funcion.indexOf('}'))).toContain(`'${campo}'`)
    }
    const inicio = reglas.indexOf('match /operaciones/{id}')
    const bloque = reglas.slice(inicio, reglas.indexOf('allow delete', inicio))
    // Al crear no pueden venir fijados y al actualizar no pueden cambiar (salvo admin)
    expect(bloque).toContain(
      '!request.resource.data.keys().hasAny(campos_entrega_del_servidor())'
    )
    expect(bloque).toContain(
      '(no_cambia(campos_entrega_del_servidor()) || es_admin())'
    )
  })

  it('el expediente de la mascota solo lo escribe el servidor', () => {
    const reglas = leer('firestore.rules')
    const inicio = reglas.indexOf('match /expedientes/{mascotaId}')
    expect(inicio).toBeGreaterThan(-1)
    const bloque = reglas.slice(inicio, reglas.indexOf('// UBICACIONES', inicio))
    // Lectura: tutores, cuidadores autorizados y admin
    expect(bloque).toContain('request.auth.uid in resource.data.tutores')
    expect(bloque).toContain(
      'request.auth.uid in resource.data.cuidadores_autorizados'
    )
    // Nadie escribe desde la app, y el estado interno solo lo lee el admin
    expect(bloque.match(/allow write: if false;/g)).toHaveLength(2)
    expect(bloque).toMatch(/match \/interno\/\{documento\} \{\s+allow read: if es_admin\(\);/)
  })

  it('los valores de configuración usados en las reglas tienen el por defecto del catálogo', () => {
    const {
      CATALOGO_CONFIGURACION,
    } = require('@/functions/src/compartido/configuracion')
    const reglas = leer('firestore.rules')
    const patron = /config\('(\w+)', '(\w+)', ([^)]+)\)/
    const usos = (reglas.match(new RegExp(patron, 'g')) || []).map(
      (uso: string) => uso.match(patron) as RegExpMatchArray
    )
    expect(usos.length).toBeGreaterThan(0)
    for (const [, area, clave, porDefecto] of usos) {
      const def = CATALOGO_CONFIGURACION[area]?.valores[clave]
      expect(def).toBeDefined()
      expect(JSON.parse(porDefecto)).toEqual(def.porDefecto)
    }
  })

  it('solo los consentimientos del versionado son de lectura pública', () => {
    const {
      TIPOS_VERSIONABLES,
      definicionVersionable,
    } = require('@/functions/src/compartido/versionables')
    const {
      PREFIJO_CONSENTIMIENTO,
    } = require('@/functions/src/compartido/consentimiento')
    const reglas = leer('firestore.rules')
    expect(reglas).toContain(`tipo.matches('${PREFIJO_CONSENTIMIENTO}.*')`)
    for (const tipo of TIPOS_VERSIONABLES) {
      const publica = definicionVersionable(tipo).lectura === 'publica'
      expect(publica).toBe(tipo.startsWith(PREFIJO_CONSENTIMIENTO))
    }
  })

  it('las reglas nunca dan acceso por request.auth == null', () => {
    const reglas = leer('firestore.rules')
      .split('\n')
      .filter((l: string) => !l.trim().startsWith('//'))
      .join('\n')
    expect(reglas).not.toMatch(/request\.auth\s*==\s*null/)
  })
})
