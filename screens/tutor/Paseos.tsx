import React, { useState } from 'react'
import { StyleSheet, View, Text, FlatList } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import Chip from '@/components/ui/Chip'
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import type { Paseo } from '@/models/Paseo'

// Mock Data
const MOCK_PASEOS: (Partial<Paseo> & {
  id: string
  mascotaNombre: string
  cuidadorNombre?: string
})[] = [
  {
    id: '1',
    mascotaNombre: 'Max',
    tipo_paseo: 'programado',
    estado: 'pendiente',
    fecha_hora_inicio: new Date(Date.now() + 86400000), // Mañana
    duracion_estimada: 30,
  },
  {
    id: '2',
    mascotaNombre: 'Luna',
    tipo_paseo: 'solicitado',
    estado: 'confirmado',
    fecha_hora_inicio: new Date(Date.now() + 172800000), // Pasado mañana
    duracion_estimada: 45,
    cuidadorNombre: 'Carlos Ruiz',
  },
  {
    id: '3',
    mascotaNombre: 'Rocky',
    tipo_paseo: 'programado',
    estado: 'completado',
    fecha_hora_inicio: new Date(Date.now() - 86400000), // Ayer
    duracion_estimada: 60,
    cuidadorNombre: 'Ana García',
  },
]

type TabTipo = 'proximos' | 'historial'

const Paseos: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabTipo>('proximos')

  const paseosFiltrados = MOCK_PASEOS.filter(p => {
    if (activeTab === 'proximos') {
      return ['pendiente', 'confirmado', 'en_progreso'].includes(p.estado || '')
    }
    return ['completado', 'cancelado'].includes(p.estado || '')
  })

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
    <Screen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>{t('paseos:titulo')}</Text>
        <Text style={styles.subtitulo}>{t('paseos:subtitulo')}</Text>
      </View>

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
        renderItem={({ item }) => <TarjetaPaseo paseo={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
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
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    marginVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 16,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
})

export default Paseos
