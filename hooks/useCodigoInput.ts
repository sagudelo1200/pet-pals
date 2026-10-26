/**
 * useCodigoInput
 * Hook reutilizable para validación de código numérico
 *
 * Maneja:
 * - Ingreso de dígitos (con límite máximo)
 * - Gestión de intentos fallidos
 * - Bloqueo después de intentos excedidos
 * - Reset automático
 *
 * Utilizado por:
 * - ModalIngresarCodigo (cuidador ingresa 6 dígitos)
 * - ModalValidacionEntrega (tutor ingresa 4 dígitos)
 */

import { useState, useCallback } from 'react'
import { i18n } from '@/services/i18n'

interface UseCodigoInputConfig {
  digitos: number // Cantidad máxima de dígitos (4 o 6)
  maxIntentos?: number // Máximo de intentos antes de bloquear (default: 3)
  onValidar: (_codigo: string) => Promise<{ success: boolean; error?: string }>
}

interface UseCodigoInputReturn {
  codigo: string
  loading: boolean
  bloqueado: boolean
  intentosRestantes: number
  error: string | null
  // Métodos
  handleDigito: (_digito: string) => void
  handleBorrar: () => void
  handleValidar: () => Promise<{ success: boolean; error?: string }>
  resetear: () => void
  setError: (_msg: string | null) => void
}

export function useCodigoInput({
  digitos,
  maxIntentos = 3,
  onValidar,
}: UseCodigoInputConfig): UseCodigoInputReturn {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [intentosFallidos, setIntentosFallidos] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const bloqueado = intentosFallidos >= maxIntentos

  const handleDigito = useCallback(
    (digito: string) => {
      if (!bloqueado && codigo.length < digitos) {
        setCodigo(codigo + digito)
        setError(null)
      }
    },
    [codigo, digitos, bloqueado]
  )

  const handleBorrar = useCallback(() => {
    setCodigo(codigo.slice(0, -1))
    setError(null)
  }, [codigo])

  const handleValidar = useCallback(async () => {
    // Validar longitud
    if (codigo.length !== digitos) {
      const msg = i18n.t('comun:codigo.ingresa_digitos', { digitos })
      setError(msg)
      return { success: false, error: msg }
    }

    // Validar si está bloqueado
    if (bloqueado) {
      const msg = i18n.t('comun:codigo.bloqueado', { max: maxIntentos })
      setError(msg)
      return { success: false, error: msg }
    }

    setLoading(true)
    setError(null)

    try {
      const resultado = await onValidar(codigo)

      if (resultado.success) {
        // ✅ Validación exitosa
        setCodigo('')
        setIntentosFallidos(0)
        return { success: true }
      } else {
        // ❌ Validación fallida
        const nuevoIntento = intentosFallidos + 1
        setIntentosFallidos(nuevoIntento)

        const mensajeError =
          resultado.error ||
          i18n.t('comun:codigo.incorrecto', {
            restantes: maxIntentos - nuevoIntento,
          })

        setError(mensajeError)
        return {
          success: false,
          error: mensajeError,
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : i18n.t('comun:codigo.error_validar')
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [codigo, digitos, bloqueado, intentosFallidos, maxIntentos, onValidar])

  const resetear = useCallback(() => {
    setCodigo('')
    setIntentosFallidos(0)
    setError(null)
  }, [])

  return {
    codigo,
    loading,
    bloqueado,
    intentosRestantes: maxIntentos - intentosFallidos,
    error,
    handleDigito,
    handleBorrar,
    handleValidar,
    resetear,
    setError,
  }
}
