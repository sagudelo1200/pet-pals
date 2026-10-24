/**
 * ComoLlegoMascota
 * Un toque del tutor al recibir a su mascota: ¿cómo llegó? Es la señal más
 * valiosa del paseo (si la mascota estuvo bien) y alimenta lo que Paw-Path
 * sabe de ella. Es opcional: se puede omitir. Con varias mascotas, una sola
 * respuesta vale para todas, o se puede responder por cada una.
 */
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import { useCollection } from '@/hooks'
import { registrarLlegada } from '@/services/firebase/expediente'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import { listarNombres } from '@/logic/paseos/nombresMascotas'
import {
  EMOJI_DE_LLEGADA,
  OPCIONES_DE_LLEGADA,
  agruparRespuestas,
  claveDeLlegada,
  respuestasCompletas,
} from '@/logic/paseos/llegada'
import type { Llegada } from '@/functions/src/compartido/expediente'

interface Props {
  paseoId: string
  /** Se llama al responder o al omitir. */
  onTerminado: () => void
}

export const ComoLlegoMascota: React.FC<Props> = ({ paseoId, onTerminado }) => {
  const { t } = useTranslation(['paseos', 'comun'])
  const { data } = useCollection(`operaciones/${paseoId}/mascotas`)
  const mascotas = useMemo(
    () =>
      ((data ?? []) as any[]).map(m => ({
        id: String(m.id),
        nombre: String(m.nombre ?? '').trim(),
      })),
    [data]
  )
  const nombres = listarNombres(mascotas.map(m => m.nombre))
  const varias = mascotas.length > 1

  const [porCadaUna, setPorCadaUna] = useState(false)
  const [respuestas, setRespuestas] = useState<Record<string, Llegada>>({})
  const [enviando, setEnviando] = useState(false)

  const ids = mascotas.map(m => m.id)

  const enviar = async (grupos: ReturnType<typeof agruparRespuestas>) => {
    setEnviando(true)
    try {
      for (const g of grupos) {
        await registrarLlegada({
          paseoId,
          llegada: g.llegada,
          ...(g.mascotaIds && { mascotaIds: g.mascotaIds }),
        })
      }
      onTerminado()
    } catch (e) {
      Alert.alert(t('paseos:llegada.error'), mensajeErrorCallable(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>
        {nombres
          ? t('paseos:llegada.titulo', { nombres })
          : t('paseos:llegada.titulo_sin_nombre')}
      </Text>
      <Text style={styles.subtitulo}>{t('paseos:llegada.subtitulo')}</Text>

      {!porCadaUna &&
        OPCIONES_DE_LLEGADA.map(llegada => (
          <Pressable
            key={llegada}
            style={styles.opcion}
            onPress={() => void enviar([{ llegada }])}
            disabled={enviando}
          >
            <Text style={styles.emoji}>{EMOJI_DE_LLEGADA[llegada]}</Text>
            <Text style={styles.textoOpcion}>{t(claveDeLlegada(llegada))}</Text>
          </Pressable>
        ))}

      {porCadaUna && (
        <>
          {mascotas.map(m => (
            <View key={m.id} style={styles.bloqueMascota}>
              <Text style={styles.nombreMascota}>
                {m.nombre || t('paseos:llegada.mascota_sin_nombre')}
              </Text>
              <View style={styles.chips}>
                {OPCIONES_DE_LLEGADA.map(llegada => {
                  const activa = respuestas[m.id] === llegada
                  return (
                    <Pressable
                      key={llegada}
                      style={[styles.chip, activa && styles.chipActivo]}
                      onPress={() =>
                        setRespuestas({ ...respuestas, [m.id]: llegada })
                      }
                      disabled={enviando}
                    >
                      <Text
                        style={[
                          styles.chipTexto,
                          activa && styles.chipTextoActivo,
                        ]}
                      >
                        {EMOJI_DE_LLEGADA[llegada]} {t(claveDeLlegada(llegada))}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))}
          <Button
            title={t('paseos:llegada.enviar')}
            onPress={() => void enviar(agruparRespuestas(respuestas, ids))}
            disabled={enviando || !respuestasCompletas(respuestas, ids)}
          />
        </>
      )}

      {varias && (
        <Pressable
          onPress={() => setPorCadaUna(!porCadaUna)}
          disabled={enviando}
          style={styles.enlace}
        >
          <Text style={styles.textoEnlace}>
            {porCadaUna
              ? t('paseos:llegada.igual_para_todas')
              : t('paseos:llegada.distinto_para_cada_una')}
          </Text>
        </Pressable>
      )}

      {enviando ? (
        <ActivityIndicator color={COLOR.PRIMARIO} style={styles.cargando} />
      ) : (
        <Pressable onPress={onTerminado} style={styles.enlace}>
          <Text style={styles.textoOmitir}>{t('paseos:llegada.omitir')}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { width: '100%', maxWidth: 420 },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  emoji: { fontSize: 28, marginRight: 14 },
  textoOpcion: { fontSize: 16, fontWeight: '600', color: COLOR.TEXTO },
  bloqueMascota: { marginBottom: 16 },
  nombreMascota: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  chipActivo: { backgroundColor: COLOR.PRIMARIO, borderColor: COLOR.PRIMARIO },
  chipTexto: { fontSize: 13, fontWeight: '600', color: COLOR.TEXTO },
  chipTextoActivo: { color: 'white' },
  enlace: { alignItems: 'center', paddingVertical: 12 },
  textoEnlace: { fontSize: 14, fontWeight: '600', color: COLOR.PRIMARIO },
  textoOmitir: { fontSize: 14, color: COLOR.SUBTEXTO },
  cargando: { marginTop: 12 },
})
