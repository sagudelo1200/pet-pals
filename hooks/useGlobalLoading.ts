import { useState, useCallback } from 'react'

interface LoadingState {
  cargando: boolean
  message?: string
  messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
}

/**
 * Hook para manejar estados de carga globales
 */
export const useGlobalLoading = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    cargando: false,
  })

  // Mostrar cargando con opciones
  const showLoading = useCallback(
    (options?: {
      message?: string
      messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
    }) => {
      setLoadingState({
        cargando: true,
        message: options?.message,
        messageType: options?.messageType || 'general',
      })
    },
    []
  )

  // Ocultar cargando
  const hideLoading = useCallback(() => {
    setLoadingState({
      cargando: false,
    })
  }, [])

  // Ejecutar función con manejo automático de cargando
  const withLoading = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: {
        message?: string
        messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
      }
    ): Promise<T> => {
      showLoading(options)
      try {
        const result = await fn()
        return result
      } finally {
        hideLoading()
      }
    },
    [showLoading, hideLoading]
  )

  return {
    // Estado
    cargando: loadingState.cargando,
    message: loadingState.message,
    messageType: loadingState.messageType,

    // Acciones
    showLoading,
    hideLoading,
    withLoading,
  }
}
