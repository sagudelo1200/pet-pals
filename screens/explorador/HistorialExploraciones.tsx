import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import Screen from '@/components/ui/Screen'
import { Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

/**
 * Pantalla de historial de exploraciones del usuario.
 * Muestra todas las capturas territoriales realizadas, ordenadas cronológicamente.
 *
 * TODO: Implementar lista de exploraciones con hook useCollection.
 */
const HistorialExploraciones = () => {
  const { t } = useTranslation()

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('explorador:mis_exploraciones')}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('explorador:historial_capturas')}
          </Text>
        </View>

        {/* Placeholder: lista vacía */}
        <Card style={styles.emptyCard}>
          <Icon
            name="list"
            size={64}
            color={COLOR.INACTIVO}
            containerStyle={{ marginBottom: 16 }}
          />
          <Text style={styles.emptyTitle}>
            {t('explorador:sin_capturas_aun')}
          </Text>
          <Text style={styles.emptyText}>
            {t('explorador:realiza_primera_captura')}
          </Text>
        </Card>

        {/* TODO: Lista de capturas con filtros por fecha, celda, tipo de punto */}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    lineHeight: 20,
  },
})

export default HistorialExploraciones
