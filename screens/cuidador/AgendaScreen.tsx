import React, { useState, useMemo } from 'react'
import { StyleSheet, View, Text, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import { useAgendaCuidador } from '@/hooks/cuidador/useAgendaCuidador'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '@/navigation/types'

type TabTipo = 'proximos' | 'historial'

const AgendaScreen: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabTipo>('proximos')
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
  const { proximos, historial, cargando, refetch } = useAgendaCuidador()

  const paseosFiltrados = activeTab === 'proximos' ? proximos : historial

  const handlePressPaseo = (paseoId: string) => {
    // Navegar al detalle del paseo (Modo Ejecución)
    // Por ahora usamos DetallePaseo genérico, pero luego será la pantalla de ejecución
    navigation.navigate('DetallePaseo', { id: paseoId })
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
    />
  )

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{t('cuidador:agenda.titulo')}</Text>
        <Text style={styles.subtitulo}>{t('cuidador:agenda.subtitulo')}</Text>
      </View>

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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!cargando ? renderEmptyState : null}
        refreshing={cargando}
        onRefresh={refetch}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.FONDO,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 10,
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
