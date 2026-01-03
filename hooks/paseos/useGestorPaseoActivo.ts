import { useState, useEffect } from 'react'
import { GestorPaseos } from '@/logic/paseos'
import { ESTADOS_PASEO, Paseo } from '@/models/Paseo'
import { EVENTOS } from '@/logic/paseos/maquinaEstados'

/**
 * Hook para interactuar con el Paseo Activo Global.
 * Permite leer el estado reactivamente y ejecutar acciones de negocio.
 *
 * Requiere que el paseo haya sido inicializado previamente (ej. por useSincronizadorPaseo).
 */
export function useGestorPaseoActivo() {
  const [state, setState] = useState<any | null>(
    GestorPaseos.paseoActivo.getPaseoActivo()
  )

  useEffect(() => {
    // Suscribirse a cambios en el gestor
    const unsub = GestorPaseos.paseoActivo.suscribir(setState)
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
    puede: (evento: string) => GestorPaseos.paseoActivo.puede(evento),

    // Constantes expuestas para consumidores
    EVENTOS,
    ESTADOS: ESTADOS_PASEO,

    // Acciones de negocio (Asíncronas por defecto para UI)
    acciones: {
      aceptar: () => GestorPaseos.paseoActivo.aceptarPaseoAsync(),
      iniciarRuta: () => GestorPaseos.paseoActivo.iniciarRutaAsync(),
      iniciarPaseo: () => GestorPaseos.paseoActivo.iniciarPaseoAsync(),
      finalizar: () => GestorPaseos.paseoActivo.finalizarPaseoAsync(),
      cancelar: (motivo: string) =>
        GestorPaseos.paseoActivo.cancelarPaseoAsync(motivo),
    },

    // Acciones de gestión local
    gestion: {
      seleccionar: (p: Paseo) => GestorPaseos.paseoActivo.setPaseoActivo(p),
      limpiar: () => GestorPaseos.paseoActivo.limpiarPaseoActivo(),
    },
  }
}
