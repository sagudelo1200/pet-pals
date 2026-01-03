import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants'
import Icon from '../Icon'
import { UbicacionRef } from '@/models/Ubicacion'
import { useTranslation } from 'react-i18next'

interface Props {
  ubicacion: UbicacionRef
  seleccionada?: boolean
  onPress: () => void
  style?: any
}

export const UbicacionHorizontal: React.FC<Props> = ({
  ubicacion,
  seleccionada = false,
  onPress,
  style,
}) => {
  const { t } = useTranslation()
  const getIconName = () => {
    const aliasLower = ubicacion.alias?.toLowerCase() || ''
    if (aliasLower.includes('casa') || aliasLower.includes('home'))
      return 'home'
    if (
      aliasLower.includes('trabajo') ||
      aliasLower.includes('work') ||
      aliasLower.includes('oficina')
    )
      return 'briefcase'
    if (aliasLower.includes('parque') || aliasLower.includes('park'))
      return 'tree'
    return 'map-marker-alt'
  }

  return (
    <TouchableOpacity
      style={[styles.container, seleccionada && styles.selected, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, seleccionada && styles.iconSelected]}>
        <Icon
          name={getIconName()}
          size={20}
          color={seleccionada ? COLOR.BASE : COLOR.PRIMARIO}
        />
      </View>

      <View style={styles.textContainer}>
        <Text
          bold
          size={12}
          color={seleccionada ? COLOR.PRIMARIO : COLOR.TEXTO}
          numberOfLines={1}
          style={{ textAlign: 'center', marginBottom: 2 }}
        >
          {ubicacion.alias || t('tutor:solicitud.direccion.tipo_default')}
        </Text>
        <Text
          size={10}
          color={COLOR.SUBTEXTO}
          numberOfLines={1}
          style={{ textAlign: 'center' }}
        >
          {ubicacion.ubicacion_id
            ? ubicacion.ubicacion_id.slice(0, 15) + '...'
            : t('tutor:solicitud.direccion.ver_en_mapa')}
        </Text>
      </View>

      {seleccionada && (
        <View style={styles.checkBadge}>
          <Icon name="check" size={10} color={COLOR.BASE} />
        </View>
      )}
    </TouchableOpacity>
  )
}

// Botón especial para "Agregar Nueva"
export const AgregarUbicacionHorizontal: React.FC<{
  onPress: () => void
  style?: any
}> = ({ onPress, style }) => {
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      style={[styles.container, styles.addContainer, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, styles.addIconContainer]}>
        <Icon name="plus" size={20} color={COLOR.TEXTO} />
      </View>
      <View style={styles.textContainer}>
        <Text
          bold
          size={12}
          color={COLOR.TEXTO}
          style={{ textAlign: 'center' }}
        >
          {t('tutor:solicitud.direccion.nueva_btn')}
        </Text>
        <Text size={10} color={COLOR.SUBTEXTO} style={{ textAlign: 'center' }}>
          {t('tutor:solicitud.direccion.direccion_btn')}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 110,
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  selected: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: 'rgba(29, 143, 115, 0.1)', // Tint suave
  },
  addContainer: {
    borderStyle: 'dashed',
    borderColor: COLOR.SUBTEXTO,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLOR.BLOQUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconSelected: {
    backgroundColor: COLOR.PRIMARIO,
  },
  addIconContainer: {
    backgroundColor: COLOR.BORDE,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLOR.PRIMARIO,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOR.BASE,
  },
})
