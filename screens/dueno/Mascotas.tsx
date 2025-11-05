import React, { useMemo, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native'
import { COLOR } from '@/constants'
import {
  Card,
  Button,
  Spacer,
  Badge,
  Chip,
  Icon,
  ScreenScrollView,
} from '@/components/ui'
import EmptyState from '@/components/ui/EmptyState'
import LoadingScreen from '@/components/LoadingScreen'
import { useMascotasDelUsuario, useMascotaActions } from '@/hooks'
import { useTranslation } from 'react-i18next'
import { tErrorMaybe } from '@/services/i18n'
import TextInput from '@/components/ui/TextInput'

const Mascotas: React.FC = () => {
  const { t } = useTranslation()
  const { mascotas, loading, error } = useMascotasDelUsuario({ listen: true })
  // Usamos un único hook para acciones sobre mascotas (create/update/remove).
  const { create, update, loading: actionsLoading } = useMascotaActions()

  const [adding, setAdding] = useState(false)
  const [nombre, setNombre] = useState('')
  const [foto, setFoto] = useState('')
  const especie = useMemo(() => 'perro' as const, [])

  if (loading) {
    return <LoadingScreen messageType="pets" />
  }

  return (
    <View style={styles.container}>
      <ScreenScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('mascotas:lista.ui.titulo')}</Text>
          <Spacer horizontal size={8} />
          <Button
            title={t('mascotas:lista.ui.agregar')}
            onPress={() => setAdding(true)}
            size="sm"
          />
        </View>
        <Spacer size={12} />

        {adding ? (
          <Card
            title={t('mascotas:crear.formulario.titulo')}
            style={styles.section}
          >
            <TextInput
              label={t('mascotas:crear.formulario.nombre.label')}
              placeholder={t('mascotas:crear.formulario.nombre.placeholder')}
              value={nombre}
              onChangeText={setNombre}
              iconName="paw"
            />
            <Spacer size={8} />
            <TextInput
              label={t('mascotas:crear.formulario.foto.label')}
              placeholder="https://..."
              value={foto}
              onChangeText={setFoto}
              iconName="image"
            />
            <Spacer size={8} />
            <View style={{ flexDirection: 'row' }}>
              <Button
                title={t('mascotas:crear.formulario.acciones.cancelar')}
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
                title={t('mascotas:crear.formulario.acciones.guardar')}
                onPress={async () => {
                  if (!nombre.trim()) {
                    Alert.alert(
                      t('mascotas:crear.formulario.titulo'),
                      t('mascotas:crear.formulario.errores.nombreRequerido')
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
                      t('mascotas:crear.formulario.titulo'),
                      tErrorMaybe(res.error, t('comun:intentaNuevamente'))
                    )
                    return
                  }
                  Alert.alert(
                    t('mascotas:crear.formulario.titulo'),
                    t('mascotas:crear.exito.mensaje')
                  )
                  setAdding(false)
                  setNombre('')
                  setFoto('')
                }}
                size="sm"
                loading={actionsLoading}
                disabled={actionsLoading}
                variant="primario"
              />
            </View>
          </Card>
        ) : null}

        {error ? (
          <EmptyState
            title={t('mascotas:lista.errores.cargar')}
            description={tErrorMaybe(error)}
            iconName="exclamation-triangle"
          />
        ) : null}

        {!error && mascotas.length === 0 ? (
          <EmptyState
            title={t('mascotas:lista.vacio.titulo')}
            description={t('mascotas:lista.vacio.descripcion')}
            iconName="paw"
          />
        ) : null}

        <View style={styles.grid}>
          {mascotas.map(m => {
            const isActive = m.activo !== false // por defecto activo

            const rightNode = (
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    isActive
                      ? t('mascotas:lista.ui.confirmar.desactivar')
                      : t('mascotas:lista.ui.confirmar.activar'),
                    isActive
                      ? t('mascotas:lista.ui.confirmar.desactivarTexto', {
                          nombre: m.nombre,
                        })
                      : t('mascotas:lista.ui.confirmar.activarTexto', {
                          nombre: m.nombre,
                        }),
                    [
                      {
                        text: t('comun:cancelar'),
                        style: 'cancel',
                      },
                      {
                        text: isActive
                          ? t('mascotas:lista.ui.desactivar')
                          : t('mascotas:lista.ui.activar'),
                        onPress: async () => {
                          const res = await update(m.id, {
                            activo: !isActive,
                          })
                          if (!res.success) {
                            Alert.alert(
                              t('mascotas:lista.ui.error'),
                              tErrorMaybe(
                                res.error,
                                t('comun:intentaNuevamente')
                              )
                            )
                          }
                        },
                      },
                    ]
                  )
                }
                style={[styles.iconButton, { padding: 8 }]}
              >
                <Icon
                  name="trash"
                  size={16}
                  color={isActive ? COLOR.ERROR : COLOR.SUBTEXTO}
                  containerStyle={{ width: 24, height: 24 }}
                />
              </TouchableOpacity>
            )

            return (
              <Card
                key={m.id}
                title={m.nombre}
                subtitle={m.raza}
                right={rightNode}
                style={[styles.card, !isActive ? styles.cardInactive : null]}
              >
                {/* top actions row: foto + info */}
                <View style={styles.cardTopRow}>
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
                          ? t('mascotas:lista.elemento.peso', { kg: m.peso })
                          : t('mascotas:lista.elemento.pesoDesconocido')}
                      </Text>
                      <Spacer size={6} />
                      <Badge
                        label={t('mascotas:detalles.insignia.vacunasAlDia')}
                        variant="exito"
                        size="sm"
                      />
                    </View>
                  </View>

                  {/* icon moved to Card header via `right` prop */}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginBottom: 8,
                  }}
                >
                  <Chip
                    label={t('mascotas:detalles.cualidades.energetico')}
                    size="sm"
                    leftIconName="bolt"
                  />
                  <Spacer horizontal size={6} />
                  <Chip
                    label={t('mascotas:detalles.cualidades.sociable')}
                    size="sm"
                    leftIconName="users"
                  />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Button
                    title={t('mascotas:lista.ui.detalles')}
                    size="sm"
                    onPress={() => Alert.alert('Detalles', m.nombre)}
                    disabled={!isActive}
                  />
                  <Spacer horizontal size={8} />
                  <Button
                    title={t('mascotas:lista.ui.accion')}
                    size="sm"
                    variant="info"
                    onPress={() => {}}
                    disabled={!isActive}
                  />
                </View>
              </Card>
            )
          })}
        </View>
      </ScreenScrollView>
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
  /* nuevos estilos para acciones del card */
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconActions: {
    marginLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  iconButton: {
    padding: 6,
    borderRadius: 20,
  },
  cardInactive: {
    opacity: 0.55,
  },
})

export default Mascotas
