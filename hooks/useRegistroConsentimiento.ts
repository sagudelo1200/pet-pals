/**
 * Hook para manejar consentimiento de DATOS_PERSONALES en Registro.
 *
 * Maneja:
 * - Estado del checkbox "Acepto términos"
 * - Validación de aceptación obligatoria
 * - Modal para leer el documento completo
 * - Llamada a aceptarConsentimiento() cuando se completa el registro
 *
 * Uso en Registro.tsx:
 *   const {
 *     consentimientoAceptado,
 *     toggleConsentimiento,
 *     registrarConsentimientoAlRegistro,
 *     modalVisible,
 *     abrirModal,
 *     cerrarModal
 *   } = useRegistroConsentimiento()
 *
 *   // En el JSX:
 *   <CheckboxConsentimiento
 *     label="Acepto la protección de mis datos"
 *     value={consentimientoAceptado}
 *     onValueChange={toggleConsentimiento}
 *     onLeerDocumento={abrirModal}
 *   />
 *
 *   <ModalLeerConsentimiento
 *     visible={modalVisible}
 *     tipoConsentimiento="DATOS_PERSONALES"
 *     onClose={cerrarModal}
 *   />
 *
 *   // Antes de llamar registrar():
 *   if (!consentimientoAceptado) {
 *     Alert.alert("Debes aceptar el tratamiento de datos")
 *     return
 *   }
 *
 *   // Después de registrar exitosamente:
 *   await registrarConsentimientoAlRegistro()
 */

import { useState, useCallback } from 'react'
import { useConsentimientos } from '@/context/ConsentimientosContext'

interface UseRegistroConsentimientoResult {
  consentimientoAceptado: boolean
  toggleConsentimiento: (_valor: boolean) => void
  registrarConsentimientoAlRegistro: () => Promise<boolean>
  cargandoConsentimiento: boolean
  modalVisible: boolean
  abrirModal: () => void
  cerrarModal: () => void
}

export const useRegistroConsentimiento =
  (): UseRegistroConsentimientoResult => {
    const [consentimientoAceptado, setConsentimientoAceptado] = useState(false)
    const [cargandoConsentimiento, setCargandoConsentimiento] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)
    const { aceptarConsentimiento } = useConsentimientos()

    const toggleConsentimiento = useCallback((nuevoValor: boolean) => {
      setConsentimientoAceptado(nuevoValor)
    }, [])

    const abrirModal = useCallback(() => {
      setModalVisible(true)
    }, [])

    const cerrarModal = useCallback(() => {
      setModalVisible(false)
    }, [])

    /**
     * Registrar el consentimiento en Firestore después del registro de usuario.
     * Llamar DESPUÉS de que registrar() fue exitoso y el usuario está autenticado.
     */
    const registrarConsentimientoAlRegistro = useCallback(async () => {
      if (!consentimientoAceptado) {
        return false
      }

      try {
        setCargandoConsentimiento(true)
        const resultado = await aceptarConsentimiento('DATOS_PERSONALES')
        return resultado.exito
      } catch (err) {
        console.error('[useRegistroConsentimiento]', err)
        return false
      } finally {
        setCargandoConsentimiento(false)
      }
    }, [consentimientoAceptado, aceptarConsentimiento])

    return {
      consentimientoAceptado,
      toggleConsentimiento,
      registrarConsentimientoAlRegistro,
      cargandoConsentimiento,
      modalVisible,
      abrirModal,
      cerrarModal,
    }
  }
