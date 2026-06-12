import { useState, useCallback } from 'react'
import type { Mascota } from '@/models/Mascota'

interface UseCompatibilidadEditorReturn {
  modalVisible: boolean
  openModal: () => void
  closeModal: () => void
}

/**
 * Hook simple para gestionar visibilidad del modal de compatibilidad
 * La lógica de persistencia está encapsulada en el modal
 *
 * @param _initialData - No utilizado (mantenido para compatibilidad)
 * @returns Funciones para manejar visibilidad del modal
 */
export const useCompatibilidadEditor = (
  _initialData?: Partial<Mascota>
): UseCompatibilidadEditorReturn => {
  const [modalVisible, setModalVisible] = useState(false)

  const openModal = useCallback(() => {
    setModalVisible(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalVisible(false)
  }, [])

  return {
    modalVisible,
    openModal,
    closeModal,
  }
}
