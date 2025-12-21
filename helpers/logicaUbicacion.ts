import { UbicacionRef } from '@/models/Ubicacion'

/**
 * Lógica pura para agregar una nueva referencia de ubicación.
 * - Si es la primera, la marca como principal.
 * - Si no, la agrega como secundaria (principal = false).
 * - Retorna la lista actualizada y el ID de la principal.
 */
export function agregarUbicacionRef(
  listaActual: UbicacionRef[] = [],
  nuevaUbicacionId: string,
  alias?: string
): { lista: UbicacionRef[]; idPrincipal: string | undefined } {
  const nuevaRef: UbicacionRef = {
    ubicacion_id: nuevaUbicacionId,
    es_principal: listaActual.length === 0, // Primera es principal
    tipo: alias || 'Casa', // Default tipo
    desde: new Date(),
  }

  // Evitar duplicados por ID
  const existe = listaActual.find(u => u.ubicacion_id === nuevaUbicacionId)
  if (existe) {
    // Si ya existe, retornamos igual pero asegurando integridad de principal
    const principal =
      listaActual.find(u => u.es_principal)?.ubicacion_id || nuevaUbicacionId
    return { lista: listaActual, idPrincipal: principal }
  }

  const nuevaLista = [...listaActual, nuevaRef]
  const idPrincipal = nuevaRef.es_principal
    ? nuevaRef.ubicacion_id
    : listaActual.find(u => u.es_principal)?.ubicacion_id

  return { lista: nuevaLista, idPrincipal }
}

/**
 * Lógica pura para cambiar la ubicación principal.
 * - Marca la seleccionada como principal.
 * - Desmarca todas las demás.
 */
export function fijarPrincipalRef(
  listaActual: UbicacionRef[],
  idNuevaPrincipal: string
): { lista: UbicacionRef[]; idPrincipal: string } {
  let encontrada = false
  const nuevaLista = listaActual.map(u => {
    if (u.ubicacion_id === idNuevaPrincipal) {
      encontrada = true
      return { ...u, es_principal: true }
    }
    return { ...u, es_principal: false }
  })

  if (!encontrada) throw new Error('UBICACION_NO_ENCONTRADA_EN_USUARIO')

  return { lista: nuevaLista, idPrincipal: idNuevaPrincipal }
}

/**
 * Lógica pura para eliminar una ubicación.
 * - Si se borra la principal, reasigna la principal a la más antigua restante (o la primera del array).
 */
export function eliminarUbicacionRef(
  listaActual: UbicacionRef[],
  idAEliminar: string
): { lista: UbicacionRef[]; idPrincipal: string | undefined } {
  const index = listaActual.findIndex(u => u.ubicacion_id === idAEliminar)
  if (index === -1) return { lista: listaActual, idPrincipal: undefined } // No existe, no changes

  const eraPrincipal = listaActual[index].es_principal
  const nuevaLista = listaActual.filter(u => u.ubicacion_id !== idAEliminar)

  let idPrincipal: string | undefined

  if (nuevaLista.length === 0) {
    idPrincipal = undefined
  } else if (eraPrincipal) {
    // Reasignar principal a la primera disponible (estrategia simple)
    // Podría ser "la más reciente" o "la más antigua", aquí usamos index 0
    nuevaLista[0].es_principal = true
    idPrincipal = nuevaLista[0].ubicacion_id
  } else {
    // Mantiene la actual
    idPrincipal = nuevaLista.find(u => u.es_principal)?.ubicacion_id
  }

  return { lista: nuevaLista, idPrincipal }
}
