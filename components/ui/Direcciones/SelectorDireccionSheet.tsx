import React from 'react'
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants'
import { BottomSheet } from '../BottomSheet'
import Icon from '../Icon'
import Badge from '../Badge'
import Spacer from '../Spacer'
import { UbicacionRef } from '@/models/Ubicacion'

interface SelectorDireccionSheetProps {
  visible: boolean
  onClose: () => void
  direcciones: UbicacionRef[]
  principalId?: string
  alSeleccionar: (_ubicacion: UbicacionRef) => void
  onAgregarNueva: () => void
}

export const SelectorDireccionSheet: React.FC<SelectorDireccionSheetProps> = ({
  visible,
  onClose,
  direcciones,
  principalId,
  alSeleccionar,
  onAgregarNueva,
}) => {
  const renderItem = ({ item }: { item: UbicacionRef }) => {
    const esPrincipal = item.ubicacion_id === principalId
    const isHome = item.tipo === 'Casa'
    const isWork = item.tipo === 'Trabajo'
    const iconName = isHome ? 'home' : isWork ? 'briefcase' : 'map-marker'

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          esPrincipal && {
            borderColor: COLOR.PRIMARIO,
            backgroundColor: COLOR.BLOQUE,
          },
        ]}
        onPress={() => {
          alSeleccionar(item)
          onClose()
        }}
      >
        <View style={styles.iconBox}>
          <Icon
            name={iconName}
            size={24}
            color={esPrincipal ? COLOR.PRIMARIO : COLOR.SUBTEXTO}
          />
        </View>

        <View style={styles.infoBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.alias}>{item.tipo || 'Ubicación'}</Text>
            {esPrincipal && (
              <>
                <Spacer horizontal size={8} />
                <Badge label="Principal" variant="primario" size="sm" />
              </>
            )}
          </View>
          <Text style={styles.direccion} numberOfLines={1}>
            {/* UbicacionRef no tiene direccion_corta, usamos ID o placeholder por ahora */}
            {item.ubicacion_id}
          </Text>
        </View>

        <Icon name="chevron-right" size={20} color={COLOR.INACTIVO} />
      </TouchableOpacity>
    )
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} height={500}>
      <View style={styles.header}>
        <Text h5 bold color={COLOR.TEXTO}>
          ¿Dónde recogemos a tu mascota?
        </Text>
        <Text size={14} color={COLOR.SUBTEXTO}>
          Selecciona una dirección guardada
        </Text>
      </View>

      <FlatList
        data={direcciones}
        keyExtractor={item => item.ubicacion_id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="map-marker-off" size={40} color={COLOR.INACTIVO} />
            <Spacer size={12} />
            <Text color={COLOR.SUBTEXTO}>No tienes direcciones guardadas.</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnAdd} onPress={onAgregarNueva}>
          <Icon name="plus" size={20} color={COLOR.TEXTO} />
          <Spacer horizontal size={8} />
          <Text bold color={COLOR.TEXTO}>
            Agregar nueva dirección
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    marginBottom: 12,
    backgroundColor: COLOR.SECUNDARIO,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLOR.BASE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  infoBox: {
    flex: 1,
  },
  alias: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  direccion: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  footer: {
    marginTop: 10,
    marginBottom: 20,
  },
  btnAdd: {
    backgroundColor: COLOR.PRIMARIO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLOR.PRIMARIO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
})
