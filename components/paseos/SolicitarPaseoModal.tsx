import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
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

  const handleBack = () => {
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
      case 'SELECT_WALKER':
        return (
          <SeleccionarCuidadorPaso
            onNext={handleWalkerSelected}
            onBack={handleBack}
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

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {renderContent()}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  // BottomSheet handles its own container styles, we just provide content.
})
