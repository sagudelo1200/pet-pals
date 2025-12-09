import React, { useState, useCallback } from 'react'
import { StyleSheet, View, Text, FlatList, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'
import ScreenHeader from '@/components/ui/ScreenHeader'
import Icon from '@/components/ui/Icon'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import Skeleton from '@/components/ui/Skeleton'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo, PaseoStatus } from '@/models/Paseo'
import { useAuth } from '@/context/AuthContext'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '@/navigation/types'

const PaseosActivos: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { user } = useAuth()

  const [paseos, setPaseos] = useState<Paseo[]>([])
  const [cargando, setCargando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const cargarPaseos = async () => {
    if (!user) return

    try {
      const estadosActivos = [
        PaseoStatus.ACEPTADO,
        PaseoStatus.PROGRAMADO,
        PaseoStatus.EN_RUTA,
        PaseoStatus.EN_PROGRESO,
      ]

      const res = await ServicioPaseo.obtenerPorCuidadorYEstado(
        user.uid,
        estadosActivos
      )

      if (res.success && res.data) {
        // Ordenar: EN_PROGRESO primero, luego por fecha
        const ordenados = res.data.sort((a, b) => {
          if (
            a.estado === PaseoStatus.EN_PROGRESO &&
            b.estado !== PaseoStatus.EN_PROGRESO
          )
            return -1
          if (
            b.estado === PaseoStatus.EN_PROGRESO &&
            a.estado !== PaseoStatus.EN_PROGRESO
          )
            return 1

          // Si ambos tienen el mismo estado (o ninguno es EN_PROGRESO), ordenar por fecha
          const fechaA =
            a.fecha_hora_inicio instanceof Date
              ? a.fecha_hora_inicio
              : new Date(a.fecha_hora_inicio)
          const fechaB =
            b.fecha_hora_inicio instanceof Date
              ? b.fecha_hora_inicio
              : new Date(b.fecha_hora_inicio)
          return fechaA.getTime() - fechaB.getTime()
        })

        setPaseos(ordenados)
      }
    } catch (error) {
      console.error('Error cargando paseos activos:', error)
    } finally {
      setCargando(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      cargarPaseos()
    }, [user])
  )

  const onRefresh = () => {
    setRefreshing(true)
    cargarPaseos()
  }

  const handlePressPaseo = (paseo: Paseo) => {
    navigation.navigate('DetallePaseoActivo', { paseoId: paseo.id })
  }

  const renderItem = ({ item }: { item: Paseo }) => (
    <View style={styles.itemContainer}>
      <TarjetaPaseo paseo={item} onPress={() => handlePressPaseo(item)} />
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Icon
        name="walking"
        size={64}
        color={COLOR.SUBTEXTO}
        style={{ opacity: 0.3 }}
      />
      <Text style={styles.emptyText}>{t('cuidador:activos.sin_activos')}</Text>
      <Text style={styles.emptySubtext}>
        {t('cuidador:activos.sin_activos_desc')}
      </Text>
    </View>
  )

  if (cargando && !refreshing) {
    return (
      <Screen style={styles.container} includeTopInset>
        <ScreenHeader
          title={t('cuidador:activos.titulo')}
          subtitle={t('cuidador:activos.subtitulo')}
          showBack={false}
        />
        <View style={{ padding: 20 }}>
          <Skeleton
            height={120}
            width="100%"
            radius={12}
            style={{ marginBottom: 16 }}
          />
          <Skeleton
            height={120}
            width="100%"
            radius={12}
            style={{ marginBottom: 16 }}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={styles.container} includeTopInset>
      <ScreenHeader
        title={t('cuidador:activos.titulo')}
        subtitle={t('cuidador:activos.subtitulo')}
        showBack={false}
      />

      <FlatList
        data={paseos}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={
          paseos.length === 0 ? styles.listEmpty : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLOR.PRIMARIO]}
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  listEmpty: {
    flexGrow: 1,
  },
  itemContainer: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginTop: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginTop: 8,
  },
})

export default PaseosActivos
