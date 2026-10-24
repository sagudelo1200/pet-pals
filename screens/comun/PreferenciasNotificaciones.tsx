import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Screen, ScreenHeader, Switch } from '@/components/ui'
import { usePreferenciasNotificaciones } from '@/hooks/notificaciones/usePreferenciasNotificaciones'

const PreferenciasNotificaciones: React.FC = () => {
  const { t } = useTranslation()
  const { preferencias, cargando, cambiar } = usePreferenciasNotificaciones()

  return (
    <Screen style={styles.container}>
      <ScreenHeader title={t('notificaciones:preferencias.titulo')} />
      <View style={styles.contenido}>
        <Switch
          label={t('notificaciones:preferencias.push')}
          description={t('notificaciones:preferencias.push_descripcion')}
          value={preferencias.push}
          disabled={cargando}
          onValueChange={activo => cambiar('push', activo)}
        />
        <Switch
          label={t('notificaciones:preferencias.email')}
          description={t('notificaciones:preferencias.email_descripcion')}
          value={preferencias.email}
          disabled={cargando}
          onValueChange={activo => cambiar('email', activo)}
        />
        <Text style={styles.nota}>
          {t('notificaciones:preferencias.nota_obligatorias')}
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  contenido: { padding: 20 },
  nota: { color: COLOR.SUBTEXTO, fontSize: 13, marginTop: 8 },
})

export default PreferenciasNotificaciones
