import React from 'react'
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  style?: ViewStyle
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  style,
}) => {
  const navigation = useNavigation()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigation.goBack()
    }
  }

  return (
    <View style={[styles.container, style]}>
      {showBack && (
        <View style={styles.leftContainer}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
          </Pressable>
        </View>
      )}

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>{rightAction}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLOR.BASE,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  leftContainer: {
    marginRight: 12,
    alignItems: 'flex-start',
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLOR.TEXTO,
    textAlign: 'left',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'left',
    marginTop: 2,
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
  },
})

export default ScreenHeader
