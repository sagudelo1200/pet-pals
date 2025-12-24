import React, { useState, useMemo } from 'react'
import { StyleSheet, View, Text, FlatList, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import { ItemHistorialPaseo } from '@/components/paseos/ItemHistorialPaseo'
import { Chip } from '@/components/ui'
import ValidatedFab from '@/components/ui/Fab'
import { SolicitarPaseoModal } from '@/components/paseos/SolicitarPaseoModal'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import { useMascotas } from '@/hooks/useMascotas'
import { usePaseos } from '@/hooks/paseos/usePaseos'
import DetallePaseoBottomSheet from '@/components/paseos/DetallePaseoBottomSheet'
import { PaseoStatus } from '@/models/Paseo'
import { obtenerExperienciaPaseo } from '@/logic/paseos/PaseoStateRouter'

type TabTipo = 'proximos' | 'historial'

const Paseos: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabTipo>('proximos')
  const [modalVisible, setModalVisible] = useState(false)
  const [detalleVisible, setDetalleVisible] = useState(false)
  const [detalleTitle, setDetalleTitle] = useState('')
  const { mascotas } = useMascotas()
  const navigation = useNavigation()
  const { paseos, cargando, refetch } = usePaseos()
  const lastNavTime = React.useRef(0)

  const handleNavigateToDetail = (id: string) => {
    const now = Date.now()
    if (now - lastNavTime.current < 1000) return
    lastNavTime.current = now

    const paseo = (paseos || []).find(p => p.id === id)
    if (!paseo) return

    // Usar State Router para decidir la experiencia
    const experiencia = obtenerExperienciaPaseo(paseo, 'tutor')

    if (experiencia.tipo === 'NINGUNA') return

    if (experiencia.tipo === 'PANTALLA') {
      // @ts-ignore
      navigation.navigate(experiencia.id, { paseoId: id })
    } else if (experiencia.tipo === 'MODAL') {
      // Mapeo temporal: Todos los modales abren el detalle genérico
      setDetalleTitle(
        experiencia.configuracion.titulo || t('paseos:detalle.titulo')
      )
      setDetalleVisible(true)
    }
  }

  const handleSolicitar = () => {
    if (mascotas.length === 0) {
      Alert.alert(
        t('paseos:errores.SIN_MASCOTAS_TITULO'),
        t('paseos:errores.SIN_MASCOTAS_MSG'),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear Mascota',
            onPress: () => {
              // @ts-ignore
              navigation.navigate('Mascotas', { openCreate: true })
            },
          },
        ]
      )
      return
    }
    setModalVisible(true)
  }

  // Filtrado de datos
  const proximos = useMemo(
    () =>
      (paseos || []).filter(p =>
        [
          PaseoStatus.PENDIENTE,
          PaseoStatus.CONFIRMADO,
          PaseoStatus.EN_RUTA,
          PaseoStatus.EN_PROGRESO,
        ].includes(p.estado)
      ),
    [paseos]
  )

  const historial = useMemo(
    () =>
      (paseos || []).filter(p =>
        [
          PaseoStatus.COMPLETADO,
          PaseoStatus.FINALIZADO,
          PaseoStatus.CANCELADO,
        ].includes(p.estado)
      ),
    [paseos]
  )

  const paseosFiltrados = activeTab === 'proximos' ? proximos : historial

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PaseadorPerrosSvg width={200} height={160} style={{ opacity: 0.8 }} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'proximos'
          ? t('paseos:lista.vacio_proximos')
          : t('paseos:lista.vacio_completados')}
      </Text>
    </View>
  )

  return (
    <Screen
      includeTopInset
      style={styles.container}
      floating={<ValidatedFab onPress={handleSolicitar} style={styles.fab} />}
    >
      <ScreenHeader
        title={t('paseos:titulo')}
        subtitle={t('paseos:subtitulo')}
        showBack={false}
      />

      <View style={styles.tabs}>
        <Chip
          label="Próximos"
          selected={activeTab === 'proximos'}
          onPress={() => setActiveTab('proximos')}
          style={styles.tab}
        />
        <Chip
          label="Historial"
          selected={activeTab === 'historial'}
          onPress={() => setActiveTab('historial')}
          style={styles.tab}
        />
      </View>

      <FlatList
        data={paseosFiltrados}
        keyExtractor={item => item.id}
        renderItem={({ item }) =>
          activeTab === 'historial' ? (
            <ItemHistorialPaseo
              paseo={item}
              onPress={() => handleNavigateToDetail(item.id)}
            />
          ) : (
            <TarjetaPaseo
              paseo={item}
              onPress={() => handleNavigateToDetail(item.id)}
            />
          )
        }
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          paseosFiltrados.length === 0 && { justifyContent: 'center' },
        ]}
        ListEmptyComponent={renderEmptyState()}
        showsVerticalScrollIndicator={false}
        refreshing={cargando}
        onRefresh={refetch}
      />

      <SolicitarPaseoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <DetallePaseoBottomSheet
        visible={detalleVisible}
        onClose={() => setDetalleVisible(false)}
        title={detalleTitle}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 10,
    gap: 12,
    justifyContent: 'center',
  },
  tab: {
    marginVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 20,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 1000,
    elevation: 9,
  },
})

export default Paseos
