import { useState, useCallback } from 'react'

interface LoadingState {
  isLoading: boolean
  message?: string
  messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
}

/**
 * Hook para manejar estados de carga globales
 */
export const useGlobalLoading = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  })

  // Mostrar loading con opciones
  const showLoading = useCallback(
    (options?: {
      message?: string
      messageType?: 'general' | 'pets' | 'auth' | 'walks' | 'custom'
    }) => {
      setLoadingState({
        isLoading: true,
        message: options?.message,
        messageType: options?.messageType || 'general',
      })
    },
    []
  )

  // Ocultar loading
  const hideLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
    })
  }, [])

  // Ejecutar función con loading automático
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
    isLoading: loadingState.isLoading,
    message: loadingState.message,
    messageType: loadingState.messageType,

    // Acciones
    showLoading,
    hideLoading,
    withLoading,
  }
}
