import React, { useMemo } from 'react'
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
import { Button, Card } from '@/components/ui'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { useZonasNegocio } from '@/hooks/admin/useZonasNegocio'
import { useZonasH3 } from '@/hooks/admin/useZonasH3'
import {
  resumenPorZona,
  resumenSinServicio,
  type ResumenZona,
} from '@/logic/territorio/zonasDeNegocio'
import type { AuthStackParamList } from '@/navigation/types'
import type { EstadoZona } from '@/models/Zona'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

const COLOR_ESTADO: Record<EstadoZona, string> = {
  piloto: COLOR.ALERTA,
  activa: COLOR.EXITO,
  cerrada: COLOR.SUBTEXTO,
}

/**
 * Zonas de negocio (admin): los sectores con nombre sobre el territorio, por
 * ciudad, con cómo va cada uno. Desde aquí se crean y se editan.
 */
const AdminZonas: React.FC = () => {
  const { t } = useTranslation('admin')
  const idioma = localeActual()
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>()
  const insets = useSafeAreaInsets()
  const negocio = useZonasNegocio()
  const territorio = useZonasH3()

  const sinServicio = useMemo(
    () => resumenSinServicio(negocio.zonas, territorio.celdas, negocio.mapa),
    [negocio.zonas, negocio.mapa, territorio.celdas]
  )

  const porCiudad = useMemo(() => {
    const resumenes = resumenPorZona(
      negocio.zonas,
      territorio.celdas,
      negocio.mapa
    )
    const grupos = new Map<string, ResumenZona[]>()
    for (const r of resumenes) {
      grupos.set(r.zona.ciudad, [...(grupos.get(r.zona.ciudad) ?? []), r])
    }
    return [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b, idioma))
      .map(([ciudad, zonas]) => ({
        ciudad,
        zonas: zonas.sort((a, b) =>
          a.zona.nombre.localeCompare(b.zona.nombre, idioma)
        ),
      }))
  }, [negocio.zonas, negocio.mapa, territorio.celdas, idioma])

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('zonas.titulo')} subtitle={t('zonas.subtitulo')} />

      {negocio.cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      ) : negocio.error ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>{negocio.error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contenido,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Button
            title={t('zonas.nueva')}
            icon="plus"
            onPress={() => navigation.navigate('EditorZona', {})}
          />

          {sinServicio.celdas > 0 && (
            <Card style={styles.sinServicio}>
              <Text style={styles.sinServicioTitulo}>
                {t('zonas.sin_servicio_titulo')}
              </Text>
              <Text style={styles.detalle}>
                {t('zonas.sin_servicio_detalle', {
                  tutores: t('zonas.tutores', { count: sinServicio.tutores }),
                  cuidadores: t('zonas.cuidadores_viven', {
                    count: sinServicio.cuidadores,
                  }),
                  celdas: t('zonas.celdas', { count: sinServicio.celdas }),
                })}
              </Text>
            </Card>
          )}

          {porCiudad.length === 0 ? (
            <Text style={styles.vacio}>{t('zonas.vacio')}</Text>
          ) : (
            porCiudad.map(({ ciudad, zonas }) => (
              <View key={ciudad}>
                <Text style={styles.ciudad}>{ciudad}</Text>
                {zonas.map(r => (
                  <Card
                    key={r.zona.id}
                    style={styles.tarjeta}
                    onPress={() =>
                      navigation.navigate('EditorZona', { zonaId: r.zona.id })
                    }
                  >
                    <View style={styles.encabezado}>
                      <Text style={styles.nombre}>{r.zona.nombre}</Text>
                      <Text
                        style={[
                          styles.estado,
                          { color: COLOR_ESTADO[r.zona.estado] },
                        ]}
                      >
                        {t(`zonas.estados.${r.zona.estado}`)}
                      </Text>
                    </View>
                    <Text style={styles.detalle}>
                      {t('zonas.celdas', { count: r.zona.celdas.length })}
                      {r.zona.excluidas.length > 0
                        ? t('zonas.excluidas', {
                            count: r.zona.excluidas.length,
                          })
                        : ''}
                    </Text>
                    <Text style={styles.detalle}>
                      {t('zonas.resumen', {
                        demanda: r.demanda,
                        paseos: r.paseosActivos,
                        cobertura: r.coberturaMedia.toFixed(1),
                      })}
                    </Text>
                    {r.celdasSinCobertura > 0 && (
                      <Text style={styles.alerta}>
                        {t('zonas.sin_cobertura', {
                          count: r.celdasSinCobertura,
                        })}
                      </Text>
                    )}
                  </Card>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
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
  sinServicio: {
    padding: 14,
    marginTop: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  sinServicioTitulo: { color: COLOR.TEXTO, fontSize: 14, fontWeight: '700' },
  ciudad: {
    color: COLOR.TEXTO,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  tarjeta: { padding: 14, marginBottom: 8, gap: 4 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700', flex: 1 },
  estado: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 12 },
  alerta: { color: COLOR.ALERTA, fontSize: 12, fontWeight: '600' },
})

export default AdminZonas
