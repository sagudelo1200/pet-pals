import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { functions } from '@/firebase.config'
import { httpsCallable } from 'firebase/functions'
import { ConsentimientoEstadoActual } from '@/models/Consentimiento'
import {
  evaluarVigencia as evaluarVigenciaPura,
  evaluarAlerta,
  type ResultadoVigencia as ResultadoEvaluacionConsentimiento,
} from '@/logic/consentimientos/evaluador'
import { GestorConsentimientos } from '@/logic/consentimientos/gestor'
import { useAuth } from './AuthContext'

/** Tipo para auditoría del cliente */
export interface AuditoriaCliente {
  dispositivo?: string
  idioma?: string
  timezone?: string
}

/** Resultado de operaciones de consentimiento */
export interface ResultadoConsentimiento {
  exito: boolean
  evento_id?: string
  estado?: string
  error?: string
}

/** Estado extendido para UI */
export interface ConsentimientoUI extends ConsentimientoEstadoActual {
  tipo_documento: string
  vigente: boolean
  aceptado: boolean
  motivo_no_vigencia?: string
  titulo: string
  // Alertas tempranas
  proximoAExpirar: boolean
  diasRestantes: number | null
}

/** Tipo del contexto */
export interface ConsentimientosContextType {
  consentimientos: Map<string, ConsentimientoUI>
  cargando: boolean
  error: string | null

  // Operaciones
  aceptarConsentimiento(
    _tipo_documento: string,
    _auditoria?: AuditoriaCliente
  ): Promise<ResultadoConsentimiento>
  rechazarConsentimiento(
    _tipo_documento: string,
    _auditoria?: AuditoriaCliente
  ): Promise<ResultadoConsentimiento>
  revocarConsentimiento(
    _tipo_documento: string,
    _auditoria?: AuditoriaCliente
  ): Promise<ResultadoConsentimiento>

  // Consultas
  listarConsentimientos(): ConsentimientoUI[]
  obtenerConsentimiento(_tipo: string): ConsentimientoUI | undefined
  evaluarVigencia(_tipo: string): ResultadoEvaluacionConsentimiento

  // Estado
  recargar(): Promise<void>
}

const ConsentimientosContext = createContext<
  ConsentimientosContextType | undefined
>(undefined)

/**
 * Hook para acceder al contexto de consentimientos.
 * Lanza error si se usa fuera de ConsentimientosProvider.
 */
export const useConsentimientos = (): ConsentimientosContextType => {
  const context = useContext(ConsentimientosContext)
  if (!context) {
    throw new Error(
      'useConsentimientos debe ser usado dentro de ConsentimientosProvider'
    )
  }
  return context
}

/** Mapeo de tipos de consentimiento a títulos */
const TITULOS_CONSENTIMIENTOS: Record<string, string> = {
  TERMINOS_SERVICIO: 'Términos de Servicio',
  DATOS_PERSONALES: 'Tratamiento de Datos Personales',
  MARKETING_COMUNICACIONES: 'Comunicaciones de Marketing',
}

/** Props del proveedor */
interface ConsentimientosProviderProps {
  children: ReactNode
}

/**
 * Provider de consentimientos.
 * Carga estado al autenticarse, expone operaciones y evaluadores puros.
 */
export const ConsentimientosProvider: React.FC<
  ConsentimientosProviderProps
