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
  /** Incluir inset top (safe area) como padding-top en el SafeAreaView. Por defecto false */
  includeTopInset?: boolean
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  scrollProps,
  contentContainerStyle,
  style,
  disableDismiss = false,
  keyboardVerticalOffset,
  includeTopInset = false,
}) => {
  const insets = useSafeAreaInsets()

  const offset =
    typeof keyboardVerticalOffset === 'number'
      ? keyboardVerticalOffset
      : Platform.OS === 'ios'
        ? 80
        : 0

  const content = scroll ? (
    (() => {
      const defaultExtra = Platform.OS === 'ios' ? 81 : 60
      const paddingBottom = (insets.bottom || 0) + defaultExtra

      const mergedContentContainerStyle = Array.isArray(contentContainerStyle)
        ? [...(contentContainerStyle as any), { paddingBottom }]
        : [contentContainerStyle as any, { paddingBottom }]

      const defaultScrollProps: Partial<ScrollViewProps> = {
        showsVerticalScrollIndicator: false,
      }

      // Small top spacing when not using full safe-area inset
      // If includeTopInset is true we'll let SafeAreaView apply the top inset via edges
      const defaultTop = includeTopInset ? 0 : Platform.OS === 'ios' ? 16 : 12

      return (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={
            (Array.isArray(mergedContentContainerStyle)
              ? [
                  ...(mergedContentContainerStyle as any),
                  { paddingTop: defaultTop, flexGrow: 1 },
                ]
              : [
                  { ...(mergedContentContainerStyle as any) },
                  { paddingTop: defaultTop, flexGrow: 1 },
                ]) as any
          }
          {...defaultScrollProps}
          {...(scrollProps || {})}
        >
          {children}
        </ScrollView>
      )
    })()
  ) : (
    <View style={contentContainerStyle as any}>{children}</View>
  )

  const Wrapped = disableDismiss ? (
    content
  ) : (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      {content}
    </TouchableWithoutFeedback>
  )

  const safeAreaEdges = includeTopInset
    ? (['top', 'left', 'right', 'bottom'] as const)
    : (['left', 'right', 'bottom'] as const)

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[{ flex: 1, backgroundColor: COLOR.BASE }, style]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={offset}
        style={{ flex: 1 }}
      >
        {Wrapped}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Screen
