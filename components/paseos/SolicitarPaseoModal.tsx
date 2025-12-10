import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { BottomSheet } from '../ui'
import { SeleccionarMascotaPaso } from './SeleccionarMascotaPaso'
import { FechaHoraPaso } from './FechaHoraPaso'

import { SeleccionarCuidadorPaso } from './SeleccionarCuidadorPaso'

import { ConfirmarPaseoPaso } from './ConfirmarPaseoPaso'

interface Props {
  visible: boolean
  onClose: () => void
}

type Step =
  | 'SELECCIONAR_MASCOTA'
  | 'FECHA_HORA'
  | 'SELECCIONAR_CUIDADOR'
  | 'CONFIRMAR'

export const SolicitarPaseoModal = ({ visible, onClose }: Props) => {
  const [step, setStep] = useState<Step>('SELECCIONAR_MASCOTA')

  // State for flow data
  const [requestData, setRequestData] = useState({
    petIds: [] as string[],
    fecha: null as Date | null,
    hora: null as string | null,
    duracion: null as number | null,
    walkerId: null as string | null,
    esCompartido: false,
  })

  // Reset function to clear state when flow ends
  const resetFlow = () => {
    setStep('SELECCIONAR_MASCOTA')
    setRequestData({
      petIds: [],
      fecha: null,
      hora: null,
      duracion: null,
      walkerId: null,
      esCompartido: false,
    })
  }

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!visible) {
      resetFlow()
    }
  }, [visible])

  const handlePetSelected = (petIds: string[]) => {
    setRequestData(prev => ({ ...prev, petIds }))
    setStep('FECHA_HORA')
  }

  const handleDateTimeSelected = (data: {
    fecha: Date
    hora: string
    duracion: number
  }) => {
    setRequestData(prev => ({
      ...prev,
      fecha: data.fecha,
      hora: data.hora,
      duracion: data.duracion,
    }))
    setStep('SELECCIONAR_CUIDADOR')
  }

  const handleWalkerSelected = (walkerId: string) => {
    setRequestData(prev => ({ ...prev, walkerId }))
    setStep('CONFIRMAR')
  }

  const handleConfirmacionFinal = () => {
    onClose()
    resetFlow()
  }

  const handleBack = (dataToSave?: Partial<typeof requestData>) => {
    if (dataToSave) {
      setRequestData(prev => ({ ...prev, ...dataToSave }))
    }

    if (step === 'FECHA_HORA') {
      setStep('SELECCIONAR_MASCOTA')
    } else if (step === 'SELECCIONAR_CUIDADOR') {
      setStep('FECHA_HORA')
    } else if (step === 'CONFIRMAR') {
      setStep('SELECCIONAR_CUIDADOR')
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'SELECCIONAR_MASCOTA':
        return (
          <SeleccionarMascotaPaso
            initialSelectedIds={requestData.petIds}
            onNext={handlePetSelected}
            onCancel={onClose}
          />
        )
      case 'FECHA_HORA':
        return (
          <FechaHoraPaso
            initialDate={requestData.fecha}
            initialTime={requestData.hora}
            initialDuration={requestData.duracion}
            onNext={handleDateTimeSelected}
            onBack={data => handleBack(data)}
          />
        )
      case 'SELECCIONAR_CUIDADOR':
        return (
          <SeleccionarCuidadorPaso
            initialWalkerId={requestData.walkerId}
            fecha={requestData.fecha}
            hora={requestData.hora}
            onNext={handleWalkerSelected}
            onBack={walkerId => handleBack({ walkerId: walkerId || null })}
          />
        )
      case 'CONFIRMAR':
        return (
          <ConfirmarPaseoPaso
            petIds={requestData.petIds}
            fecha={requestData.fecha}
            hora={requestData.hora}
            duracion={requestData.duracion}
            walkerId={requestData.walkerId}
            esCompartido={requestData.esCompartido}
            onCompartidoChange={value =>
              setRequestData(prev => ({ ...prev, esCompartido: value }))
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
    'FECHA_HORA',
    'SELECCIONAR_CUIDADOR',
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
