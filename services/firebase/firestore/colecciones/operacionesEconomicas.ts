import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  runTransaction,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase.config'
import type {
  OperacionEconomica,
  EventoOperacionEconomica,
  MovimientoFinanciero,
  Obligacion,
} from '@/models/operacionesEconomicas'

const OPERACIONES_COL = 'operacionesEconomicas'
const EVENTOS_COL = 'eventosEconomicos'
const MOVIMIENTOS_COL = 'movimientosFinancieros'
const OBLIGACIONES_COL = 'obligaciones'
const DEDUP_COL = 'deduplicacionMovimientos'

/**
 * Crear operación económica
 */
export async function crearOperacion(
  operacion: Omit<OperacionEconomica, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, OPERACIONES_COL))
  const nuevoDoc: OperacionEconomica = {
    ...operacion,
    id: docRef.id,
  }
  await setDoc(docRef, nuevoDoc)
  return docRef.id
}

/**
 * Obtener operación por ID
 */
export async function obtenerOperacion(
  operacionId: string
): Promise<OperacionEconomica | null> {
  const docRef = doc(db, OPERACIONES_COL, operacionId)
  const snap = await getDoc(docRef)
  return snap.exists() ? (snap.data() as OperacionEconomica) : null
}

/**
 * Actualizar estado de operación
 */
export async function actualizarOperacion(
  operacionId: string,
  actualizaciones: Partial<OperacionEconomica>
): Promise<void> {
  const docRef = doc(db, OPERACIONES_COL, operacionId)
  await setDoc(docRef, actualizaciones, { merge: true })
}

/**
 * Listar operaciones por estado
 */
export async function listarOperacionesPorEstado(
  estado: OperacionEconomica['estado']
): Promise<OperacionEconomica[]> {
  const q = query(
    collection(db, OPERACIONES_COL),
    where('estado', '==', estado)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as OperacionEconomica)
}

/**
 * Crear evento
 */
export async function crearEvento(
  evento: Omit<EventoOperacionEconomica, 'id'>
): Promise<string> {
  const docRef = doc(
    collection(db, OPERACIONES_COL, evento.operacion_id, EVENTOS_COL)
  )
  const nuevoDoc: EventoOperacionEconomica = {
    ...evento,
    id: docRef.id,
  }
  await setDoc(docRef, nuevoDoc)
  return docRef.id
}

/**
 * Obtener eventos de una operación
 */
export async function obtenerEventosOperacion(
  operacionId: string
): Promise<EventoOperacionEconomica[]> {
  const q = query(collection(db, OPERACIONES_COL, operacionId, EVENTOS_COL))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as EventoOperacionEconomica)
}

/**
 * Registrar movimiento con deduplicación I4
 * Clave determinista: hash(origen + ':' + referenciaOrigen)
 * Si ya existe, retorna movimiento existente (idempotente)
 */
export async function registrarMovimiento(
  movimiento: Omit<MovimientoFinanciero, 'id'>,
  hashFn: (str: string) => string = defaultHash
): Promise<string> {
  const dedupKey = hashFn(
    `${movimiento.origen}:${movimiento.referencia_origen}`
  )

  return runTransaction(db, async transaction => {
    const dedupRef = doc(db, DEDUP_COL, dedupKey)
    const dedupSnap = await transaction.get(dedupRef)

    if (dedupSnap.exists()) {
      return dedupSnap.data().movimientoId
    }

    const docRef = doc(collection(db, MOVIMIENTOS_COL))
    const nuevoDoc: MovimientoFinanciero = {
      ...movimiento,
      id: docRef.id,
    }

    transaction.set(docRef, nuevoDoc)
    transaction.set(dedupRef, {
      dedupKey,
      movimientoId: docRef.id,
      timestamp: Timestamp.now(),
      origen: movimiento.origen,
      referencia_origen: movimiento.referencia_origen,
    })

    return docRef.id
  })
}

/**
 * Obtener movimiento por ID
 */
export async function obtenerMovimiento(
  movimientoId: string
): Promise<MovimientoFinanciero | null> {
  const docRef = doc(db, MOVIMIENTOS_COL, movimientoId)
  const snap = await getDoc(docRef)
  return snap.exists() ? (snap.data() as MovimientoFinanciero) : null
}

/**
 * Listar movimientos de una operación
 */
export async function listarMovimientosOperacion(
  operacionId: string
): Promise<MovimientoFinanciero[]> {
  const q = query(
    collection(db, MOVIMIENTOS_COL),
    where('operacion_id', '==', operacionId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as MovimientoFinanciero)
}

/**
 * Crear obligación
 */
export async function crearObligacion(
  obligacion: Omit<Obligacion, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, OBLIGACIONES_COL))
  const nuevoDoc: Obligacion = {
    ...obligacion,
    id: docRef.id,
  }
  await setDoc(docRef, nuevoDoc)
  return docRef.id
}

/**
 * Obtener obligación por ID
 */
export async function obtenerObligacion(
  obligacionId: string
): Promise<Obligacion | null> {
  const docRef = doc(db, OBLIGACIONES_COL, obligacionId)
  const snap = await getDoc(docRef)
  return snap.exists() ? (snap.data() as Obligacion) : null
}

/**
 * Actualizar obligación
 */
export async function actualizarObligacion(
  obligacionId: string,
  actualizaciones: Partial<Obligacion>
): Promise<void> {
  const docRef = doc(db, OBLIGACIONES_COL, obligacionId)
  await setDoc(docRef, actualizaciones, { merge: true })
}

/**
 * Listar obligaciones de una operación
 */
export async function listarObligacionesOperacion(
  operacionId: string
): Promise<Obligacion[]> {
  const q = query(
    collection(db, OBLIGACIONES_COL),
    where('operacion_id', '==', operacionId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Obligacion)
}

/**
 * Listar obligaciones pendientes de una operación
 */
export async function listarObligacionesPendientes(
  operacionId: string
): Promise<Obligacion[]> {
  const q = query(
    collection(db, OBLIGACIONES_COL),
    where('operacion_id', '==', operacionId),
    where('estado', '==', 'PENDIENTE')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as Obligacion)
}

/**
 * Hash simple para deduplicación (no criptográfico, solo determinista)
 */
function defaultHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
