import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { Card, Screen } from '@/components/ui'
import { FormularioPoliticaComercial } from '@/components/admin/FormularioPoliticaComercial'
import { ResumenPoliticaComercial } from '@/components/admin/ResumenPoliticaComercial'
import { PanelLiquidaciones } from '@/components/admin/PanelLiquidaciones'
import { PanelCobrosPendientes } from '@/components/admin/PanelCobrosPendientes'
import { PanelDocumentosContables } from '@/components/admin/PanelDocumentosContables'

/**
 * Economía: liquidaciones a cuidadores, cobros pendientes de tutores,
 * documentos contables y política comercial. El admin actúa (todo cambio
 * pasa por Cloud Functions); con `soloLectura` (contador) solo se consulta.
 */
export const PantallaEconomia: React.FC<{ soloLectura?: boolean }> = ({
  soloLectura = false,
}) => (
  <Screen scroll teclado contentContainerStyle={styles.contenido}>
    <Text style={styles.titulo}>Economía</Text>
    {soloLectura && <Text style={styles.subtitulo}>Solo lectura</Text>}

    <Text style={styles.seccion}>Liquidaciones a cuidadores</Text>
    <Card style={styles.card}>
      <PanelLiquidaciones soloLectura={soloLectura} />
    </Card>

    <Text style={styles.seccion}>Cobros pendientes de tutores</Text>
    <Card style={styles.card}>
      <PanelCobrosPendientes />
    </Card>

    <Text style={styles.seccion}>
      {soloLectura ? 'Documentos contables recientes' : 'Documentos contables con error'}
    </Text>
    <Card style={styles.card}>
      <PanelDocumentosContables soloLectura={soloLectura} />
    </Card>

    <Text style={styles.seccion}>Política comercial</Text>
    <Card style={styles.card}>
      {soloLectura ? <ResumenPoliticaComercial /> : <FormularioPoliticaComercial />}
    </Card>
  </Screen>
)

const AdminEconomia: React.FC = () => <PantallaEconomia />

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
  subtitulo: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginTop: 4,
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
