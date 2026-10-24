import React from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  Card,
  EmptyState,
  Icon,
  Screen,
  ScreenHeader,
  Skeleton,
} from '@/components/ui'
import { useNotificaciones } from '@/hooks/notificaciones/useNotificaciones'
import { destinoDeAccion } from '@/logic/notificaciones/acciones'
import type { Notificacion } from '@/models/Notificacion'

const Notificaciones: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation<any>()
  const { avisos, cargando, marcarLeida, marcarTodasLeidas } =
    useNotificaciones()
  const hayNoLeidas = avisos.some(a => !a.leido)

  const abrir = async (aviso: Notificacion): Promise<void> => {
    if (!aviso.leido) {
      try {
        await marcarLeida(aviso.id)
      } catch (error) {
        console.warn('[Notificaciones] No se pudo marcar como leída:', error)
      }
    }
    const destino = destinoDeAccion(aviso.datos?.accion)
    if (destino) {
      navigation.navigate(destino.app, { screen: destino.pestana })
    }
  }

  const renderItem = ({ item }: { item: Notificacion }) => (
    <Pressable onPress={() => abrir(item)} testID={`notificacion-${item.id}`}>
      <Card style={[styles.card, !item.leido && styles.cardNoLeida]}>
        <View style={styles.fila}>
          {!item.leido && <View style={styles.punto} />}
          <View style={styles.textos}>
            <Text style={styles.titulo}>{item.titulo}</Text>
            <Text style={styles.cuerpo}>{item.cuerpo}</Text>
            <Text style={styles.fecha}>
              {item.creado_en.toLocaleString(i18n.language, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  )

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        title={t('notificaciones:titulo')}
        mostrarNotificaciones={false}
        rightAction={
          <View style={styles.acciones}>
            {hayNoLeidas && (
              <Pressable onPress={() => marcarTodasLeidas()}>
                <Text style={styles.accion}>
                  {t('notificaciones:marcar_todas')}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigation.navigate('PreferenciasNotificaciones')}
              accessibilityLabel={t('notificaciones:preferencias.abrir')}
              testID="abrir-preferencias"
            >
              <Icon name="cog" size={20} color={COLOR.TEXTO} />
            </Pressable>
          </View>
        }
      />
      {cargando ? (
        <View style={styles.lista}>
          <Skeleton height={80} />
        </View>
      ) : avisos.length === 0 ? (
        <EmptyState
          iconName="bell-slash"
          title={t('notificaciones:vacio.titulo')}
          description={t('notificaciones:vacio.descripcion')}
        />
      ) : (
        <FlatList
          data={avisos}
          keyExtractor={a => a.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  lista: { padding: 16, gap: 12 },
  card: { padding: 14, marginBottom: 12 },
  cardNoLeida: { borderColor: COLOR.ENFASIS, borderWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: COLOR.ENFASIS,
  },
  textos: { flex: 1 },
  titulo: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700' },
  cuerpo: { color: COLOR.SUBTEXTO, fontSize: 14, marginTop: 4 },
  fecha: { color: COLOR.SUBTEXTO, fontSize: 12, marginTop: 8 },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  accion: { color: COLOR.ENFASIS, fontSize: 14, fontWeight: '600' },
})

export default Notificaciones
