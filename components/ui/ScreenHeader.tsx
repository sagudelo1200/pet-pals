import React from 'react'
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface ScreenHeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
  style?: ViewStyle
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
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
      <View style={styles.leftContainer}>
        {showBack ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightContainer}>
        {rightAction ? rightAction : <View style={styles.placeholder} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
})

export default ScreenHeader
