import {
  StyleSheet,
  View,
  Text,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'
import { COLOR } from '@/constants'
import { Button, Card, Icon } from '@/components/ui'
import Switch from '@/components/ui/Switch'
import { useConfirmarPaseo } from '@/hooks/paseos/useConfirmarPaseo'
import { PetAvatar } from '@/components/ui/PetAvatar'
import { usePedirCelularSiFalta } from '@/hooks/usePedirCelularSiFalta'
import { useCuidadorPerfilModal } from '@/hooks/useCuidadorPerfilModal'
import { ModalPerfilCuidador } from '@/components/cuidador/ModalPerfilCuidador'
import { ModalCompletarCelular } from './ModalCompletarCelular'
import { useConfiguracion } from '@/hooks/configuracion'

interface Props {
  mascotaIds: string[]
  direccionId: string | null
  fecha: Date | null
  hora: string | null
  duracion: number | null
  cuidadorId: string | null
  esCompartido: boolean
  // eslint-disable-next-line no-unused-vars
  onCompartidoChange: (value: boolean) => void
  onConfirm: () => void
  onBack: () => void
}

export const ConfirmarPaseoPaso = ({
  mascotaIds,
  direccionId,
  fecha,
  hora,
  duracion,
  cuidadorId,
  esCompartido,
  onCompartidoChange,
  onConfirm,
  onBack,
}: Props) => {
  const { t } = useTranslation(['paseos', 'usuarios', 'comun'])
  const [modalCelularVisible, setModalCelularVisible] = useState(false)
  const {
    mascotas,
    cuidador,
    direccion,
    desglose,
    loading,
    error,
    confirmarReserva,
  } = useConfirmarPaseo({
    mascotaIds,
    direccionId,
    cuidadorId,
    fecha,
    hora,
    duracion,
    esCompartido,
  })
  const {
    tieneCelular,
    guardarCelular,
    cargando: cargandoCelular,
  } = usePedirCelularSiFalta({
    onCompletado: () => {
      setModalCelularVisible(false)
      // Después de guardar celular, proceder con la confirmación
      confirmarReservaInterno()
    },
  })

  const {
    perfil,
    visible,
    loading: loadingPerfil,
    cargarPerfil,
    cerrar,
  } = useCuidadorPerfilModal()

  // Funcionalidad activable por el admin (configuración `funcionalidades`)
  const { paseo_compartido } = useConfiguracion('funcionalidades')
  const cop = (v: number) => `$${v.toLocaleString(localeActual())}`

  const confirmarReservaInterno = async () => {
    const success = await confirmarReserva()
    if (success) {
      Alert.alert(
        t('paseos:pasos.confirmar.exito_titulo'),
        t('paseos:pasos.confirmar.exito_msg', {
          name:
            cuidador?.nombre ||
            t('paseos:pasos.confirmar.solicitud_abierta_nombre'),
        }),
        [{ text: t('comun:ok'), onPress: onConfirm }]
      )
    } else if (error) {
      Alert.alert(t('comun:error'), error)
    }
  }

  const handleConfirmar = async () => {
    // Verificar si tiene celular, sino pedir que lo complete
    if (!tieneCelular()) {
      setModalCelularVisible(true)
      return
    }
    // Si ya tiene celular, proceder con confirmación
    confirmarReservaInterno()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString(localeActual())
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('paseos:pasos.confirmar.titulo')}</Text>

        <Card style={styles.card} elevated>
          {/* Compact Horizontal Layout for critical info */}
          <View style={styles.compactRow}>
            <View style={[styles.section, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.label}>
                {t('paseos:pasos.confirmar.resumen_fecha')}
              </Text>
              <View style={styles.row}>
                <Icon name="calendar-alt" size={13} color={COLOR.PRIMARIO} />
                <Text style={[styles.value, { marginLeft: 6 }]}>
                  {formatDate(fecha)}
                </Text>
              </View>
            </View>

            <View style={[styles.section, { flex: 0.8, marginBottom: 0 }]}>
              <Text style={styles.label}>{t('paseos:campos.duracion')}</Text>
              <View style={styles.row}>
                <Icon name="clock" size={13} color={COLOR.PRIMARIO} />
                <Text style={[styles.value, { marginLeft: 6 }]}>
                  {hora} ({duracion || 60} min)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Mascotas */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <Text style={styles.label}>
              {t('paseos:pasos.confirmar.resumen_mascotas')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.petsRow}
              style={styles.petsScroll}
            >
              {mascotas.map((pet: any) => (
                <View key={pet.id} style={styles.petItem}>
                  <PetAvatar uri={pet.foto} size="small" />
                  <Text style={styles.petName}>{pet.nombre}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* Ubicación */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <Text style={styles.label}>
              {t('paseos:pasos.confirmar.resumen_ubicacion')}
            </Text>
            <View style={styles.row}>
              <Icon name="map-marker-alt" size={13} color={COLOR.ERROR} />
              <Text style={[styles.value, { marginLeft: 6 }]} numberOfLines={1}>
                {direccion?.alias ||
                  direccion?.direccion_formateada ||
                  t('comun:cargando')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Cuidador */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <Text style={styles.label}>
              {t('paseos:pasos.confirmar.resumen_cuidador')}
            </Text>
            <TouchableOpacity
              onPress={() => cuidadorId && cargarPerfil(cuidadorId)}
              disabled={!cuidadorId}
              activeOpacity={cuidadorId ? 0.7 : 1}
            >
              <View style={styles.row}>
                {cuidador ? (
                  <>
                    <Image
                      source={{ uri: cuidador.imagen }}
                      style={styles.avatarMini}
                    />
                    <Text style={styles.value}>{cuidador.nombre}</Text>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.avatarMini,
                        {
                          backgroundColor: 'rgba(42, 134, 168, 0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Icon name="bullhorn" size={10} color={COLOR.INFO} />
                    </View>
                    <Text style={styles.value}>
                      {t('paseos:pasos.confirmar.solicitud_abierta_nombre')}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Paseo Compartido Compact (solo si el admin lo activa) */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            {paseo_compartido && (
              <>
                <View style={{ marginTop: 4 }}>
                  <Switch
                    value={esCompartido}
                    onValueChange={onCompartidoChange}
                    label={t('paseos:pasos.confirmar.paseo_compartido_label')}
                    style={{ paddingVertical: 4 }}
                    disabled={true}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.divider} />

          {/* Price Breakdown Compact - FASE 1: Mostrar desglose con Paw-Path y Cuidador */}
          <View style={styles.priceSectionCompact}>
            <Text
              style={[
                styles.priceLabel,
                { marginBottom: 8, fontWeight: '600' },
              ]}
            >
              {t('paseos:pasos.confirmar.costo_servicio')}
            </Text>

            {/* Desglose según la política comercial vigente (el mismo cálculo
                que hace el servidor al cobrar) */}
            {desglose ? (
              <>
                <View style={styles.priceRowCompact}>
                  <Text style={styles.priceLabel}>
                    Paw-Path
                    {desglose.iva_comision > 0
                      ? t('paseos:pasos.confirmar.incluye_iva')
                      : ''}
                  </Text>
                  <Text style={styles.priceValue}>
                    {cop(desglose.remuneracion_mandatario)}
                  </Text>
                </View>
                <View style={[styles.priceRowCompact, { marginBottom: 8 }]}>
                  <Text style={styles.priceLabel}>
                    {t('paseos:pasos.confirmar.resumen_cuidador')}
                  </Text>
                  <Text style={styles.priceValue}>
                    {cop(desglose.recursos_administrados)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.priceLabel, { marginBottom: 8 }]}>
                {t('paseos:flujo.errores.sin_politica_comercial')}
              </Text>
            )}
          </View>

          {/* Total Price Compact */}
          <View style={styles.totalRowCompact}>
            <Text style={styles.totalLabel}>
              {t('paseos:pasos.confirmar.total')}
            </Text>
            <Text style={styles.totalValue}>
              {desglose ? cop(desglose.valor_acordado) : '—'}
            </Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title={t('comun:atras')}
            variant="bloque"
            onPress={onBack}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            title={loading ? '...' : t('paseos:pasos.confirmar.btn_confirmar')}
            variant="primario"
            onPress={handleConfirmar}
            loading={loading}
            disabled={loading || !desglose}
            style={{ flex: 1.2 }}
          />
        </View>

        {/* Modal para completar celular */}
        <ModalCompletarCelular
          visible={modalCelularVisible}
          onClose={() => setModalCelularVisible(false)}
          onCelularConfirmado={async celularIngresado => {
            const res = await guardarCelular(celularIngresado)
            if (!res.success) {
              Alert.alert(
                t('comun:error'),
                res.error || t('errores.generico', { ns: 'usuarios' })
              )
            }
            // onCompletado callback handle the rest
          }}
          cargando={cargandoCelular}
        />

        {/* Modal para ver perfil del cuidador */}
        <ModalPerfilCuidador
          visible={visible}
          perfil={perfil}
          loading={loadingPerfil}
          onCerrar={cerrar}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    backgroundColor: COLOR.BLOQUE, // Fixed COLOR
    borderRadius: 12,
  },
  section: {
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    color: COLOR.SUBTEXTO,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 14,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  petsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  petsScroll: {
    flexGrow: 0,
  },
  petItem: {
    alignItems: 'center',
  },
  petName: {
    fontSize: 11,
    color: COLOR.TEXTO,
    marginTop: 3,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.BORDE,
    marginVertical: 4,
  },
  totalRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.PRIMARIO,
  },
  priceSectionCompact: {
    marginBottom: 4,
  },
  priceRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  priceValue: {
    fontSize: 12,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
})
