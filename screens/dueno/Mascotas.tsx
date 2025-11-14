import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import Fab from '@/components/ui/Fab'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import Avatar from '@/components/ui/Avatar'
import LoadingScreen from '@/components/ui/LoadingScreen'
import { ServicioMascota, ServicioAuth } from '@/services/firebase'
import type { Mascota as MascotaModel } from '@/models/Mascota'
import CrearMascota from './CrearMascota'

const Mascotas: React.FC = () => {
  const navigation = useNavigation<any>()
  const [mascotas, setMascotas] = useState<MascotaModel[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  const [error, setError] = useState<string | undefined>(undefined)

  const fetchMascotas = useCallback(async () => {
    setCargando(true)
    setError(undefined)
    try {
      const user = ServicioAuth.obtenerUsuarioActual()
      if (!user) {
        setMascotas([])
        setError('No autenticado')
        setCargando(false)
        return
      }

      const res = await ServicioMascota.obtenerPorUsuario(user.uid)
      if (res.success) {
        setMascotas(res.data ?? [])
      } else {
        setError(res.error as string)
      }
    } catch (e) {
      setError('ERROR_DESCONOCIDO')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void fetchMascotas()
  }, [fetchMascotas])

  const handleEliminar = async (id: string) => {
    Alert.alert('Eliminar mascota', '¿Confirmas eliminar esta mascota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const previous = mascotas
          setMascotas(prev => prev.filter(m => m.id !== id))
          setCargando(true)
          try {
            const res = await ServicioMascota.eliminar(id)
            if (!res.success) {
              // revertir y mostrar error
              setMascotas(previous)
              Alert.alert('Error', String(res.error))
            }
          } catch (err) {
            setMascotas(previous)
            Alert.alert('Error', 'No se pudo eliminar la mascota')
          } finally {
            setCargando(false)
          }
        },
      },
    ])
  }

  const handleEditar = (id: string) => {
    // navegar a pantalla de edición (si está registrada en la navegación)
    // usa nombre de screen "EditarMascota" que implementaremos luego
    try {
      navigation.navigate('EditarMascota', { id })
    } catch (e) {
      Alert.alert('Editar', `Abrir editor para mascota ${id}`)
    }
  }

  const handleCrear = () => {
    setShowCrear(true)
  }

  const [showCrear, setShowCrear] = useState(false)
  const insets = useSafeAreaInsets()

  if (cargando) return <LoadingScreen messageType="mascota" />

  return (
    <Screen
      scroll
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mascotas</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => void fetchMascotas()}
            style={styles.iconButton}
            accessibilityLabel="Refrescar"
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

      <View style={styles.section}>
        {mascotas.length === 0 ? (
          <Text style={{ color: COLOR.SUBTEXTO }}>
            No hay mascotas registradas.
          </Text>
        ) : (
          <View style={styles.grid}>
            {mascotas.map(m => (
              <Card
                key={m.id}
                title={m.nombre}
                subtitle={m.especie}
                style={[styles.card, !m.activo ? styles.cardInactive : null]}
                right={
                  <View style={styles.iconActions}>
                    <Pressable
                      onPress={() => handleEditar(m.id)}
                      style={styles.iconButton}
                      accessibilityLabel={`Editar ${m.nombre}`}
                      android_ripple={{ color: 'rgba(230,243,239,0.08)' }}
                    >
                      <Icon name="edit" size={18} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleEliminar(m.id)}
                      style={styles.iconButton}
                      accessibilityLabel={`Eliminar ${m.nombre}`}
                      android_ripple={{ color: 'rgba(230,243,239,0.08)' }}
                    >
                      <Icon name="trash" size={18} />
                    </Pressable>
                  </View>
                }
              >
                <View style={styles.itemRow}>
                  <Avatar uri={m.foto} name={m.nombre} size={56} />
                  <View style={styles.itemText}>
                    <Text style={{ color: COLOR.TEXTO }}>{m.nombre}</Text>
                    {m.descripcion ? (
                      <Text
                        style={{ color: COLOR.SUBTEXTO, fontSize: 12 }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {m.descripcion}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
      <CrearMascota
        visible={showCrear}
        onClose={() => setShowCrear(false)}
        onCreated={() => {
          setShowCrear(false)
          void fetchMascotas()
        }}
      />
      <Fab
        onPress={handleCrear}
        iconName="plus"
        accessibilityLabel="Agregar mascota"
        style={[styles.fab, { bottom: 24 + (insets.bottom ?? 0) }]}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
  },
  card: {
    width: '100%',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dogThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLOR.SECUNDARIO,
    marginRight: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  /* nuevos estilos para acciones del card */
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconActions: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    zIndex: 99999,
    elevation: 100,
  },
  itemText: {
    flex: 1,
  },
  cardInactive: {
    opacity: 0.55,
  },
})

export default Mascotas
