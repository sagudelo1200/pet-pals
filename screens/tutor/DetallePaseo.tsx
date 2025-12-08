import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import Screen from '@/components/ui/Screen'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import { BadgeEstadoPaseo } from '@/components/paseos/BadgeEstadoPaseo'
import { useEstadoPaseo } from '@/hooks/paseos/useEstadoPaseo'
import { ServicioPaseo } from '@/services/firebase/paseo'
import { Paseo } from '@/models/Paseo'
import LoadingScreen from '@/components/ui/LoadingScreen'

export const DetallePaseo = () => {
  const { t } = useTranslation()
  const route = useRoute()
  const navigation = useNavigation()
  const { id } = route.params as { id: string }
  const [paseo, setPaseo] = useState<Paseo | null>(null)

  // Hook de máquina de estados
  // Inicializamos vacía y sincronizamos cuando cargue el paseo
  const {
    estado,
    puede,
    transicion,
    cargando: cargandoMaquina,
    sincronizar,
  } = useEstadoPaseo(paseo || undefined)

  useEffect(() => {
    cargarPaseo()
  }, [id])

  const cargarPaseo = async () => {
    const res = await ServicioPaseo.obtenerPorId(id)
    if (res.success && res.data) {
      setPaseo(res.data)
      sincronizar(res.data)
    } else {
      Alert.alert('Error', 'No se pudo cargar el paseo')
      navigation.goBack()
    }
  }

  const handleTransicion = async (evento: any) => {
    // Ejemplo: Confirmación para cancelar
    if (evento === 'CANCELAR') {
      Alert.alert('Cancelar Paseo', '¿Estás seguro?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: () => ejecutar(evento, { motivo: 'Usuario canceló' }),
        },
      ])
      return
    }
    await ejecutar(evento)
  }

  const ejecutar = async (evento: any, payload?: any) => {
    const exito = await transicion(evento, payload)
    if (exito) {
      // Recargar datos para asegurar consistencia
      cargarPaseo()
    }
  }

  if (!paseo) return <LoadingScreen />

  return (
    <Screen style={styles.container} includeTopInset>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={COLOR.TEXTO} />
        </Pressable>
        <Text style={styles.titulo}>{t('paseos:detalle.titulo')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Estado Actual:</Text>
            <BadgeEstadoPaseo estado={estado} />
          </View>
          <Text style={styles.info}>ID: {paseo.id}</Text>
          <Text style={styles.info}>
            Inicio:{' '}
            {paseo.fecha_hora_inicio
              ? new Date(paseo.fecha_hora_inicio).toLocaleString()
              : 'N/A'}
          </Text>
        </Card>

        {/* Controles de Estado (Solo demo por ahora) */}
        <View style={styles.actions}>
          <Text style={styles.sectionTitle}>Acciones Disponibles</Text>

          {puede('CANCELAR') && (
            <Button
              title="Cancelar Paseo"
              variant="error"
              onPress={() => handleTransicion('CANCELAR')}
              loading={cargandoMaquina}
              style={styles.actionBtn}
            />
          )}

          {/* Botones para probar flujo completo (Simulando ser cuidador/sistema) */}
          {puede('ACEPTAR') && (
            <Button
              title="[Demo] Aceptar"
              onPress={() => handleTransicion('ACEPTAR')}
              style={styles.actionBtn}
            />
          )}
          {puede('INICIAR_RUTA') && (
            <Button
              title="[Demo] Iniciar Ruta"
              onPress={() => handleTransicion('INICIAR_RUTA')}
              style={styles.actionBtn}
            />
          )}
          {puede('LLEGAR') && (
            <Button
              title="[Demo] Llegar"
              onPress={() => handleTransicion('LLEGAR')}
              style={styles.actionBtn}
            />
          )}
          {puede('INICIAR_PASEO') && (
            <Button
              title="[Demo] Iniciar Paseo"
              onPress={() => handleTransicion('INICIAR_PASEO')}
              style={styles.actionBtn}
              variant="primario"
            />
          )}
          {puede('FINALIZAR_PASEO') && (
            <Button
              title="[Demo] Finalizar"
              onPress={() => handleTransicion('FINALIZAR_PASEO')}
              style={styles.actionBtn}
            />
          )}
          {puede('CONFIRMAR_COMPLETADO') && (
            <Button
              title="Confirmar Completado"
              onPress={() => handleTransicion('CONFIRMAR_COMPLETADO')}
              style={styles.actionBtn}
              variant="exito"
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  content: { padding: 16 },
  card: { padding: 16, marginBottom: 24 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: { color: COLOR.SUBTEXTO },
  info: { color: COLOR.TEXTO, marginBottom: 4 },
  actions: { gap: 12 },
  sectionTitle: { color: COLOR.SUBTEXTO, marginBottom: 8, fontWeight: '600' },
  actionBtn: { marginBottom: 8 },
})
