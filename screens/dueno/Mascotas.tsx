import React from 'react'
import { StyleSheet, ScrollView, View, Text, Alert, Image } from 'react-native'
import { COLOR } from '@/constants'
import { Card, Button, Spacer, Badge, Chip } from '@/components/ui'
import EmptyState from '@/components/ui/EmptyState'
import LoadingScreen from '@/components/LoadingScreen'
import { useMascotasDelUsuario } from '@/hooks'
import { useTranslation } from 'react-i18next'
import { tErrorMaybe } from '@/services/i18n'

const Mascotas: React.FC = () => {
  const { t } = useTranslation()
  const { mascotas, loading, error } = useMascotasDelUsuario({ listen: true })

  if (loading) {
    return <LoadingScreen messageType="pets" />
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('mascotas.titulo')}</Text>
        <Spacer size={12} />

        {error ? (
          <EmptyState
            title={t('mascotas.error.cargar')}
            description={tErrorMaybe(error)}
            iconName="exclamation-triangle"
          />
        ) : null}

        {!error && mascotas.length === 0 ? (
          <EmptyState
            title={t('mascotas.vacio.titulo')}
            description={t('mascotas.vacio.descripcion')}
            iconName="paw"
          />
        ) : null}

        <View style={styles.grid}>
          {mascotas.map(m => (
            <Card
              key={m.id}
              title={m.nombre}
              subtitle={m.raza}
              style={styles.card}
            >
              <View style={styles.itemRow}>
                {m.foto ? (
                  <Image source={{ uri: m.foto }} style={styles.dogThumb} />
                ) : (
                  <View
                    style={[
                      styles.dogThumb,
                      { alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <Text style={{ color: COLOR.SUBTEXTO }}>🐶</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLOR.SUBTEXTO }}>
                    {m.peso
                      ? t('mascotas.peso', { kg: m.peso })
                      : t('mascotas.pesoDesconocido')}
                  </Text>
                  <Spacer size={6} />
                  <Badge
                    label={t('mascotas.insignia.vacunasAlDia')}
                    variant="exito"
                    size="sm"
                  />
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  marginBottom: 8,
                }}
              >
                <Chip
                  label={t('mascotas.cualidades.energetico')}
                  size="sm"
                  leftIconName="bolt"
                />
                <Spacer horizontal size={6} />
                <Chip
                  label={t('mascotas.cualidades.sociable')}
                  size="sm"
                  leftIconName="users"
                />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Button
                  title={t('mascotas.detalles')}
                  size="sm"
                  onPress={() => Alert.alert('Detalles', m.nombre)}
                />
                <Spacer horizontal size={8} />
                <Button
                  title={t('mascotas.accion')}
                  size="sm"
                  variant="info"
                  onPress={() => {}}
                />
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between',
  },
  card: {
    width: '100%',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dogThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLOR.SECUNDARIO,
    marginRight: 12,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
})

export default Mascotas
