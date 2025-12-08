import React from 'react'
import { StyleSheet, View } from 'react-native'
import { PetAvatar } from './PetAvatar'
import { COLOR } from '@/constants'

interface AvatarGroupProps {
  uris: string[]
  max?: number
  size?: 'small' | 'medium'
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ 
  uris, 
  max = 4, 
  size = 'small' 
}) => {
  const displayUris = uris.slice(0, max)
  const avatarSize = size === 'small' ? 48 : 80
  // Overlap amount: 50% overlap
  const overlap = size === 'small' ? -24 : -40 

  return (
    <View style={styles.container}>
      {displayUris.map((uri, index) => (
        <View 
          key={index} 
          style={[
            styles.avatarWrapper, 
            { 
               zIndex: displayUris.length - index,
               marginLeft: index === 0 ? 0 : overlap 
            }
          ]}
        >
          <PetAvatar uri={uri} size={size} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    // Optional: Add outline to separate overlapping avatars visually
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLOR.BASE, 
  }
})
