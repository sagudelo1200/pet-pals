/**
 * FASE 5: Seguridad & Índices Firestore
 *
 * Este test intenta ejecutar queries complejas que requieren índices compuestos.
 * Cuando falle por falta de índice, Firebase mostrará en consola el comando exacto
 * para crear el índice compuesto necesario.
 *
 * ⚠️  NOTA: Este test está SKIP en ambiente de test automatizado.
 * Ejecutar solo en desarrollo local contra Firebase Emulator o instancia real.
 * Ver FASE5-SEGURIDAD-INDICES.md para detalles.
 *
 * Propósito:
 * - Validar que las reglas de Firestore están bien estructuradas
 * - Generar automáticamente solicitudes de índices compuestos
 * - Documentar qué queries son críticas para el modelo económico
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Query,
} from 'firebase/firestore'
import { db } from '../firebase.config'
import type { OperacionEconomica } from '../models/operacionesEconomicas/OperacionEconomica'
import type { MovimientoFinanciero } from '../models/operacionesEconomicas/MovimientoFinanciero'
import type { Obligacion } from '../models/operacionesEconomicas/Obligacion'
import type { EventoOperacionEconomica } from '../models/operacionesEconomicas/EventoOperacionEconomica'

/**
 * NOTA: Las colecciones en Firestore usan snake_case:
 * - operaciones_economicas
 * - eventos_economicos (subcolección)
 * - movimientos_financieros
 * - obligaciones
 */

/**
 * TEST 1: Listar operaciones por (tutor_id, estado)
 *
 * Índice requerido:
 *   Collection: operaciones_economicas
 *   Fields: (tutor_id ASC, estado ASC)
 *
 * Caso de uso: Mostrar a María todas sus operaciones filtradas por estado
 * - ENCARGADA: nuevos encargos
 * - EJECUTADA: servicios completados
 * - RECAUDADA: fondos recibidos
 * - CERRADA: operaciones finalizadas
 */
describe.skip('ÍNDICE 1: operaciones_economicas (tutor_id, estado)', () => {
  it('debería listar operaciones de un tutor por estado', async () => {
    const tutor_id = 'maria-uid-test'
    const estado = 'ENCARGADA'

    try {
      const q = query(
        collection(db, 'operaciones_economicas') as any,
        where('tutor_id', '==', tutor_id),
        where('estado', '==', estado),
        orderBy('creado_en', 'desc')
      ) as Query<OperacionEconomica>

      const snapshot = await getDocs(q)

      console.log(
        `✅ Índice 1 funciona: ${snapshot.size} operaciones encontradas`
      )
      expect(snapshot).toBeDefined()
    } catch (error: any) {
      console.error('❌ ÍNDICE 1 FALTANTE - Firebase sugiere:', error.message)
      // Firebase mostrará: "You can create a composite index by going to..."
      throw error
    }
  })
})

/**
 * TEST 2: Listar movimientos financieros por (operacion_id, tipo)
 *
 * Índice requerido:
 *   Collection: movimientos_financieros
 *   Fields: (operacion_id ASC, tipo ASC, creado_en DESC)
 *
 * Caso de uso: Auditar movimientos de una operación
 * - Ver todos los RECAUDOs (ingresos)
 * - Ver todos los PAGOs (egresos)
 * - Ver REEMBOLSOs en caso de cancelación
 */
describe.skip('ÍNDICE 2: movimientos_financieros (operacion_id, tipo)', () => {
  it('debería listar movimientos por operación y tipo', async () => {
    const operacion_id = 'op-bruno-001-test'
    const tipo = 'RECAUDO'

    try {
      const q = query(
        collection(db, 'movimientos_financieros') as any,
        where('operacion_id', '==', operacion_id),
        where('tipo', '==', tipo),
        orderBy('creado_en', 'desc')
      ) as Query<MovimientoFinanciero>

      const snapshot = await getDocs(q)

      console.log(
        `✅ Índice 2 funciona: ${snapshot.size} movimientos encontrados`
      )
      expect(snapshot).toBeDefined()
    } catch (error: any) {
      console.error('❌ ÍNDICE 2 FALTANTE - Firebase sugiere:', error.message)
      throw error
    }
  })
})

/**
 * TEST 3: Verificar obligaciones pendientes de una operación (CRÍTICO para Invariante I5)
 *
 * Índice requerido:
 *   Collection: obligaciones
 *   Fields: (operacion_id ASC, estado ASC)
 *
 * Caso de uso: Antes de cerrar una operación, verificar si hay obligaciones PENDIENTE
 * - Si estado == 'PENDIENTE', NO se puede cerrar la operación
 * - Este es el **invariante más crítico** del modelo económico
 *
 * Flujo:
 *   1. Tutor solicita cerrar operación
 *   2. Sistema ejecuta esta query
 *   3. Si result.length > 0: rechaza cierre con error
 *   4. Si result.length == 0: permite transición a CERRADA
 */
