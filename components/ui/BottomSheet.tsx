import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  height?: number | string
  showBackdrop?: boolean
  closeable?: boolean
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = 'auto',
  showBackdrop = true,
  closeable = true,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [showModal, setShowModal] = useState(visible)

  useEffect(() => {
    if (visible) {
      setShowModal(true)
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 45,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false)
      })
    }
  }, [visible])

  const handleClose = () => {
    if (closeable) onClose()
  }

  const dynamicSheetStyle: ViewStyle = {
    transform: [{ translateY: slideAnim as any }],
  }

  if (height && height !== 'auto') {
    dynamicSheetStyle.height = height as any
  } else {
    dynamicSheetStyle.maxHeight = '90%'
  }

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: opacityAnim },
            !showBackdrop && { backgroundColor: 'transparent' },
          ]}
          pointerEvents={showBackdrop ? 'auto' : 'none'}
        >
          <Pressable style={styles.backdropPress} onPress={handleClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 45}
        >
          <Animated.View style={[styles.sheet, dynamicSheetStyle]}>
            <SafeAreaView edges={['bottom']} style={styles.safeArea}>
              <View style={styles.handle} />
              <View style={styles.content}>{children}</View>
              <View style={{ height: Platform.OS === 'ios' ? 45 : 63 }} />
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLOR.SECUNDARIO,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLOR.BORDE,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
})
