import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Screen from '@/components/ui/Screen'
import { Card, Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

/**
 * Pantalla de mapa territorial con visualización H3.
 * Muestra celdas coloreadas por estado territorial y permite explorar datos agregados.
 *
 * TODO: Integrar con TerritorioVivo o crear visualización específica para exploradores.
 */
const MapaTerritorial = () => {
  const { t } = useTranslation()

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.placeholderCard}>
          <Icon
            name="globe"
            size={64}
            color={COLOR.ENFASIS}
            containerStyle={{ marginBottom: 16 }}
          />
          <Text style={styles.placeholderTitle}>
            {t('explorador:mapa_territorial')}
          </Text>
          <Text style={styles.placeholderText}>
            {t('explorador:visualizacion_celdas_h3')}
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>
              • {t('explorador:ver_celdas_exploradas')}
            </Text>
            <Text style={styles.featureItem}>
              • {t('explorador:estados_territoriales')}
            </Text>
            <Text style={styles.featureItem}>
              • {t('explorador:scores_viabilidad')}
            </Text>
          </View>
        </Card>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  placeholderCard: {
    alignItems: 'center',
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.TEXTO,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  featureItem: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
  },
})

export default MapaTerritorial