describe.skip('ÍNDICE 3: obligaciones (operacion_id, estado) - CRÍTICO I5', () => {
  it('debería listar obligaciones pendientes de una operación', async () => {
    const operacion_id = 'op-bruno-001-test'
    const estadoPendiente = 'PENDIENTE'

    try {
      const q = query(
        collection(db, 'obligaciones') as any,
        where('operacion_id', '==', operacion_id),
        where('estado', '==', estadoPendiente)
      ) as Query<Obligacion>

      const snapshot = await getDocs(q)

      // Si result.size > 0: NO se puede cerrar (hay deuda pendiente)
      // Si result.size == 0: SÍ se puede cerrar (todas las deudas saldadas)
      console.log(
        `✅ Índice 3 funciona: ${snapshot.size} obligaciones pendientes encontradas`
      )
      expect(snapshot).toBeDefined()
    } catch (error: any) {
      console.error(
        '❌ ÍNDICE 3 FALTANTE (CRÍTICO) - Firebase sugiere:',
        error.message
      )
      throw error
    }
  })
})

/**
 * TEST 4: Timeline de eventos de una operación (AUDITORÍA INMUTABLE)
 *
 * Índice requerido:
 *   Collection: operaciones_economicas/{operacion_id}/eventos_economicos
 *   Fields: (timestamp DESC)
 *
 * Caso de uso: Mostrar historial cronológico de cambios
 * - OPERACION_ENCARGADA: María creó encargo
 * - CUIDADOR_ASIGNADO: Sistema asignó Carlos
 * - SERVICIO_EJECUTADO: Carlos completó paseo
 * - RECAUDO: María pagó $50.000
 * - PAGO_TERCERO: Paw-Path pagó a Carlos
 *
 * Beneficio: En caso de disputa, todos los eventos están registrados inmutablemente
 */
describe.skip('ÍNDICE 4: eventos_economicos (operacion_id, timestamp) - AUDITORÍA', () => {
  it('debería listar eventos de una operación en orden cronológico', async () => {
    const operacion_id = 'op-bruno-001-test'

    try {
      const q = query(
        collection(
          db,
          `operaciones_economicas/${operacion_id}/eventos_economicos`
        ) as any
      ) as Query<EventoOperacionEconomica>

      const snapshot = await getDocs(q)

      console.log(`✅ Índice 4 funciona: ${snapshot.size} eventos encontrados`)
      expect(snapshot).toBeDefined()
    } catch (error: any) {
      console.error('❌ ÍNDICE 4 FALTANTE - Firebase sugiere:', error.message)
      throw error
    }
  })
})

/**
 * RESUMEN DE ÍNDICES REQUERIDOS
 *
 * Cuando ejecutes este test en un entorno de desarrollo local (ej: emulator),
 * cada query fallará si falta el índice, y Firebase dirá:
 *
 *   "You can create a composite index by going to the Cloud Console:
 *    https://console.firebase.google.com/firestore/databases/_/indexes?create_composite=..."
 *
 * O mediante CLI:
 *
 *   firebase firestore:indexes
 *   # Selecciona crear nuevo índice compuesto
 *
 * Los 4 índices necesarios son:
 *
 * 1. Collection: operacionesEconomicas
 *    Fields: tutorId (Ascending), estado (Ascending)
 *    Queries: Listar operaciones de un tutor por estado
 *
 * 2. Collection: movimientosFinancieros
 *    Fields: operacionId (Ascending), tipo (Ascending), creadoEn (Descending)
 *    Queries: Auditar movimientos de una operación
 *
 * 3. Collection: obligaciones
 *    Fields: operacionId (Ascending), estado (Ascending)
 *    Queries: Validar invariante I5 antes de cierre
 *
 * 4. Collection: operacionesEconomicas/{id}/eventosEconomicos
 *    Fields: timestamp (Descending)
 *    Queries: Timeline inmutable de eventos
 *
 * IMPORTANTE:
 * - Estos índices son CRÍTICOS para performance en producción
 * - Sin ellos, las queries serán LENTAS o FALLARÁN
 * - Están documentados en MODELO-ECONOMICO-EXPLICADO.md
 */

describe('RESUMEN: Validación de reglas Firestore FASE 5', () => {
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
    const enReglas = lista[1].split(',').map((a: string) => a.trim().replace(/'/g, ''))
    const publicas = AREAS_CONFIGURACION.filter(
      (a: string) => CATALOGO_CONFIGURACION[a].lectura === 'publica'
    )
    expect([...enReglas].sort()).toEqual([...publicas].sort())
  })

  it('los valores de configuración usados en las reglas tienen el por defecto del catálogo', () => {
    const { CATALOGO_CONFIGURACION } = require('@/functions/src/compartido/configuracion')
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
    const { PREFIJO_CONSENTIMIENTO } = require('@/functions/src/compartido/consentimiento')
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
