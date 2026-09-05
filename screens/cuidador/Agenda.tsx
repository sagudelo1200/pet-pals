import React, { useState, useEffect } from 'react'
import { StyleSheet, View, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import { ItemHistorialPaseo } from '@/components/paseos/ItemHistorialPaseo'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'
import { usePaseosEvaluados } from '@/hooks/paseos/usePaseosEvaluados'
import { Paseo } from '@/models/Paseo'
import DetallePaseoBottomSheet from '@/components/paseos/DetallePaseoBottomSheet'
import { obtenerExperienciaPaseo } from '@/logic/paseos/routerPaseos'

type TabTipo = 'proximos' | 'historial'

const Agenda: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const [activeTab, setActiveTab] = useState<TabTipo>('proximos')
  const { proximos, historial, cargando, refetch } = useAgendaCuidador()
  // Paseos donde el cuidador ya dejó su registro (repesca)
  const paseosEvaluados = usePaseosEvaluados()
  const [detalleVisible, setDetalleVisible] = useState(false)
  const [detalleTitle, setDetalleTitle] = useState('')
  const [detallePaseo, setDetallePaseo] = useState<Paseo | null>(null)

  const paseosFiltrados = activeTab === 'proximos' ? proximos : historial
  const isFocused = useIsFocused()

  // Optimización UX: Pre-selección transparente de pestaña
  useEffect(() => {
    if (!isFocused) {
      if ((proximos || []).length > 0) {
        setActiveTab('proximos')
      } else if ((historial || []).length > 0) {
        setActiveTab('historial')
      }
    }
  }, [isFocused, proximos?.length, historial?.length])

  const handlePressPaseo = (paseoId: string) => {
    const paseo = paseosFiltrados.find(p => p.id === paseoId)
    if (!paseo) return

    const experiencia = obtenerExperienciaPaseo(paseo, 'cuidador')

    if (experiencia.tipo === 'PANTALLA') {
      // @ts-ignore
      navigation.navigate(experiencia.id, { paseoId })
    } else if (experiencia.tipo === 'MODAL') {
      setDetalleTitle(
        experiencia.configuracion.titulo || t('paseos:detalle.titulo')
      )
      setDetallePaseo(paseo)
      setDetalleVisible(true)
    }
  }

  const renderEmptyState = () => (
    <EmptyState
      image={
        <PaseadorPerrosSvg width={200} height={160} style={{ opacity: 0.8 }} />
      }
      title={
        activeTab === 'proximos'
          ? t('cuidador:agenda.vacio_proximos')
          : t('cuidador:agenda.vacio_historial')
      }
      description={
        activeTab === 'proximos'
          ? t('cuidador:agenda.vacio_proximos_sub')
          : undefined
      }
      style={{ paddingBottom: 0 }}
    />
  )

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        title={t('cuidador:agenda.titulo')}
        subtitle={t('cuidador:agenda.subtitulo')}
        showBack={false}
      />

      <View style={styles.tabs}>
        <Chip
          label={t('cuidador:agenda.tabs.proximos')}
          selected={activeTab === 'proximos'}
          onPress={() => setActiveTab('proximos')}
          style={styles.tab}
        />
        <Chip
          label={t('cuidador:agenda.tabs.historial')}
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
              onPress={() => handlePressPaseo(item.id)}
              // Repesca del cuidador: "Completar registro" en paseos
              // terminados donde aún no dejó observación/evaluación
              onCalificar={
                !paseosEvaluados.has(item.id)
                  ? () => {
                      // @ts-ignore
                      navigation.navigate('ObservacionMascota', {
                        paseoId: item.id,
                      })
                    }
                  : undefined
              }
              botonLabel={t('cuidador:agenda.completar_registro')}
            />
          ) : (
            <TarjetaPaseo
              paseo={item}
              onPress={() => handlePressPaseo(item.id)}
            />
          )
        }
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          paseosFiltrados.length === 0 && { justifyContent: 'center' },
        ]}
        ListEmptyComponent={!cargando ? renderEmptyState() : null}
        refreshing={cargando}
        onRefresh={refetch}
      />
      <DetallePaseoBottomSheet
        visible={detalleVisible}
        onClose={() => {
          setDetalleVisible(false)
          setDetallePaseo(null)
        }}
        title={detalleTitle}
        paseo={detallePaseo}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
    justifyContent: 'center',
  },
  tab: {
    marginRight: 10,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    flexGrow: 1,
  },
})

export default Agenda
