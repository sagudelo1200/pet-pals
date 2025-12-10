import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { BottomSheet } from '../ui'
import { SeleccionarMascotaPaso } from './SeleccionarMascotaPaso'
import { SeleccionarFechaPaso } from './SeleccionarFechaPaso'
import { SeleccionarHoraPaso } from './SeleccionarHoraPaso'
import { SeleccionarCuidadorPaso } from './SeleccionarCuidadorPaso'
import { ConfirmarPaseoPaso } from './ConfirmarPaseoPaso'

interface Props {
  visible: boolean
  onClose: () => void
}

type Step =
  | 'SELECCIONAR_MASCOTA'
  | 'SELECCIONAR_FECHA'
  | 'SELECCIONAR_CUIDADOR'
  | 'SELECCIONAR_HORA'
  | 'CONFIRMAR'

export const SolicitarPaseoModal = ({ visible, onClose }: Props) => {
  const [step, setStep] = useState<Step>('SELECCIONAR_MASCOTA')

  // State for flow data
  const [datosSolicitud, setDatosSolicitud] = useState({
    mascotaIds: [] as string[],
    fecha: null as Date | null,
    hora: null as string | null,
    duracion: null as number | null,
    cuidadorId: null as string | null,
    horarioCuidador: null as { hora_inicio: string; hora_fin: string } | null,
    esCompartido: false,
  })

  // Reset function to clear state when flow ends
  const resetFlow = () => {
    setStep('SELECCIONAR_MASCOTA')
    setDatosSolicitud({
      mascotaIds: [],
      fecha: null,
      hora: null,
      duracion: null,
      cuidadorId: null,
      horarioCuidador: null,
      esCompartido: false,
    })
  }

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!visible) {
      resetFlow()
    }
  }, [visible])

  const handlePetSelected = (mascotaIds: string[]) => {
    setDatosSolicitud(prev => ({ ...prev, mascotaIds }))
    setStep('SELECCIONAR_FECHA')
  }

  const handleDateSelected = (fecha: Date) => {
    setDatosSolicitud(prev => ({ ...prev, fecha }))
    setStep('SELECCIONAR_CUIDADOR')
  }

  const handleWalkerSelected = (
    cuidadorId: string,
    horario?: { hora_inicio: string; hora_fin: string }
  ) => {
    setDatosSolicitud(prev => ({
      ...prev,
      cuidadorId,
      horarioCuidador: horario || null,
    }))
    setStep('SELECCIONAR_HORA')
  }

  const handleTimeSelected = (data: { hora: string; duracion: number }) => {
    setDatosSolicitud(prev => ({
      ...prev,
      hora: data.hora,
      duracion: data.duracion,
    }))
    setStep('CONFIRMAR')
  }

  const handleConfirmacionFinal = () => {
    onClose()
    resetFlow()
  }

  const handleBack = (dataToSave?: Partial<typeof datosSolicitud>) => {
    if (dataToSave) {
      setDatosSolicitud(prev => ({ ...prev, ...dataToSave }))
    }

    switch (step) {
      case 'SELECCIONAR_FECHA':
        setStep('SELECCIONAR_MASCOTA')
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
      case 'SELECCIONAR_FECHA':
        return (
          <SeleccionarFechaPaso
            fechaInicial={datosSolicitud.fecha}
            onNext={handleDateSelected}
            onBack={() => handleBack()}
          />
        )
      case 'SELECCIONAR_CUIDADOR':
        return (
          <SeleccionarCuidadorPaso
            cuidadorInicialId={datosSolicitud.cuidadorId}
            fecha={datosSolicitud.fecha}
            onNext={handleWalkerSelected}
            onBack={cuidadorId =>
              handleBack({ cuidadorId: cuidadorId || null })
            }
          />
        )
      case 'SELECCIONAR_HORA':
        return (
          <SeleccionarHoraPaso
            horaInicial={datosSolicitud.hora}
            duracionInicial={datosSolicitud.duracion}
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
            fecha={datosSolicitud.fecha}
            hora={datosSolicitud.hora}
            duracion={datosSolicitud.duracion}
            cuidadorId={datosSolicitud.cuidadorId}
            esCompartido={datosSolicitud.esCompartido}
            onCompartidoChange={value =>
              setDatosSolicitud(prev => ({ ...prev, esCompartido: value }))
            }
            onConfirm={handleConfirmacionFinal}
            onBack={handleBack}
          />
        )
      default:
        return <View />
    }
  }

  // Map steps to index for indicator
  const stepsOrder: Step[] = [
    'SELECCIONAR_MASCOTA',
    'SELECCIONAR_FECHA',
    'SELECCIONAR_CUIDADOR',
    'SELECCIONAR_HORA',
    'CONFIRMAR',
  ]
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
