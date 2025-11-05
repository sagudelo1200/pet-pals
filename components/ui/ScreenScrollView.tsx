import React from 'react'
import {
  ScrollView,
  ScrollViewProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScreenScrollViewProps extends ScrollViewProps {
  /** Espacio extra que se añade además del inset bottom (por ejemplo la altura del tab bar) */
  extraBottom?: number
  contentContainerStyle?: StyleProp<ViewStyle>
}

const ScreenScrollView: React.FC<ScreenScrollViewProps> = ({
  children,
  extraBottom,
  contentContainerStyle,
  ...rest
}) => {
  const insets = useSafeAreaInsets()

  const defaultExtra =
    typeof extraBottom === 'number'
      ? extraBottom
      : Platform.OS === 'ios'
        ? 81
        : 60

  const paddingBottom = (insets.bottom || 0) + defaultExtra

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      // Ponemos el padding calculado al final para que siempre sobrescriba
      // cualquier paddingBottom pasado en contentContainerStyle desde la pantalla.
      contentContainerStyle={[contentContainerStyle as any, { paddingBottom }]}
      {...rest}
    >
      {children}
    </ScrollView>
  )
}

export default ScreenScrollView
