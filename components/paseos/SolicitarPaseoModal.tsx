import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { BottomSheet } from '../ui'
import { SeleccionarMascotaPaso } from './SeleccionarMascotaPaso'
import { FechaHoraPaso } from './FechaHoraPaso'

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
  })

  // Reset steps on close/open if needed, OR keep state?
  // User didn't specify, but typically we reset if closed.
  // We'll leave as is for now.

  const handlePetSelected = (petIds: string[]) => {
    setRequestData(prev => ({ ...prev, petIds }))
    setStep('DATE_TIME')
  }

  const handleDateTimeSelected = (data: { fecha: Date; hora: string }) => {
    setRequestData(prev => ({ ...prev, fecha: data.fecha, hora: data.hora }))
    // Next step: Select Walker (not implemented yet)
    console.log('Date/Time selected:', data)
  }

  const handleBack = () => {
    if (step === 'DATE_TIME') {
      setStep('SELECT_PET')
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'SELECT_PET':
        return (
          <SeleccionarMascotaPaso
            onNext={handlePetSelected}
            onCancel={onClose}
          />
        )
      case 'DATE_TIME':
        return (
          <FechaHoraPaso
            onNext={handleDateTimeSelected}
            onBack={handleBack}
          />
        )
      default:
        return <View />
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderContent()}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  // BottomSheet handles its own container styles, we just provide content.
})
