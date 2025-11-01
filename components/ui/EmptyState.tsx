import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'
import Button from './Button'

export interface EmptyStateProps {
  iconName?: React.ComponentProps<typeof Icon>['name']
  title: string
  description?: string
  actionLabel?: string
  onActionPress?: () => void
  style?: ViewStyle | ViewStyle[]
  testID?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'paw',
  title,
  description,
  actionLabel,
  onActionPress,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <Icon name={iconName} size={36} color={COLOR.ENFASIS} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onActionPress ? (
        <View style={{ marginTop: 16 }}>
          <Button
            title={actionLabel}
            onPress={onActionPress}
            variant="primario"
            style={{ paddingHorizontal: 12 }}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  iconWrap: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: COLOR.SECUNDARIO,
    marginBottom: 10,
  },
  title: {
    color: COLOR.TEXTO,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  desc: {
    color: COLOR.SUBTEXTO,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
})

export default EmptyState
