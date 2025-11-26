import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  height?: number | string
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = 'auto',
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (visible) {
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
      ]).start()
      // Reset keyboard height when modal closes
      setKeyboardHeight(0)
    }
  }, [visible])

  useEffect(() => {
    const handleKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height)
    }

    const handleKeyboardHide = () => {
      setKeyboardHeight(0)
    }

    // Use 'will' events on iOS for smoother animation, 'did' events on Android
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showListener = Keyboard.addListener(showEvent, handleKeyboardShow)
    const hideListener = Keyboard.addListener(hideEvent, handleKeyboardHide)

    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
            <Pressable style={styles.backdropPress} onPress={onClose} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: slideAnim }],
                paddingBottom:
                  (Platform.OS === 'ios' && keyboardHeight > 0
                    ? keyboardHeight
                    : 0) + 20,
                ...(typeof height === 'number'
                  ? { height }
                  : { maxHeight: '90%' }),
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.BLOQUE,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
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
