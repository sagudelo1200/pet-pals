import React from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { COLOR } from '@/constants'

/**
 * Props de la tarjeta contenedora
 */
export interface CardProps {
  children?: React.ReactNode
  title?: string
  subtitle?: string
  right?: React.ReactNode
  footer?: React.ReactNode
  onPress?: () => void
  style?: ViewStyle | ViewStyle[]
  headerStyle?: ViewStyle | ViewStyle[]
  titleStyle?: TextStyle | TextStyle[]
  subtitleStyle?: TextStyle | TextStyle[]
  contentStyle?: ViewStyle | ViewStyle[]
  elevated?: boolean
  outlined?: boolean
  padding?: number
  testID?: string
}

/**
 * Card: contenedor con cabecera opcional (título/subtítulo/right) y footer.
 * - Puede ser clickable (onPress) o estático.
 */
const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  right,
  footer,
  onPress,
  style,
  headerStyle,
  titleStyle,
  subtitleStyle,
  contentStyle,
  elevated = true,
  outlined,
  padding = 16,
  testID,
}) => {
  const Container: any = onPress ? Pressable : View

  const containerStyles: ViewStyle | ViewStyle[] = [
    styles.base,
    elevated && styles.elevated,
    outlined && styles.outlined,
    { padding },
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ]

  const showHeader = !!(title || subtitle || right)

  return (
    <Container testID={testID} onPress={onPress} style={containerStyles}>
      {showHeader && (
        <View style={[styles.header, headerStyle] as any}>
          <View style={styles.headerText}>
            {title ? (
              <Text style={[styles.title, titleStyle]}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitle, subtitleStyle]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      )}

      {children ? <View style={contentStyle}>{children}</View> : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Container>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 10,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  outlined: {
    elevation: 0,
    shadowOpacity: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: COLOR.TEXTO,
    fontWeight: '700',
    fontSize: 16,
  },
  subtitle: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 12,
  },
})

export default Card
