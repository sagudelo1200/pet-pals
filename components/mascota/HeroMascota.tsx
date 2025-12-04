import React from 'react'
import { View, Image, Pressable, Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'
import PerroSvg from '@/assets/imgs/undraw/perro.svg'

interface HeroMascotaProps {
  foto?: string
  isEditMode: boolean
  onChangePhoto: () => void
  panHandlers?: any
}

export const HeroMascota: React.FC<HeroMascotaProps> = ({
  foto,
  isEditMode,
  onChangePhoto,
  panHandlers,
}) => {
  return (
    <View style={styles.heroContainer} {...panHandlers}>
      {foto ? (
        <Image source={{ uri: foto }} style={styles.heroImage} />
      ) : (
        <View style={styles.placeholderHero}>
          <PerroSvg width="100%" height="100%" />
        </View>
      )}

      {isEditMode && (
        <Pressable
          style={({ pressed }) => [
            styles.changePhotoButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={onChangePhoto}
          hitSlop={20}
        >
          <Icon name="camera" size={20} color={COLOR.TEXTO} />
          <Text style={styles.changePhotoText}>Cambiar foto</Text>
        </Pressable>
      )}

      <View style={styles.heroOverlay} />
    </View>
  )
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderHero: {
    width: '100%',
    height: 250,
    backgroundColor: COLOR.BLOQUE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 21,
    paddingBottom: 21,
  },
  changePhotoButton: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    top: '40%',
  },
  changePhotoText: {
    color: COLOR.TEXTO,
    fontWeight: '600',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
})
