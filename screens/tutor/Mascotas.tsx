import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Text,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  Screen,
  EmptyState,
  Fab,
  PetCard,
  Button,
  Skeleton,
  ScreenHeader,
} from '@/components/ui'
import { useMascotas } from '@/hooks/useMascotas'
import { CrearMascotaFlow } from './CrearMascotaFlow'
import type { Mascota } from '@/models/Mascota'

export default function Mascotas({ navigation }: any) {
  const { t } = useTranslation()
  const { mascotas, loading, error, refrescar, crear } = useMascotas()
  const [modalVisible, setModalVisible] = useState(false)
  const [mascotaEditando, setMascotaEditando] = useState<Mascota | undefined>()
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!loading && mascotas.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start()
    }
  }, [loading, mascotas.length])

  // Refrescar lista cuando volvemos a esta pantalla desde DetalleMascota
  // Refrescar lista SOLO si hay cambios confirmados desde DetalleMascota
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // @ts-ignore
      const params = navigation
        .getState()
        // @ts-ignore
        .routes.find(r => r.name === 'Mascotas')?.params
      if (params?.refresh) {
        refrescar()
        // Limpiar params para evitar bucle infinito si se queda montado con params
        navigation.setParams({ refresh: undefined })
      }
      if (params?.openCreate) {
        handleAbrirCrear()
        navigation.setParams({ openCreate: undefined })
      }
    })
    return unsubscribe
  }, [navigation, refrescar])

  const handleAbrirCrear = () => {
    setMascotaEditando(undefined)
    setModalVisible(true)
  }

  const handleGuardar = async (data: Partial<Mascota>) => {
    await crear(data)
    setModalVisible(false)
  }

  const handleVerDetalle = (mascota: Mascota) => {
    // Serializar fechas para evitar warnings de navegación
    const mascotaSerializada = {
      ...mascota,
      fecha_nacimiento: mascota.fecha_nacimiento
        ? new Date(mascota.fecha_nacimiento as any).toISOString()
        : undefined,
      vacunas: mascota.vacunas?.map(v => ({
        ...v,
        fecha: v.fecha ? new Date(v.fecha as any).toISOString() : undefined,
      })),
      creado_en: mascota.creado_en
        ? new Date(mascota.creado_en as any).toISOString()
        : undefined,
      actualizado_en: mascota.actualizado_en
        ? new Date(mascota.actualizado_en as any).toISOString()
        : undefined,
    }

    navigation.navigate('DetalleMascota', {
      mascotaId: mascota.id!,
      mascota: mascotaSerializada as unknown as Mascota,
    })
  }

  const renderPetCard = ({ item, index }: { item: Mascota; index: number }) => {
    return (
      <PetCard
        pet={item}
        onPress={() => handleVerDetalle(item)}
        animationDelay={index * 100}
      />
    )
  }

  if (loading && mascotas.length === 0) {
    return (
      <Screen>
        <View style={styles.list}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width={64} height={64} radius={32} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="30%" height={14} />
              </View>
            </View>
          ))}
        </View>
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <Text
            style={{ color: COLOR.ERROR, fontSize: 16, textAlign: 'center' }}
          >
            {error}
          </Text>
          <Button
            title={t('comun:reintentar')}
            onPress={refrescar}
            style={{ marginTop: 20 }}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      contentContainerStyle={{ flex: 1 }}
      floating={<Fab onPress={handleAbrirCrear} style={styles.fab} />}
    >
      <ScreenHeader
        title={t('mascotas:lista.titulo')}
        subtitle={t('mascotas:lista.subtitulo')}
        showBack={false}
      />
      {mascotas.length === 0 ? (
        <EmptyState
          title={t('mascotas:vacio.titulo')}
          description={t('mascotas:vacio.subtitulo')}
          actionLabel={t('mascotas:vacio.boton')}
          onActionPress={handleAbrirCrear}
        />
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <FlatList
            data={mascotas}
            renderItem={renderPetCard}
            keyExtractor={item => item.id || ''}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refrescar}
                tintColor={COLOR.PRIMARIO}
                colors={[COLOR.PRIMARIO]}
              />
            }
          />
        </Animated.View>
      )}

      <CrearMascotaFlow
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGuardar={handleGuardar}
        mascotaInicial={mascotaEditando}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  list: {
    padding: 15,
    gap: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 21,
    zIndex: 1000,
    elevation: 9,
  },
  skeletonCard: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
})
