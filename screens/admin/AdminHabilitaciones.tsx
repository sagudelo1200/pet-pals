import React, { useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLOR } from '@/constants'
import { Badge, Card, Chip } from '@/components/ui'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { useHabilitaciones } from '@/hooks/admin/useHabilitaciones'
import {
  ESTADOS_COLA,
  ETIQUETA_ESTADO,
  VARIANTE_ESTADO,
  fechaCorta,
  porRevisar,
} from '@/logic/habilitaciones/presentacion'
import { CATALOGO_SERVICIOS } from '@/functions/src/compartido/servicios'
import type { EstadoHabilitacion } from '@/functions/src/compartido/habilitacion'
import type { AuthStackParamList } from '@/navigation/types'
import { useTranslation } from 'react-i18next'

/**
 * Cola de revisión (admin): las habilitaciones por estado. Lo que espera
 * revisión sale primero, de la más antigua a la más reciente.
 */
const AdminHabilitaciones: React.FC = () => {
  const { t } = useTranslation(['admin', 'comun'])
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const insets = useSafeAreaInsets()
  const [estado, setEstado] = useState<EstadoHabilitacion>('EN_REVISION')
  const { habilitaciones, cargando, error } = useHabilitaciones(estado)

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('admin:habilitaciones.titulo')}
        subtitle={t('admin:habilitaciones.subtitulo')}
        showBack={false}
      />

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtros}
        >
          {ESTADOS_COLA.map(e => (
            <Chip
              key={e}
              label={t(`comun:habilitacion.estados.${e}`, {
                defaultValue: ETIQUETA_ESTADO[e],
              })}
              selected={e === estado}
              onPress={() => setEstado(e)}
            />
          ))}
        </ScrollView>
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contenido,
            { paddingBottom: insets.bottom + 90 },
          ]}
        >
          {habilitaciones.length === 0 ? (
            <Text style={styles.vacio}>
              {t(`admin:habilitaciones.vacio.${estado}`)}
            </Text>
          ) : (
            habilitaciones.map(h => {
              const pendientes = porRevisar(h).length
              return (
                <Card
                  key={h.id}
                  style={styles.tarjeta}
                  onPress={() =>
                    navigation.navigate('DetalleHabilitacion', { id: h.id })
                  }
                >
                  <View style={styles.encabezado}>
                    <Text style={styles.nombre}>
                      {h.usuario_nombre || t('admin:habilitaciones.sin_nombre')}
                    </Text>
                    <Badge
                      label={t(`comun:habilitacion.estados.${h.estado}`, {
                        defaultValue: ETIQUETA_ESTADO[h.estado],
                      })}
                      variant={VARIANTE_ESTADO[h.estado]}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.detalle}>
                    {t(`comun:servicios.${h.servicio}.titulo`, {
                      defaultValue: CATALOGO_SERVICIOS[h.servicio].titulo,
                    })}
                    {h.actualizado_en
                      ? t('admin:habilitaciones.actualizada_el', {
                          fecha: fechaCorta(h.actualizado_en),
                        })
                      : ''}
                  </Text>
                  {pendientes > 0 && (
                    <Text style={styles.alerta}>
                      {t('admin:habilitaciones.por_revisar', {
                        count: pendientes,
                      })}
                    </Text>
                  )}
                  {h.motivo && h.estado !== 'EN_REVISION' && (
                    <Text style={styles.detalle} numberOfLines={2}>
                      {h.motivo}
                    </Text>
                  )}
                </Card>
              )
            })
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  filtros: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  contenido: { padding: 20, gap: 8 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: { color: COLOR.ERROR, textAlign: 'center' },
  vacio: {
    color: COLOR.SUBTEXTO,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
  tarjeta: { padding: 14, marginBottom: 8, gap: 4 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  nombre: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700', flex: 1 },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 12 },
  alerta: { color: COLOR.ALERTA, fontSize: 12, fontWeight: '600' },
})

export default AdminHabilitaciones
