import React from 'react'
import { Modal, View, StyleSheet, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'
import { useMonitorPaseoGlobal } from '@/hooks/paseos/useMonitorPaseoGlobal'

export const GlobalPaseoManager = () => {
  const { showFinishedModal, paseo, handleClose } = useMonitorPaseoGlobal()

  if (!showFinishedModal || !paseo) return null

  return (
    <Modal
      transparent
      visible={showFinishedModal}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={styles.androidDim} />
        )}
        
        <View style={styles.modalContent}>
          <PaseoFinalizadoCard
            mascotaNombre={paseo.tutor?.nombre || 'Tu mascota'}
            cuidadorNombre={paseo.cuidador?.nombre || 'El cuidador'}
            onClose={handleClose}
            onRate={(r) => console.log('Rating:', r)}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  androidDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
  }
})
