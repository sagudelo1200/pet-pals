import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontAwesome5 } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { useCierrePaseo } from '@/hooks/cuidador/useCierrePaseo'
import { EJES, planDeCierre } from '@/logic/evaluaciones/cierrePaseo'
import {
  OPCIONES_COMPORTAMIENTO,
  keyI18nChip,
} from '@/logic/mascotas/comportamiento'
import type { AuthStackParamList } from '@/navigation/types'

type RouteProps = RouteProp<AuthStackParamList, 'CierrePaseo'>

/**
 * Cierre del paseo del cuidador, en una sola pantalla y todo opcional:
 * cómo estuvo cada mascota (un toque por eje) y cómo fue el tutor (una
 * estrella). Reemplaza el recorrido de varias pantallas y avisos de antes.
 */
export default function CierrePaseo() {
  const { t } = useTranslation('evaluaciones')
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { paseoId, tiempo, mascota } = useRoute<RouteProps>().params

  const cierre = useCierrePaseo(paseoId)
  const [conNota, setConNota] = useState(false)

  const hayAlgoMarcado = (() => {
    const plan = planDeCierre(
      { observaciones: cierre.observaciones, ratingTutor: cierre.ratingTutor },
      cierre.mascotas.map(m => m.id)
    )
    return (
      plan.observar.length > 0 ||
      plan.incompletas.length > 0 ||
      plan.evaluarTutor
    )
  })()

  const salir = () => navigation.popToTop()

  const terminar = async () => {
    const guardar = async () => {
      const resultado = await cierre.terminar()
      if (resultado.ok) {
        salir()
        return
      }
      Alert.alert(
        t('comun:error'),
        resultado.motivo === 'incompleta'
          ? t('cierre_incompleta', { nombre: resultado.mascota })
          : t('cierre_error')
      )
    }
    // Anti-troll: una calificación baja pide confirmación antes de enviarse
    if (cierre.ratingTutor >= 1 && cierre.ratingTutor <= 2) {
      Alert.alert(
        t('confirmar_baja_titulo'),
        t('confirmar_baja_mensaje', { rating: cierre.ratingTutor }),
        [
          { text: t('comun:cancelar'), style: 'cancel' },
          {
            text: t('comun:aceptar'),
            onPress: () => {
              void guardar()
            },
          },
        ]
      )
      return
    }
    await guardar()
  }

  if (cierre.cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  const nombreTutor = cierre.nombreTutor || t('cierre_tutor_generico')
  const nombresMascotas =
    mascota || cierre.mascotas.map(m => m.nombre).join(', ')

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.encabezado}>
          <View style={styles.icono}>
            <FontAwesome5 name="check" size={26} color={COLOR.EXITO} />
          </View>
          <Text style={styles.titulo}>{t('cierre_titulo')}</Text>
          <Text style={styles.subtitulo}>
            {tiempo
              ? t('cierre_subtitulo', { mascota: nombresMascotas, tiempo })
              : t('cierre_subtitulo_sin_tiempo', { mascota: nombresMascotas })}
          </Text>
        </View>

        {cierre.mascotas.map(m => (
          <View key={m.id} style={styles.tarjeta}>
            <Text style={styles.pregunta}>
              {t('cierre_mascota', { nombre: m.nombre })}
            </Text>
            <Text style={styles.ayuda}>{t('cierre_mascota_ayuda')}</Text>
            {EJES.map(eje => (
              <View key={eje} style={styles.eje}>
                <Text style={styles.etiqueta}>{t(`eje_${eje}`)}</Text>
                <View style={styles.chips}>
                  {OPCIONES_COMPORTAMIENTO[eje].map(opcion => {
                    const activo = cierre.observaciones[m.id]?.[eje] === opcion
                    return (
                      <TouchableOpacity
                        key={opcion}
                        disabled={cierre.enviando}
                        onPress={() => cierre.marcar(m.id, eje, opcion)}
                        style={[styles.chip, activo && styles.chipActivo]}
                      >
                        <Text
                          style={[
                            styles.chipTexto,
                            activo && styles.chipTextoActivo,
                          ]}
                        >
                          {t(keyI18nChip(eje, opcion), {
                            defaultValue: opcion,
                          })}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.tarjeta}>
          <Text style={styles.pregunta}>
            {t('cierre_tutor', { nombre: nombreTutor })}
          </Text>
          <Text style={styles.ayuda}>{t('cierre_tutor_ayuda')}</Text>
          <View style={styles.estrellas}>
            {[1, 2, 3, 4, 5].map(valor => (
              <TouchableOpacity
                key={valor}
                disabled={cierre.enviando}
                onPress={() =>
                  cierre.setRatingTutor(
                    cierre.ratingTutor === valor ? 0 : valor
                  )
                }
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <FontAwesome5
                  name="star"
                  solid={valor <= cierre.ratingTutor}
                  size={34}
                  color={
                    valor <= cierre.ratingTutor ? COLOR.ORO : COLOR.INACTIVO
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
          {cierre.ratingTutor > 0 &&
            (conNota ? (
              <TextInput
                style={styles.nota}
                placeholder={t('comentario_privado_placeholder')}
                placeholderTextColor={COLOR.SUBTEXTO}
                value={cierre.notaTutor}
                onChangeText={cierre.setNotaTutor}
                editable={!cierre.enviando}
                multiline
                maxLength={300}
              />
            ) : (
              <TouchableOpacity onPress={() => setConNota(true)}>
                <Text style={styles.enlace}>{t('cierre_nota')}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title={hayAlgoMarcado ? t('cierre_guardar') : t('cierre_listo')}
          onPress={() => void terminar()}
          loading={cierre.enviando}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: COLOR.BASE },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.BASE,
  },
  contenido: { padding: 20, gap: 14, paddingBottom: 24 },
  encabezado: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLOR.EXITO}22`,
    marginBottom: 4,
  },
  titulo: { color: COLOR.TEXTO, fontSize: 24, fontWeight: '800' },
  subtitulo: { color: COLOR.SUBTEXTO, fontSize: 14, textAlign: 'center' },
  tarjeta: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  pregunta: { color: COLOR.TEXTO, fontSize: 16, fontWeight: '700' },
  ayuda: { color: COLOR.SUBTEXTO, fontSize: 12, marginBottom: 4 },
  eje: { gap: 6, marginTop: 4 },
  etiqueta: { color: COLOR.SUBTEXTO, fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  chipActivo: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: `${COLOR.PRIMARIO}1A`,
  },
  chipTexto: { color: COLOR.TEXTO, fontSize: 13, fontWeight: '600' },
  chipTextoActivo: { color: COLOR.PRIMARIO, fontWeight: '700' },
  estrellas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  enlace: {
    color: COLOR.PRIMARIO,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  nota: {
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    borderRadius: 10,
    color: COLOR.TEXTO,
    fontSize: 14,
    padding: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pie: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    backgroundColor: COLOR.BASE,
  },
})
