import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { BottomSheet } from '@/components/ui'
import { SeleccionarMascotaPaso } from './SeleccionarMascotaPaso'
import { SeleccionarDireccionPaso } from './SeleccionarDireccionPaso'
import { SeleccionarFechaPaso } from './SeleccionarFechaPaso'
import { SeleccionarHoraPaso } from './SeleccionarHoraPaso'
import { SeleccionarCuidadorPaso } from './SeleccionarCuidadorPaso'
import { ConfirmarPaseoPaso } from './ConfirmarPaseoPaso'

interface Props {
  visible: boolean
  onClose: () => void
  onConfirm?: () => void
}

type Step =
  | 'SELECCIONAR_MASCOTA'
  | 'SELECCIONAR_DIRECCION' // New Step
  | 'SELECCIONAR_FECHA'
  | 'SELECCIONAR_CUIDADOR'
  | 'SELECCIONAR_HORA'
  | 'CONFIRMAR'

export const SolicitarPaseoModal = ({ visible, onClose, onConfirm }: Props) => {
  const [step, setStep] = useState<Step>('SELECCIONAR_MASCOTA')

  // State for flow data
  const [datosSolicitud, setDatosSolicitud] = useState({
    mascotaIds: [] as string[],
    direccionId: null as string | null, // New field
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

  const handlePetSelected = (mascotaIds: string[]) => {
    setDatosSolicitud(prev => ({ ...prev, mascotaIds }))
    setStep('SELECCIONAR_DIRECCION') // Go to Address
  }

  const handleAddressSelected = (direccionId: string, _direccionObj?: any) => {
    setDatosSolicitud(prev => ({ ...prev, direccionId }))
    setStep('SELECCIONAR_FECHA')
  }

  // ... existing handlers ...

  const handleDateSelected = (fecha: Date, duracion: number) => {
    setDatosSolicitud(prev => {
      const fechaPrev = prev.fecha
      const fechaChanged = !fechaPrev || fechaPrev.getTime() !== fecha.getTime()

      return {
        ...prev,
        fecha,
        duracion,
        // Si la fecha cambió, limpiar la selección de cuidador y su horario
        cuidadorId: fechaChanged ? null : prev.cuidadorId,
        horarioCuidador: fechaChanged ? null : prev.horarioCuidador,
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
    setStep('SELECCIONAR_HORA')
  }

  const handleTimeSelected = (hora: string) => {
    setDatosSolicitud(prev => ({
      ...prev,
      hora,
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
      case 'SELECCIONAR_HORA':
        setStep('SELECCIONAR_CUIDADOR')
        break
      case 'CONFIRMAR':
        setStep('SELECCIONAR_HORA')
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
            onNext={handleWalkerSelected}
            onBack={() => handleBack()}
            onChangeFechaSuggested={f =>
              handleDateSelected(f, datosSolicitud.duracion || 60)
            }
          />
        )
      case 'SELECCIONAR_HORA':
        return (
          <SeleccionarHoraPaso
            horaInicial={datosSolicitud.hora}
            horaMinima={datosSolicitud.horarioCuidador?.hora_inicio}
            horaMaxima={datosSolicitud.horarioCuidador?.hora_fin}
            onNext={handleTimeSelected}
            onBack={() => handleBack()}
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
    'SELECCIONAR_HORA',
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
