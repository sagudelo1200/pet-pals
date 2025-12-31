import { useState, useEffect } from 'react'
import { paseoActivo, type PaseoActivo } from '@/logic/paseos'
import { ESTADOS_PASEO, Paseo } from '@/models/Paseo'
import { EVENTOS } from '@/logic/paseos/maquinaEstados'

/**
 * Hook para interactuar con el Paseo Activo Global.
 * Permite leer el estado reactivamente y ejecutar acciones de negocio.
 *
 * Requiere que el paseo haya sido inicializado previamente (ej. por useSincronizadorPaseo).
 */
export function useGestorPaseoActivo() {
  const [state, setState] = useState<PaseoActivo | null>(
    paseoActivo.getPaseoActivo()
  )

  useEffect(() => {
    // Suscribirse a cambios en el gestor
    const unsub = paseoActivo.suscribir(setState)
    return unsub
  }, [])

  return {
    // Estado
    paseo: state,
    hayPaseo: !!state,

    // Validadores directos
    esPendiente: state?.estado === ESTADOS_PASEO.PENDIENTE,
    esConfirmado: state?.estado === ESTADOS_PASEO.CONFIRMADO,
    esEnCamino: state?.estado === ESTADOS_PASEO.EN_CAMINO,
    esEnProgreso: state?.estado === ESTADOS_PASEO.EN_PROGRESO,
    esFinalizado: state?.estado === ESTADOS_PASEO.FINALIZADO,

    // Método de validación de acciones
    puede: (evento: string) => paseoActivo.puede(evento),

    // Constantes expuestas para consumidores
    EVENTOS,
    ESTADOS: ESTADOS_PASEO,

    // Acciones de negocio (Asíncronas por defecto para UI)
    acciones: {
      aceptar: () => paseoActivo.aceptarPaseoAsync(),
      iniciarRuta: () => paseoActivo.iniciarRutaAsync(),
      iniciarPaseo: () => paseoActivo.iniciarPaseoAsync(),
      finalizar: () => paseoActivo.finalizarPaseoAsync(),
      cancelar: (motivo: string) => paseoActivo.cancelarPaseoAsync(motivo),
    },

    // Acciones de gestión local
    gestion: {
      seleccionar: (p: Paseo) => paseoActivo.setPaseoActivo(p),
      limpiar: () => paseoActivo.limpiarPaseoActivo(),
    },
  }
}
