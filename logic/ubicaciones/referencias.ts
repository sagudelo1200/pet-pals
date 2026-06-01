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
  alias?: string,
  coordenadas?: { latitude: number; longitude: number },
  direccion_formateada?: string,
  h3_index?: string
): { lista: UbicacionRef[]; idPrincipal: string | undefined } {
  const nuevaRef: UbicacionRef = {
    ubicacion_id: nuevaUbicacionId,
    es_principal: listaActual.length === 0, // Primera es principal
    alias: alias || 'Casa',
    desde: new Date(),
    coordenadas,
    direccion_formateada,
    h3_index,
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

  // Si no se encontró (ej. ID inválido), no cambiamos nada o manejamos error
  // Aquí asumimos que si no está, no hay nueva principal válida,
  // pero mantenemos la lista modificada (todas false) o revertimos.
  // Para seguridad, si no encontrada, revertimos a la original o dejamos sin principal.
  if (!encontrada) {
    return {
      lista: listaActual,
      idPrincipal: listaActual.find(u => u.es_principal)?.ubicacion_id || '',
    }
  }

  return { lista: nuevaLista, idPrincipal: idNuevaPrincipal }
}

/**
 * Elimina una referencia de la lista.
 * - Si se borra la principal, asigna la siguiente más antigua como principal.
 */
export function eliminarUbicacionRef(
  listaActual: UbicacionRef[],
  idAEliminar: string
): { lista: UbicacionRef[]; idPrincipal: string | undefined } {
  const aEliminar = listaActual.find(u => u.ubicacion_id === idAEliminar)
  if (!aEliminar) {
    return {
      lista: listaActual,
      idPrincipal: listaActual.find(u => u.es_principal)?.ubicacion_id,
    }
  }

  const nuevaLista = listaActual.filter(u => u.ubicacion_id !== idAEliminar)

  // Si borramos la principal y quedan otras, asignar nueva principal
  if (aEliminar.es_principal && nuevaLista.length > 0) {
    // Asignar a la primera de la lista (la más antigua usualmente)
    nuevaLista[0].es_principal = true
    return { lista: nuevaLista, idPrincipal: nuevaLista[0].ubicacion_id }
  }

  const idPrincipal = nuevaLista.find(u => u.es_principal)?.ubicacion_id
  return { lista: nuevaLista, idPrincipal }
}
