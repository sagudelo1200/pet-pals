import React from 'react'
import { View, StyleSheet, Pressable, Image, Text } from 'react-native'
import { COLOR } from '@/constants'
import Icon from './Icon'

interface PetAvatarProps {
  uri?: string
  size?: 'tiny' | 'small' | 'medium' | 'large'
  editable?: boolean
  onPress?: () => void
}

const SIZES = {
  tiny: 32,
  small: 48,
  medium: 80,
  large: 120,
}

export const PetAvatar: React.FC<PetAvatarProps> = ({
  uri,
  size = 'medium',
  editable = false,
  onPress,
}) => {
  const avatarSize = SIZES[size]

  const content = (
    <View style={{ width: avatarSize, height: avatarSize }}>
      <View
        style={[
          styles.container,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.image,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="paw" size={avatarSize * 0.4} color={COLOR.SUBTEXTO} />
          </View>
        )}
      </View>

      {editable && (
        <View style={styles.editBadge}>
          <Icon
            name="camera"
            size={size === 'large' ? 20 : 16}
            color={COLOR.TEXTO}
          />
        </View>
      )}
    </View>
  )

  if (editable && onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
        {!uri && <Text style={styles.editText}>Tocar para agregar foto</Text>}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
  },
  container: {
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 2,
    borderColor: COLOR.BORDE,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLOR.PRIMARIO,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLOR.SECUNDARIO,
  },
  editText: {
    marginTop: 8,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
})
