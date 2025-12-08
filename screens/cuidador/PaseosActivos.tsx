import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import Screen from '@/components/ui/Screen'
import { COLOR } from '@/constants'
import Icon from '@/components/ui/Icon'

const PaseosActivos: React.FC = () => {
  const { t } = useTranslation()

  return (
    <Screen style={styles.container} includeTopInset>
      <View style={styles.header}>
        <Text style={styles.titulo}>
          {t('cuidador:activos.titulo')}
        </Text>
        <Text style={styles.subtitulo}>
          {t('cuidador:activos.subtitulo')}
        </Text>
      </View>

      <View style={styles.emptyState}>
        <Icon name="walking" size={64} color={COLOR.SUBTEXTO} style={{ opacity: 0.3 }} />
        <Text style={styles.emptyText}>
          {t('cuidador:activos.sin_activos')}
        </Text>
        <Text style={styles.emptySubtext}>
          {t('cuidador:activos.sin_activos_desc')}
        </Text>
      </View>
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
    paddingBottom: 24,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '800',
    color: COLOR.TEXTO,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: COLOR.SUBTEXTO,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