> = ({ children }) => {
  const { user } = useAuth()
  const [consentimientos, setConsentimientos] = useState<
    Map<string, ConsentimientoUI>
  >(new Map())
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Función para enriquecer ConsentimientoEstadoActual con datos para UI
  const enriquecerConsentimiento = (
    tipo_documento: string,
    estado: ConsentimientoEstadoActual
  ): ConsentimientoUI => {
    // Evaluar vigencia
    const vigencia = evaluarVigenciaPura(
      estado.estado,
      estado.fecha_proxima_reconfirmacion,
      estado.es_documento_vigente_hoy,
      new Date()
    )

    // Evaluar alerta de expiración próxima
    const alerta = evaluarAlerta(
      vigencia,
      estado.fecha_proxima_reconfirmacion,
      new Date()
    )

    return {
      tipo_documento,
      ...estado,
      vigente: vigencia.vigente,
      aceptado: vigencia.aceptado,
      motivo_no_vigencia: vigencia.motivo_no_vigencia,
      titulo: TITULOS_CONSENTIMIENTOS[tipo_documento] || tipo_documento,
      proximoAExpirar: alerta.proximoAExpirar,
      diasRestantes: alerta.diasRestantes,
    }
  }

  // Cargar consentimientos al autenticarse y escuchar cambios en tiempo real
  useEffect(() => {
    if (!user) {
      setConsentimientos(new Map())
      setError(null)
      return undefined
    }

    const cargarConsentimientos = async () => {
      try {
        setCargando(true)
        setError(null)

        const resultado =
          await GestorConsentimientos.obtenerConsentimientosActuales(user.uid)
        const mapa = new Map<string, ConsentimientoUI>()

        if (resultado.success && resultado.data) {
          const tiposDocumentos = ['DATOS_PERSONALES']

          for (const tipo_documento of tiposDocumentos) {
            if (resultado.data[tipo_documento]) {
              const estado = resultado.data[tipo_documento]
              const enriquecido = enriquecerConsentimiento(
                tipo_documento,
                estado
              )
              mapa.set(tipo_documento, enriquecido)
            }
          }
        }

        setConsentimientos(mapa)
      } catch (err) {
        const mensajeError =
          err instanceof Error ? err.message : 'Error desconocido'
        setError(mensajeError)
        console.error('Error cargando consentimientos:', err)
      } finally {
        setCargando(false)
      }
    }

    cargarConsentimientos()

    // Listener en tiempo real para sincronizar cambios
    const unsubscribe = GestorConsentimientos.escucharConsentimientosActuales(
      user.uid,
      consentimientos => {
        if (consentimientos) {
          const mapa = new Map<string, ConsentimientoUI>()
          const tiposDocumentos = ['DATOS_PERSONALES']

          for (const tipo_documento of tiposDocumentos) {
            if (consentimientos[tipo_documento]) {
              const estado = consentimientos[tipo_documento]
              const enriquecido = enriquecerConsentimiento(
                tipo_documento,
                estado
              )
              mapa.set(tipo_documento, enriquecido)
            }
          }

          setConsentimientos(mapa)
        }
      },
      error => {
        console.error('Error en listener de consentimientos:', error)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Cloud Function callable
  const registrarConsentimientoCallable = httpsCallable(
    functions,
    'registrarConsentimiento'
  )

  // Operación genérica: registrar consentimiento
  const registrarConsentimiento = async (
    tipo_documento: string,
    estado: 'ACEPTADO' | 'RECHAZADO' | 'REVOCADO',
    auditoria?: AuditoriaCliente
  ): Promise<ResultadoConsentimiento> => {
    try {
      const payload = {
        tipo_documento,
        estado,
        ...auditoria,
      }

      const response = await registrarConsentimientoCallable(payload)
      const data = response.data as ResultadoConsentimiento

      if (data.exito) {
        // Actualización optimista: no hacer getDoc, actualizar localmente
        const consentimientoActual = consentimientos.get(tipo_documento)
        if (consentimientoActual) {
          const actualizado = {
            ...consentimientoActual,
            estado, // Nuevo estado registrado
            fecha_evento: new Date(),
          }
          setConsentimientos(prev => {
            const newMap = new Map(prev)
            newMap.set(tipo_documento, actualizado)
            return newMap
          })
        }
      }

      return data
    } catch (err) {
      const mensajeError =
        err instanceof Error ? err.message : 'Error desconocido'
      setError(mensajeError)
      return {
        exito: false,
        error: mensajeError,
      }
    }
  }

  // Operaciones públicas
  const aceptarConsentimiento = (
    tipo_documento: string,
    auditoria?: AuditoriaCliente
  ) => registrarConsentimiento(tipo_documento, 'ACEPTADO', auditoria)

  const rechazarConsentimiento = (
    tipo_documento: string,
    auditoria?: AuditoriaCliente
  ) => registrarConsentimiento(tipo_documento, 'RECHAZADO', auditoria)

  const revocarConsentimiento = (
    tipo_documento: string,
    auditoria?: AuditoriaCliente
  ) => registrarConsentimiento(tipo_documento, 'REVOCADO', auditoria)

  // Consultas
  const listarConsentimientos = () => Array.from(consentimientos.values())

  const obtenerConsentimiento = (tipo_documento: string) =>
    consentimientos.get(tipo_documento)

  const evaluarVigencia = (
    tipo_documento: string
  ): ResultadoEvaluacionConsentimiento => {
    const consent = consentimientos.get(tipo_documento)
    if (!consent) {
      return {
        vigente: false,
        aceptado: false,
        motivo_no_vigencia: 'RECHAZADO' as const,
      }
    }

    return evaluarVigenciaPura(
      consent.estado,
      consent.fecha_proxima_reconfirmacion,
      consent.es_documento_vigente_hoy,
      new Date()
    )
  }

  // Recargar manualmente desde servidor
  const recargar = async (): Promise<void> => {
    if (!user) return
    setCargando(true)
    try {
      const resultado =
        await GestorConsentimientos.obtenerConsentimientosActuales(user.uid)
      const mapa = new Map<string, ConsentimientoUI>()

      if (resultado.success && resultado.data) {
        const tiposDocumentos = ['DATOS_PERSONALES']

        for (const tipo_documento of tiposDocumentos) {
          if (resultado.data[tipo_documento]) {
            const estado = resultado.data[tipo_documento]
            const enriquecido = enriquecerConsentimiento(tipo_documento, estado)
            mapa.set(tipo_documento, enriquecido)
          }
        }
      }

      setConsentimientos(mapa)
    } finally {
      setCargando(false)
    }
  }

  const value: ConsentimientosContextType = {
    consentimientos,
    cargando,
    error,
    aceptarConsentimiento,
    rechazarConsentimiento,
    revocarConsentimiento,
    listarConsentimientos,
    obtenerConsentimiento,
    evaluarVigencia,
    recargar,
  }

  return (
    <ConsentimientosContext.Provider value={value}>
      {children}
    </ConsentimientosContext.Provider>
  )
}
