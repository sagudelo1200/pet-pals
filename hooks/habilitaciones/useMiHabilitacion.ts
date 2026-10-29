import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useDoc } from '@/hooks/useDoc'
import { ServicioHabilitaciones } from '@/services/firebase/firestore/colecciones/habilitaciones'
import {
  enviarHabilitacion,
  iniciarHabilitacion,
} from '@/services/firebase/habilitaciones'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  bannerDe,
  filasDe,
  perfilParaRequisitos,
  puedeEnviar,
} from '@/logic/habilitaciones/miHabilitacion'
import { idDeHabilitacion } from '@/functions/src/compartido/habilitacion'
import type { TipoServicio } from '@/functions/src/compartido/servicios'
import type { Habilitacion } from '@/models/Habilitacion'

/**
 * La habilitación de la persona para un servicio: la crea al abrir (el
 * servidor toma lo que ya tiene verificado), la sigue en tiempo real junto con
 * su perfil, y la envía a revisión.
 */
export function useMiHabilitacion(servicio: TipoServicio) {
  const { user, profile } = useAuth()
  const uid = user?.uid ?? ''
  const [habilitacion, setHabilitacion] = useState<Habilitacion | null>(null)
  const [preparando, setPreparando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El perfil cambia al editarlo: se sigue en vivo para saber qué falta
  const { data: perfil, cargando: cargandoPerfil } = useDoc<any>('perfiles_publicos', uid, {
    listen: true,
    enabled: !!uid,
  })

  useEffect(() => {
    if (!uid) return undefined
    let activo = true
    let cancelar = () => {}
    setPreparando(true)
    setError(null)
    // Idempotente: crea la habilitación si no existe y toma lo ya verificado.
    // Se escucha DESPUÉS: las reglas solo dejan leer una habilitación que ya
    // existe, y un listener rechazado no se recupera solo
    iniciarHabilitacion({ servicio })
      .then(() => {
        if (!activo) return
        cancelar = ServicioHabilitaciones.suscribirADetalle(
          idDeHabilitacion(uid, servicio),
          h => {
            if (activo) setHabilitacion(h)
          },
          err => {
            if (activo) setError(err.message)
          }
        )
      })
      .catch(e => {
        if (activo) setError(mensajeErrorCallable(e))
      })
      .finally(() => {
        if (activo) setPreparando(false)
      })
    return () => {
      activo = false
      cancelar()
    }
  }, [uid, servicio])

  const filas = useMemo(
    () =>
      filasDe(
        servicio,
        habilitacion,
        perfilParaRequisitos(perfil, profile),
        Date.now()
      ),
    [servicio, habilitacion, perfil, profile]
  )
  const banner = useMemo(() => bannerDe(habilitacion, filas), [habilitacion, filas])

  /** Envía a revisión; devuelve el mensaje del servidor si no se pudo. */
  const enviar = useCallback(async (): Promise<string | null> => {
    setEnviando(true)
    try {
      await enviarHabilitacion({ servicio })
      return null
    } catch (e) {
      return mensajeErrorCallable(e)
    } finally {
      setEnviando(false)
    }
  }, [servicio])

  return {
    habilitacion,
    filas,
    banner,
    cargando: (preparando && !habilitacion) || cargandoPerfil,
    error,
    enviando,
    puedeEnviar: puedeEnviar(habilitacion, filas),
    perfilCompleto: filas.filter(f => f.delPerfil).every(f => f.estado === 'VERIFICADO'),
    enviar,
  }
}
