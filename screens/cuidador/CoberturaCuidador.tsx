import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { useCoberturaCuidador } from '@/hooks/cuidador/useCoberturaCuidador'
import { useConfiguracion } from '@/hooks/configuracion/useConfiguracion'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { celdaPrincipalDe } from '@/logic/ubicaciones/celdaPrincipal'
import { RADIOS_COBERTURA } from '@/functions/src/compartido/geografia'
import { COLOR, SPACING } from '@/constants'
import Button from '@/components/ui/Button'
import ScreenHeader from '@/components/ui/ScreenHeader'

/**
 * Hasta dónde atiende el cuidador: un radio alrededor de su casa. Si el admin
 * habilitó la cobertura manual, además puede afinar las zonas en el mapa.
 */
export default function CoberturaCuidador() {
  const { t } = useTranslation(['cuidador', 'comun'])
  const navigation = useNavigation<any>()
  const { user, profile } = useAuth()
  const insets = useSafeAreaInsets()
  const { cobertura_manual: manualPermitido } =
    useConfiguracion('funcionalidades')

  const h3HomeDesdeAuth = useMemo(() => celdaPrincipalDe(profile), [profile])
  const { h3Home, radio, hayManual, loading } = useCoberturaCuidador(
    user?.uid ?? null,
    h3HomeDesdeAuth
  )

  const [elegido, setElegido] = useState<number>(radio)
  const [saving, setSaving] = useState(false)
  useEffect(() => setElegido(radio), [radio])

  const guardar = async () => {
    if (!user?.uid) return
    setSaving(true)
    const res = await GestorPerfilPublico.actualizarRadioCobertura(
      user.uid,
      elegido,
      h3Home
    )
    setSaving(false)
    if (res.success) {
      Alert.alert(
        t('cuidador:cobertura.listo'),
        t('cuidador:cobertura.actualizada'),
        [{ text: t('comun:ok'), onPress: () => navigation.goBack() }]
      )
    } else {
      Alert.alert(t('comun:error'), t('cuidador:cobertura.error_guardar'))
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title={t('cuidador:cobertura.titulo')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
        </View>
      </View>
    )
  }

  if (!h3Home) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title={t('cuidador:cobertura.titulo')} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {t('cuidador:cobertura.sin_direccion')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('cuidador:cobertura.titulo')}
        subtitle={t('cuidador:cobertura.radio_subtitulo')}
      />

      <View style={styles.contenido}>
        {RADIOS_COBERTURA.map(r => {
          const activo = r === elegido
          return (
            <Pressable
              key={r}
              onPress={() => setElegido(r)}
              style={[styles.opcion, activo && styles.opcionActiva]}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
            >
              <Text style={styles.opcionTitulo}>
                {t(`cuidador:cobertura.radio_${r}_titulo`)}
              </Text>
              <Text style={styles.opcionDetalle}>
                {t(`cuidador:cobertura.radio_${r}_detalle`)}
              </Text>
            </Pressable>
          )
        })}

        {manualPermitido && hayManual && (
          <Text style={styles.nota}>
            {t('cuidador:cobertura.manual_activa')}
          </Text>
        )}

        {manualPermitido && (
          <Button
            title={t('cuidador:cobertura.elegir_en_mapa')}
            variant="contorno"
            onPress={() => navigation.navigate('CoberturaManualCuidador')}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Button
          title={t('cuidador:cobertura.guardar')}
          onPress={guardar}
          loading={saving}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.BASE },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: COLOR.SUBTEXTO,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  contenido: { flex: 1, padding: SPACING.md, gap: SPACING.base },
  opcion: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
    gap: SPACING.xs,
  },
  opcionActiva: { borderColor: COLOR.PRIMARIO, backgroundColor: COLOR.SECUNDARIO },
  opcionTitulo: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '600' },
  opcionDetalle: { color: COLOR.SUBTEXTO, fontSize: 14, lineHeight: 20 },
  nota: { color: COLOR.ALERTA, fontSize: 13, lineHeight: 18 },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
})
