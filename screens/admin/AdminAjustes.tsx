import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { Card, Screen } from '@/components/ui'
import { FormularioConfiguracion } from '@/components/admin/FormularioConfiguracion'
import { FormularioConsentimiento } from '@/components/admin/FormularioConsentimiento'
import {
  AREAS_CONFIGURACION,
  CATALOGO_CONFIGURACION,
} from '@/functions/src/compartido/configuracion'

/**
 * Ajustes (admin): configuración operativa por área (generada desde el
 * catálogo) y documentos legales versionados. La política comercial está en
 * Economía. Todo cambio pasa por Cloud Functions y queda en el historial.
 */
const AdminAjustes: React.FC = () => {
  const { t } = useTranslation('admin')
  return (
    <Screen scroll teclado contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>{t('ajustes.titulo')}</Text>

      {AREAS_CONFIGURACION.map(area => (
        <React.Fragment key={area}>
          <Text style={styles.seccion}>
            {t(`configuracion.${area}.titulo`, {
              defaultValue: CATALOGO_CONFIGURACION[area].titulo,
            })}
          </Text>
          <Card style={styles.card}>
            <FormularioConfiguracion area={area} />
          </Card>
        </React.Fragment>
      ))}

      <Text style={styles.seccion}>{t('ajustes.documentos_legales')}</Text>
      <Card style={styles.card}>
        <FormularioConsentimiento />
      </Card>
    </Screen>
  )
}

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

export default AdminAjustes
