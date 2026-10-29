import React, { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Badge, Button, Card } from '@/components/ui'
import ScreenHeader from '@/components/ui/ScreenHeader'
import { CapturaEvidencia } from '@/components/solicitud/CapturaEvidencia'
import { useAuth } from '@/context/AuthContext'
import { useMiHabilitacion } from '@/hooks/habilitaciones/useMiHabilitacion'
import {
  ETIQUETA_REQUISITO,
  VARIANTE_REQUISITO,
  fechaCorta,
} from '@/logic/habilitaciones/presentacion'
import { CATALOGO_SERVICIOS } from '@/functions/src/compartido/servicios'
import type { AuthStackParamList } from '@/navigation/types'

type Nav = StackNavigationProp<AuthStackParamList>

const COLOR_BANNER = {
  neutral: COLOR.BORDE,
  alerta: COLOR.ALERTA,
  exito: COLOR.EXITO,
  error: COLOR.ERROR,
} as const

/**
 * Mi habilitación: lo que la persona debe completar para ofrecer un servicio,
 * paso a paso (perfil, evidencia), y cómo va la revisión. Sirve para cualquier
 * servicio del catálogo y desde cualquier rol.
 */
const MiHabilitacion: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const { servicio, abrirPerfil } =
    useRoute<RouteProp<AuthStackParamList, 'MiHabilitacion'>>().params
  const insets = useSafeAreaInsets()
  const { rolActivo, rolesDisponibles, cambiarRolActivo, activandoRol } =
    useAuth()
  const {
    habilitacion,
    filas,
    banner,
    cargando,
    error,
    enviando,
    puedeEnviar,
    perfilCompleto,
    enviar,
  } = useMiHabilitacion(servicio)

  // Al empezar, se abre de una vez la edición del perfil (primer paso)
  const perfilAbierto = useRef(false)
  useEffect(() => {
    if (!abrirPerfil || cargando || perfilAbierto.current) return
    perfilAbierto.current = true
    if (
      !perfilCompleto &&
      (habilitacion?.estado ?? 'BORRADOR') === 'BORRADOR'
    ) {
      navigation.navigate('PerfilCuidador')
    }
  }, [abrirPerfil, cargando, perfilCompleto, habilitacion?.estado, navigation])

  const alEnviar = async () => {
    const problema = await enviar()
    if (problema) {
      Alert.alert(t('cuidador:habilitacion.error_enviar'), problema)
    } else {
      Alert.alert(
        t('cuidador:habilitacion.enviada_titulo'),
        t('cuidador:habilitacion.enviada_detalle')
      )
    }
  }

  const entrarComoCuidador = async () => {
    if (!(await cambiarRolActivo('cuidador'))) {
      Alert.alert(t('perfil:error'), t('perfil:error_cambiar_rol'))
    }
  }

  const tituloServicio = t(`comun:servicios.${servicio}.titulo`, {
    defaultValue: CATALOGO_SERVICIOS[servicio].titulo,
  })

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('cuidador:habilitacion.titulo')}
        subtitle={t('cuidador:habilitacion.subtitulo', {
          servicio: tituloServicio,
        })}
      />

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      ) : error && !habilitacion ? (
        <View style={styles.centrado}>
          <Text style={styles.error}>
            {t('cuidador:habilitacion.error_cargar')}
          </Text>
          <Text style={styles.detalle}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.contenido,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Card
            style={[
              styles.banner,
              { borderColor: COLOR_BANNER[banner.variante] },
            ]}
          >
            <Text style={styles.bannerTitulo}>
              {t(`cuidador:habilitacion.estado.${banner.clave}_titulo`)}
            </Text>
            <Text style={styles.detalle}>
              {t(`cuidador:habilitacion.estado.${banner.clave}_detalle`, {
                servicio: tituloServicio,
                fecha: fechaCorta(banner.venceEn),
              })}
            </Text>
            {banner.motivo && (
              <Text style={styles.motivo}>
                {t('cuidador:habilitacion.equipo_dice', {
                  motivo: banner.motivo,
                })}
              </Text>
            )}
          </Card>

          {banner.clave === 'aprobada' &&
            rolesDisponibles.includes('cuidador') &&
            rolActivo !== 'cuidador' && (
              <Button
                title={t('cuidador:habilitacion.entrar_como_cuidador')}
                icon="walking"
                variant="exito"
                loading={activandoRol}
                onPress={() => void entrarComoCuidador()}
              />
            )}

          {filas.map(f => (
            <Card key={f.definicion.id} style={styles.tarjeta}>
              <View style={styles.encabezado}>
                <Text style={styles.titulo}>
                  {t(
                    `comun:servicios.${servicio}.requisitos.${f.definicion.id}.titulo`,
                    { defaultValue: f.definicion.titulo }
                  )}
                </Text>
                <Badge
                  label={t(`comun:habilitacion.requisito_estados.${f.estado}`, {
                    defaultValue: ETIQUETA_REQUISITO[f.estado],
                  })}
                  variant={VARIANTE_REQUISITO[f.estado]}
                  size="sm"
                />
              </View>
              <Text style={styles.detalle}>
                {t(
                  `comun:servicios.${servicio}.requisitos.${f.definicion.id}.descripcion`,
                  { defaultValue: f.definicion.descripcion }
                )}
              </Text>

              {f.estado === 'RECHAZADO' && f.motivo && (
                <Text style={styles.motivo}>
                  {t('cuidador:habilitacion.rechazado_motivo', {
                    motivo: f.motivo,
                  })}
                </Text>
              )}
              {f.venceEn && f.estado === 'VERIFICADO' && (
                <Text style={styles.detalle}>
                  {t('cuidador:habilitacion.vence_el', {
                    fecha: fechaCorta(f.venceEn),
                  })}
                </Text>
              )}
              {f.estado === 'EXPIRADO' && (
                <Text style={styles.motivo}>
                  {t('cuidador:habilitacion.vencio_renueva')}
                </Text>
              )}

              {f.delPerfil && f.camposFaltantes.length > 0 && (
                <>
                  <Text style={styles.motivo}>
                    {t('cuidador:habilitacion.perfil_falta', {
                      campos: f.camposFaltantes
                        .map(c => t(`cuidador:habilitacion.campos.${c}`, c))
                        .join(', '),
                    })}
                  </Text>
                  {(habilitacion?.estado ?? 'BORRADOR') === 'BORRADOR' && (
                    <Button
                      title={t('cuidador:habilitacion.completar_perfil')}
                      icon="id-card"
                      variant="secundario"
                      size="sm"
                      onPress={() => navigation.navigate('PerfilCuidador')}
                    />
                  )}
                </>
              )}

              {f.definicion.validador !== 'sistema' &&
                f.definicion.evidencia.map(archivo => (
                  <CapturaEvidencia
                    key={archivo}
                    servicio={servicio}
                    requisito={f.definicion.id}
                    archivo={archivo}
                    etiqueta={t(
                      `cuidador:habilitacion.archivos.${archivo}`,
                      archivo
                    )}
                    disabled={!f.puedeSubir}
                  />
                ))}
            </Card>
          ))}

          {(habilitacion?.estado ?? 'BORRADOR') !== 'EN_REVISION' && (
            <>
              {!perfilCompleto && (
                <Text style={styles.detalle}>
                  {t('cuidador:habilitacion.completa_perfil_para_enviar')}
                </Text>
              )}
              <Button
                title={t('cuidador:habilitacion.enviar')}
                icon="paper-plane"
                loading={enviando}
                disabled={!puedeEnviar || enviando}
                onPress={() => void alEnviar()}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  contenido: { padding: 20, gap: 12 },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  error: { color: COLOR.ERROR, textAlign: 'center', fontWeight: '600' },
  banner: { padding: 14, borderWidth: 1, gap: 4 },
  bannerTitulo: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  tarjeta: { padding: 14, gap: 6 },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titulo: { color: COLOR.TEXTO, fontSize: 15, fontWeight: '700', flex: 1 },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 13, lineHeight: 18 },
  motivo: { color: COLOR.ALERTA, fontSize: 13, fontWeight: '600' },
})

export default MiHabilitacion
