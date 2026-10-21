import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { Card, Screen } from '@/components/ui'
import { FormularioPoliticaComercial } from '@/components/admin/FormularioPoliticaComercial'
import { PanelLiquidaciones } from '@/components/admin/PanelLiquidaciones'
import { PanelCobrosPendientes } from '@/components/admin/PanelCobrosPendientes'
import { PanelDocumentosContables } from '@/components/admin/PanelDocumentosContables'

/**
 * Economía (admin): política comercial, liquidaciones a cuidadores y cobros
 * pendientes de tutores. Todo cambio pasa por Cloud Functions.
 */
const AdminEconomia: React.FC = () => (
  <Screen scroll teclado contentContainerStyle={styles.contenido}>
    <Text style={styles.titulo}>Economía</Text>

    <Text style={styles.seccion}>Liquidaciones a cuidadores</Text>
    <Card style={styles.card}>
      <PanelLiquidaciones />
    </Card>

    <Text style={styles.seccion}>Cobros pendientes de tutores</Text>
    <Card style={styles.card}>
      <PanelCobrosPendientes />
    </Card>

    <Text style={styles.seccion}>Documentos contables con error</Text>
    <Card style={styles.card}>
      <PanelDocumentosContables />
    </Card>

    <Text style={styles.seccion}>Política comercial</Text>
    <Card style={styles.card}>
      <FormularioPoliticaComercial />
    </Card>
  </Screen>
)

const styles = StyleSheet.create({
  contenido: {
    padding: 24,
    paddingBottom: 24,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 20,
  },
  seccion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    padding: 16,
  },
})

export default AdminEconomia
