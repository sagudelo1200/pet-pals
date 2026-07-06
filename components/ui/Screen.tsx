import React from 'react'
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
  ScrollView,
  ScrollViewProps,
} from 'react-native'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'

interface ScreenProps {
  children: React.ReactNode
  /** Cuando es true, el contenido es scrollable (ScrollView) */
  scroll?: boolean
  /** Props a pasar al ScrollView interno cuando scroll=true */
  scrollProps?: Partial<ScrollViewProps>
  /** Estilo aplicado al contenedor (o contentContainerStyle si scroll=true) */
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  /** Deshabilitar el dismiss al tocar fuera */
  disableDismiss?: boolean
  /** Offset vertical para el KeyboardAvoidingView (opcional) */
  keyboardVerticalOffset?: number
  /** Componente flotante (ej: FAB) que se renderiza sobre el contenido y no hace scroll */
  floating?: React.ReactNode
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  scrollProps,
  contentContainerStyle,
  style,
  disableDismiss = false,
  keyboardVerticalOffset,
  floating,
}) => {
  const insets = useSafeAreaInsets()

  const offset =
    typeof keyboardVerticalOffset === 'number'
      ? keyboardVerticalOffset
      : Platform.OS === 'ios'
        ? 80
        : 0

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingBottom:
            (insets.bottom || 0) + (Platform.OS === 'ios' ? 81 : 60),
          flexGrow: 1,
        },
      ]}
      {...(scrollProps || {})}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentContainerStyle as any]}>{children}</View>
  )

  const Wrapped = disableDismiss ? (
    content
  ) : (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      {content}
    </TouchableWithoutFeedback>
  )

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[
        {
          flex: 1,
          backgroundColor: COLOR.BASE,
        },
        style,
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={offset}
        style={{ flex: 1 }}
      >
        {Wrapped}
        {floating}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Screen
