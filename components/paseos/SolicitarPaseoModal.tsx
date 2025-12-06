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

type Step = 'SELECT_PET' | 'DATE_TIME' | 'SELECT_WALKER' | 'CONFIRM'

export const SolicitarPaseoModal = ({ visible, onClose }: Props) => {
  const [step, setStep] = useState<Step>('SELECT_PET')
  
  // State for flow data
  const [requestData, setRequestData] = useState({
    petIds: [] as string[],
    fecha: null as Date | null,
    hora: null as string | null,
    walkerId: null as string | null,
  })

  // Reset function to clear state when flow ends
  const resetFlow = () => {
    setStep('SELECT_PET')
    setRequestData({
      petIds: [],
      fecha: null,
      hora: null,
      walkerId: null,
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
    setStep('DATE_TIME')
  }

  const handleDateTimeSelected = (data: { fecha: Date; hora: string }) => {
    setRequestData(prev => ({ ...prev, fecha: data.fecha, hora: data.hora }))
    setStep('SELECT_WALKER')
  }

  const handleWalkerSelected = (walkerId: string) => {
    setRequestData(prev => ({ ...prev, walkerId }))
    setStep('CONFIRM')
  }

  const handleConfirmacionFinal = () => {
    onClose()
    resetFlow()
  }

  const handleBack = (dataToSave?: Partial<typeof requestData>) => {
    if (dataToSave) {
      setRequestData(prev => ({ ...prev, ...dataToSave }))
    }

    if (step === 'DATE_TIME') {
      setStep('SELECT_PET')
    } else if (step === 'SELECT_WALKER') {
      setStep('DATE_TIME')
    } else if (step === 'CONFIRM') {
      setStep('SELECT_WALKER')
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'SELECT_PET':
        return (
          <SeleccionarMascotaPaso
            initialSelectedIds={requestData.petIds}
            onNext={handlePetSelected}
            onCancel={onClose}
          />
        )
      case 'DATE_TIME':
        return (
          <FechaHoraPaso
            initialDate={requestData.fecha}
            initialTime={requestData.hora}
            onNext={handleDateTimeSelected}
            onBack={(data) => handleBack(data)}
          />
        )
      case 'SELECT_WALKER':
        return (
          <SeleccionarCuidadorPaso
            initialWalkerId={requestData.walkerId}
            onNext={handleWalkerSelected}
            onBack={(walkerId) => handleBack({ walkerId: walkerId || null })}
          />
        )
      case 'CONFIRM':
        return (
          <ConfirmarPaseoPaso
            petIds={requestData.petIds}
            fecha={requestData.fecha}
            hora={requestData.hora}
            walkerId={requestData.walkerId}
            onConfirm={handleConfirmacionFinal}
            onBack={handleBack}
          />
        )
      default:
        return <View />
    }
  }

  // Map steps to index for indicator
  const stepsOrder: Step[] = ['SELECT_PET', 'DATE_TIME', 'SELECT_WALKER', 'CONFIRM']
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
