import React, { useMemo, useState } from 'react'
import { StyleSheet, ScrollView, View, Text, Alert, Image } from 'react-native'
import { COLOR } from '@/constants'
import { Card, Button, Spacer, Badge, Chip } from '@/components/ui'
import EmptyState from '@/components/ui/EmptyState'
import LoadingScreen from '@/components/LoadingScreen'
import { useMascotasDelUsuario, useMascotaActions } from '@/hooks'
import { useTranslation } from 'react-i18next'
import { tErrorMaybe } from '@/services/i18n'
import TextInput from '@/components/ui/TextInput'

const Mascotas: React.FC = () => {
  const { t } = useTranslation()
  const { mascotas, loading, error } = useMascotasDelUsuario({ listen: true })
  const { create, loading: creating } = useMascotaActions()

  const [adding, setAdding] = useState(false)
  const [nombre, setNombre] = useState('')
  const [foto, setFoto] = useState('')
  const especie = useMemo(() => 'perro' as const, [])

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('mascotas:titulo')}</Text>
          <Spacer horizontal size={8} />
          <Button
            title={t('mascotas:agregar')}
            onPress={() => setAdding(true)}
            size="sm"
          />
        </View>
        <Spacer size={12} />

        {adding ? (
          <Card title={t('mascotas:form.titulo')} style={styles.section}>
            <TextInput
              label={t('mascotas:form.nombre')}
              placeholder={t('mascotas:form.nombrePlaceholder')}
              value={nombre}
              onChangeText={setNombre}
              iconName="paw"
            />
            <Spacer size={8} />
            <TextInput
              label={t('mascotas:form.foto')}
              placeholder="https://..."
              value={foto}
              onChangeText={setFoto}
              iconName="image"
            />
            <Spacer size={8} />
            <View style={{ flexDirection: 'row' }}>
              <Button
                title={t('mascotas:form.cancelar')}
                variant="bloque"
                onPress={() => {
                  setAdding(false)
                  setNombre('')
                  setFoto('')
                }}
                size="sm"
              />
              <Spacer horizontal size={8} />
              <Button
                title={t('mascotas:form.guardar')}
                onPress={async () => {
                  if (!nombre.trim()) {
                    Alert.alert(
                      t('mascotas:form.titulo'),
                      t('mascotas:form.errores.nombreRequerido')
                    )
                    return
                  }
                  const res = await create({
                    nombre: nombre.trim(),
                    especie,
                    foto: foto.trim() || undefined,
                  })
                  if (!res.success) {
                    Alert.alert(
                      t('mascotas:form.titulo'),
                      tErrorMaybe(res.error, t('comun.intentaNuevamente'))
                    )
                    return
                  }
                  Alert.alert(
                    t('mascotas:form.titulo'),
                    t('mascotas:crear.exito')
                  )
                  setAdding(false)
                  setNombre('')
                  setFoto('')
                }}
                size="sm"
                loading={creating}
                disabled={creating}
                variant="primario"
              />
            </View>
          </Card>
        ) : null}

        {error ? (
          <EmptyState
            title={t('mascotas:error.cargar')}
            description={tErrorMaybe(error)}
            iconName="exclamation-triangle"
          />
        ) : null}

        {!error && mascotas.length === 0 ? (
          <EmptyState
            title={t('mascotas:vacio.titulo')}
            description={t('mascotas:vacio.descripcion')}
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
                      ? t('mascotas:peso', { kg: m.peso })
                      : t('mascotas:pesoDesconocido')}
                  </Text>
                  <Spacer size={6} />
                  <Badge
                    label={t('mascotas:insignia.vacunasAlDia')}
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
                  label={t('mascotas:cualidades.energetico')}
                  size="sm"
                  leftIconName="bolt"
                />
                <Spacer horizontal size={6} />
                <Chip
                  label={t('mascotas:cualidades.sociable')}
                  size="sm"
                  leftIconName="users"
                />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Button
                  title={t('mascotas:detalles')}
                  size="sm"
                  onPress={() => Alert.alert('Detalles', m.nombre)}
                />
                <Spacer horizontal size={8} />
                <Button
                  title={t('mascotas:accion')}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
