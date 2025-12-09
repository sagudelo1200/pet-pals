import React, { useState } from 'react'
import { StyleSheet, View, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import ScreenHeader from '@/components/ui/ScreenHeader'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '@/navigation/types'

type TabTipo = 'proximos' | 'historial'

const AgendaScreen: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabTipo>('proximos')
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const { proximos, historial, cargando, refetch } = useAgendaCuidador()

  const paseosFiltrados = activeTab === 'proximos' ? proximos : historial

  const handlePressPaseo = (paseoId: string) => {
    // Navegar al detalle del paseo (Modo Ejecución)
    if (activeTab === 'proximos') {
      navigation.navigate('DetallePaseoActivo', { paseoId })
    } else {
      // Para historial, usamos la vista de detalle genérica (solo lectura)
      navigation.navigate('DetallePaseo', { id: paseoId })
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
    <Screen style={styles.container} includeTopInset>
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
        renderItem={({ item }) => (
          <TarjetaPaseo
            paseo={item}
            onPress={() => handlePressPaseo(item.id)}
          />
        )}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContent,
          paseosFiltrados.length === 0 && { justifyContent: 'center' },
        ]}
        ListEmptyComponent={!cargando ? renderEmptyState() : null}
        refreshing={cargando}
        onRefresh={refetch}
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

export default AgendaScreen
