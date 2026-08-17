import React from 'react'
import { Modal, View, StyleSheet, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { PaseoFinalizadoCard } from '@/components/paseos/PaseoFinalizadoCard'
import { useMonitorPaseoGlobal } from '@/hooks/paseos/useMonitorPaseoGlobal'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '@/context/AuthContext'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { TutorTabParamList } from '@/navigation/types'

export const GlobalPaseoManager = () => {
  const { showFinishedModal, paseo, handleClose } = useMonitorPaseoGlobal()
  const navigation = useNavigation<BottomTabNavigationProp<TutorTabParamList>>()
  const { rolActivo } = useAuth()

  const onClose = async () => {
    try {
      await handleClose()
    } catch (_e) {
      // ignore errors from handleClose; still navigate
    }
    // Llevar al usuario a la pestaña Inicio (Dashboard)
    try {
      navigation.navigate('Inicio')
    } catch (_e) {
      // ignore navigation errors in case context differs
    }
  }

  if (!showFinishedModal || !paseo || !rolActivo) return null

  return (
    <Modal
      transparent
      visible={showFinishedModal}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
        ) : (
          <View style={styles.androidDim} />
        )}

        <View style={styles.modalContent}>
          {/* Tutor: Calificar al cuidador */}
          {rolActivo === 'tutor' && (
            <PaseoFinalizadoCard
              mascotaNombre={paseo.tutor?.nombre || 'Tu mascota'}
              cuidadorNombre={paseo.cuidador?.nombre || 'El cuidador'}
              onClose={onClose}
              onRate={r => console.log('Rating:', r)}
            />
          )}

          {/* Cuidador: Mostrar resumen diferente */}
          {rolActivo === 'cuidador' && (
            <PaseoFinalizadoCard
              mascotaNombre={paseo.tutor?.nombre || 'Tu mascota'}
              cuidadorNombre={paseo.cuidador?.nombre || 'El cuidador'}
              onClose={onClose}
              onRate={r => console.log('Rating:', r)}
            />
          )}
          {/* TODO: Reemplazar con componente para cuidador cuando esté disponible */}
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
  },
})
