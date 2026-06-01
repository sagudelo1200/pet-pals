import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { BottomSheet } from '@/components/ui'
import { SeleccionarMascotaPaso } from './SeleccionarMascotaPaso'
import { SeleccionarDireccionPaso } from './SeleccionarDireccionPaso'
import { SeleccionarFechaPaso } from './SeleccionarFechaPaso'
import { SeleccionarCuidadorPaso } from './SeleccionarCuidadorPaso'
import { ConfirmarPaseoPaso } from './ConfirmarPaseoPaso'

interface Props {
  visible: boolean
  onClose: () => void
  onConfirm?: () => void
  mascotasInicialesIds?: string[]
  reemplazarMascotasIniciales?: boolean
}

type Step =
  | 'SELECCIONAR_MASCOTA'
  | 'SELECCIONAR_DIRECCION'
  | 'SELECCIONAR_FECHA'
  | 'SELECCIONAR_CUIDADOR'
  | 'CONFIRMAR'

export const SolicitarPaseoModal = ({
  visible,
  onClose,
  onConfirm,
  mascotasInicialesIds,
  reemplazarMascotasIniciales,
}: Props) => {
  const [step, setStep] = useState<Step>('SELECCIONAR_MASCOTA')

  // State for flow data
  const [datosSolicitud, setDatosSolicitud] = useState({
    mascotaIds: [] as string[],
    direccionId: null as string | null,
    coordenadas: null as { latitude: number; longitude: number } | null,
    fecha: null as Date | null,
    hora: null as string | null,
    duracion: null as number | null,
    cuidadorId: null as string | null,
    horarioCuidador: null as { hora_inicio: string; hora_fin: string } | null,
    esCompartido: false,
    esSolicitudAbierta: false,
  })

  // ... resetFlow updates ...
  const resetFlow = () => {
    setStep('SELECCIONAR_MASCOTA')
    setDatosSolicitud({
      mascotaIds: [],
      direccionId: null,
      coordenadas: null,
      fecha: null,
      hora: null,
      duracion: null,
      cuidadorId: null,
      horarioCuidador: null,
      esCompartido: false,
      esSolicitudAbierta: false,
    })
  }

  // ... useEffect reset ...
  // If parent passes initial mascota ids, apply them when modal opens
  React.useEffect(() => {
    // Apply initial mascotas when modal opens.
    // If `reemplazarMascotasIniciales` is true, always replace; otherwise only apply when no prior selection.
    if (visible && mascotasInicialesIds && mascotasInicialesIds.length > 0) {
      if (
        reemplazarMascotasIniciales ||
        datosSolicitud.mascotaIds.length === 0
      ) {
        setDatosSolicitud(prev => ({
          ...prev,
          mascotaIds: mascotasInicialesIds,
        }))
      }
    }
  }, [visible, mascotasInicialesIds, reemplazarMascotasIniciales])

  const handlePetSelected = (mascotaIds: string[]) => {
    setDatosSolicitud(prev => ({ ...prev, mascotaIds }))
    setStep('SELECCIONAR_DIRECCION') // Go to Address
  }

  const handleAddressSelected = (direccionId: string, direccionObj?: any) => {
    setDatosSolicitud(prev => ({
      ...prev,
      direccionId,
      // Guardar coordenadas de la dirección seleccionada para búsqueda de cuidadores
      coordenadas: direccionObj?.coordenadas || null,
    }))
    setStep('SELECCIONAR_FECHA')
  }

  // ... existing handlers ...

  const handleDateSelected = (fecha: Date, hora: string, duracion: number) => {
    setDatosSolicitud(prev => {
      const changed =
        !prev.fecha ||
        prev.fecha.getTime() !== fecha.getTime() ||
        prev.hora !== hora ||
        prev.duracion !== duracion

      return {
        ...prev,
        fecha,
        hora,
        duracion,
        // Si cambió fecha/hora/duración, limpiar la selección de cuidador
        cuidadorId: changed ? null : prev.cuidadorId,
        horarioCuidador: changed ? null : prev.horarioCuidador,
      }
    })

    setStep('SELECCIONAR_CUIDADOR')
  }

  const handleWalkerSelected = (
    cuidadorId: string | null,
    horario?: { hora_inicio: string; hora_fin: string }
  ) => {
    const esAbierta =
      cuidadorId === null &&
      !!horario &&
      horario.hora_inicio === '05:00' &&
      horario.hora_fin === '23:00'

    setDatosSolicitud(prev => ({
      ...prev,
      cuidadorId,
      horarioCuidador: horario || null,
      esSolicitudAbierta: esAbierta,
    }))
    setStep('CONFIRMAR')
  }

  const handleConfirmacionFinal = () => {
    // Notificar al padre que se confirmó la creación del paseo
    if (typeof onConfirm === 'function') {
      try {
        onConfirm()
      } catch (_e) {
        // ignorar errores del callback del padre
      }
    }
    onClose()
    resetFlow()
  }

  const handleBack = (dataToSave?: Partial<typeof datosSolicitud>) => {
    if (dataToSave) {
      setDatosSolicitud(prev => ({ ...prev, ...dataToSave }))
    }

    switch (step) {
      case 'SELECCIONAR_DIRECCION':
        setStep('SELECCIONAR_MASCOTA')
        break
      case 'SELECCIONAR_FECHA':
        setStep('SELECCIONAR_DIRECCION') // Back to Address
        break
      case 'SELECCIONAR_CUIDADOR':
        setStep('SELECCIONAR_FECHA')
        break
      case 'CONFIRMAR':
        setStep('SELECCIONAR_CUIDADOR')
        break
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'SELECCIONAR_MASCOTA':
        return (
          <SeleccionarMascotaPaso
            mascotasInicialesIds={datosSolicitud.mascotaIds}
            onNext={handlePetSelected}
            onCancel={onClose}
          />
        )
      case 'SELECCIONAR_DIRECCION':
        return (
          <SeleccionarDireccionPaso
            direccionInicialId={datosSolicitud.direccionId}
            onNext={handleAddressSelected}
            onCancel={() => handleBack()}
          />
        )
      case 'SELECCIONAR_FECHA':
        return (
          <SeleccionarFechaPaso
            fechaInicial={datosSolicitud.fecha}
            horaInicial={datosSolicitud.hora}
            duracionInicial={datosSolicitud.duracion}
            onNext={handleDateSelected}
            onBack={() => handleBack()}
          />
        )
      case 'SELECCIONAR_CUIDADOR':
        return (
          <SeleccionarCuidadorPaso
            cuidadorInicialId={datosSolicitud.cuidadorId}
            horarioInicial={datosSolicitud.horarioCuidador || undefined}
            fecha={datosSolicitud.fecha!}
            hora={datosSolicitud.hora}
            duracion={datosSolicitud.duracion}
            coordenadas={datosSolicitud.coordenadas || undefined}
            onNext={handleWalkerSelected}
            onBack={() => handleBack()}
            onChangeFechaSuggested={f =>
              handleDateSelected(
                f,
                datosSolicitud.hora || '08:00',
                datosSolicitud.duracion || 60
              )
            }
          />
        )
      case 'CONFIRMAR':
        return (
          <ConfirmarPaseoPaso
            mascotaIds={datosSolicitud.mascotaIds}
            direccionId={datosSolicitud.direccionId}
            fecha={datosSolicitud.fecha}
            hora={datosSolicitud.hora}
            duracion={datosSolicitud.duracion}
            cuidadorId={datosSolicitud.cuidadorId}
            esCompartido={datosSolicitud.esCompartido}
            onCompartidoChange={val =>
              setDatosSolicitud(prev => ({ ...prev, esCompartido: val }))
            }
            onConfirm={handleConfirmacionFinal}
            onBack={() => handleBack()}
          />
        )
      default:
        return null
    }
  }

  // Map steps to index for indicator
  const stepsOrder: Step[] = [
    'SELECCIONAR_MASCOTA',
    'SELECCIONAR_DIRECCION',
    'SELECCIONAR_FECHA',
    'SELECCIONAR_CUIDADOR',
    'CONFIRMAR',
  ]
  // ...
  const currentStepIndex = stepsOrder.indexOf(step)
  const totalPasos = stepsOrder.length

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderContent()}

      <View style={styles.indicador}>
        {Array.from({ length: totalPasos }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.punto,
              index === currentStepIndex && styles.puntoActivo,
            ]}
          />
        ))}
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  indicador: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.BORDE,
  },
  puntoActivo: {
    backgroundColor: COLOR.PRIMARIO,
    width: 24,
  },
})
