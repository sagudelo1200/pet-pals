import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Alert,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import {
  Screen,
  Fab,
  EmptyState,
  Icon,
  Skeleton,
  PetCard,
} from '@/components/ui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import type { Mascota as MascotaModel } from '@/models/Mascota'
import { useTranslation } from 'react-i18next'
import CrearMascota from './CrearMascota'

const Mascotas: React.FC = () => {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const [mascotas, setMascotas] = useState<MascotaModel[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showCrear, setShowCrear] = useState(false)
  const [editingPet, setEditingPet] = useState<MascotaModel | undefined>(
    undefined
  )

  const insets = useSafeAreaInsets()
  const fadeAnim = useRef(new Animated.Value(0)).current

  const tabBarHeight =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  // Restamos insets.bottom porque Screen ya aplica un SafeAreaView que añade ese padding
  // Si no lo restamos, se duplica el espacio (padding del Screen + altura del TabBar que incluye insets)
  const fabBottom = tabBarHeight - (insets.bottom || 0) + 16

  const fetchMascotas = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setCargando(true)
      setError(undefined)

      try {
        const user = ServicioAuth.obtenerUsuarioActual()
        if (!user) {
          setMascotas([])
          setError(t('comun:errores.NO_AUTENTICADO'))
          if (!isRefresh) setCargando(false)
          return
        }

        const res = await ServicioMascota.obtenerPorUsuario(user.uid)
        if (res.success) {
          setMascotas(res.data ?? [])

          // Animar fade-in de la lista
          if (!isRefresh) {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start()
          }
        } else {
          setError(res.error as string)
        }
      } catch (e) {
        setError(t('mascotas:errores.error_cargar'))
      } finally {
        if (!isRefresh) setCargando(false)
        setRefreshing(false)
      }
    },
    [t, fadeAnim]
  )

  useEffect(() => {
    void fetchMascotas()
  }, [fetchMascotas])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    void fetchMascotas(true)
  }, [fetchMascotas])

  const handleEliminar = async (pet: MascotaModel) => {
    Alert.alert(
      t('mascotas:confirmacion.eliminar_titulo', { nombre: pet.nombre }),
      t('mascotas:confirmacion.eliminar_mensaje', { nombre: pet.nombre }),
      [
        {
          text: t('mascotas:confirmacion.eliminar_cancelar'),
          style: 'cancel',
        },
        {
          text: t('mascotas:confirmacion.eliminar_confirmar'),
          style: 'destructive',
          onPress: async () => {
            const previous = mascotas
            setMascotas(prev => prev.filter(m => m.id !== pet.id))

            try {
              const res = await ServicioMascota.eliminar(pet.id)
              if (!res.success) {
                setMascotas(previous)
                Alert.alert('Error', t('mascotas:errores.error_eliminar'))
              }
            } catch (err) {
              setMascotas(previous)
              Alert.alert('Error', t('mascotas:errores.error_eliminar'))
            }
          },
        },
      ]
    )
  }

  const handleEditar = (pet: MascotaModel) => {
    setEditingPet(pet)
    setShowCrear(true)
  }

  const handleVerDetalles = (pet: MascotaModel) => {
    try {
      navigation.navigate('DetalleMascota', { id: pet.id })
    } catch (e) {
      // Si la ruta no existe, abrir en modo edición
      handleEditar(pet)
    }
  }

  const handleCrear = () => {
    setEditingPet(undefined)
    setShowCrear(true)
  }

  const handleCloseModal = () => {
    setShowCrear(false)
    setEditingPet(undefined)
  }

  const handleSaved = () => {
    setShowCrear(false)
    setEditingPet(undefined)
    void fetchMascotas()
  }

  return (
    <Screen
      scroll
      style={styles.container}
      contentContainerStyle={styles.content}
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLOR.ENFASIS}
            colors={[COLOR.ENFASIS]}
          />
        ),
      }}
      floating={
        <Fab
          onPress={handleCrear}
          iconName="plus"
          accessibilityLabel={t('mascotas:lista.agregar')}
          style={[styles.fab, { bottom: fabBottom }]}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('mascotas:lista.titulo')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleRefresh}
            style={styles.iconButton}
            accessibilityLabel={t('mascotas:lista.refrescar')}
            accessibilityRole="button"
            hitSlop={8}
            android_ripple={{ color: 'rgba(230,243,239,0.08)' }}
          >
            <Icon name="sync" size={18} />
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.section}>
          <Text style={{ color: COLOR.ERROR }}>{String(error)}</Text>
        </View>
      ) : null}

      {/* Lista de mascotas */}
      {cargando ? (
        <View style={styles.section}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonContent}>
                <Skeleton circle width={64} height={64} />
                <View style={styles.skeletonInfo}>
                  <Skeleton
                    width="60%"
                    height={20}
                    style={{ marginBottom: 8 }}
                  />
                  <Skeleton
                    width="40%"
                    height={14}
                    style={{ marginBottom: 8 }}
                  />
                  <Skeleton width="30%" height={14} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          {mascotas.length === 0 ? (
            <EmptyState
              title={t('mascotas:vacio.titulo')}
              description={t('mascotas:vacio.descripcion')}
              actionLabel={t('mascotas:vacio.accion_agregar')}
              onActionPress={handleCrear}
              iconName="paw"
              style={{ paddingVertical: 32 }}
            />
          ) : (
            <View style={styles.list}>
              {mascotas.map((pet, index) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onPress={() => handleVerDetalles(pet)}
                  onEdit={() => handleEditar(pet)}
                  onDelete={() => handleEliminar(pet)}
                  animationDelay={index * 80}
                  testID={`pet-card-${pet.id}`}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* Modal de crear/editar */}
      <CrearMascota
        visible={showCrear}
        onClose={handleCloseModal}
        onCreated={handleSaved}
        editingPet={editingPet}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    borderRadius: 20,
  },
  list: {
    width: '100%',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    zIndex: 99999,
    elevation: 100,
  },
  skeletonCard: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    marginBottom: 12,
    overflow: 'hidden',
  },
  skeletonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 12,
  },
})

export default Mascotas
