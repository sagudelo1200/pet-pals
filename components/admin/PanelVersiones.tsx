/**
 * PanelVersiones
 * Últimas versiones de cualquier tipo versionable (política comercial,
 * consentimientos, ...): qué versión rige, desde cuándo, quién y por qué.
 * Una versión anterior se puede volver a poner vigente: se publica como
 * copia nueva, así el historial nunca se reescribe. Con `soloLectura`
 * (contador) solo se consulta.
 */
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import {
  escucharVersionVigente,
  listarVersiones,
  ServicioVersionado,
  type VersionApp,
} from '@/services/firebase/versionado'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import { validarMotivo } from '@/functions/src/compartido/versionables'
import { CampoMotivo } from './CampoMotivo'
import { NombreUsuario } from './NombreUsuario'
import { estilosAdmin } from './estilosAdmin'
import { useTranslation } from 'react-i18next'
import { localeActual } from '@/utils/locale'

const fecha = (v?: VersionApp<unknown>['vigente_desde']) =>
  v ? v.toDate().toLocaleString(localeActual()) : '—'

export const PanelVersiones: React.FC<{
  tipo: string
  soloLectura?: boolean
}> = ({ tipo, soloLectura = false }) => {
  const { t } = useTranslation('admin')
  const [versiones, setVersiones] = useState<VersionApp<unknown>[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reactivando, setReactivando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Recarga el historial cada vez que cambia la versión vigente
  useEffect(
    () =>
      escucharVersionVigente(
        tipo,
        () =>
          listarVersiones(tipo).then(
            v => {
              setVersiones(v)
              setError(null)
            },
            e => setError(e.message)
          ),
        e => setError(e.message)
      ),
    [tipo]
  )

  const reactivar = async (version: number) => {
    setEnviando(true)
    try {
      const r = await ServicioVersionado.reactivar({ tipo, version, motivo })
      Alert.alert(
        t('versiones.reactivada'),
        r.nueva
          ? t('versiones.reactivada_desc', { version, nueva: r.version })
          : t('versiones.ya_vigente')
      )
      setReactivando(null)
      setMotivo('')
    } catch (e) {
      Alert.alert(t('versiones.no_reactivo'), mensajeErrorCallable(e))
    } finally {
      setEnviando(false)
    }
  }

  if (error) return <Text style={estilosAdmin.errores}>{error}</Text>
  if (!versiones.length) {
    return <Text style={estilosAdmin.ayuda}>{t('versiones.vacio')}</Text>
  }

  return (
    <View>
      {versiones.map(v => (
        <View key={v.version} style={styles.fila}>
          <Text style={styles.titulo}>
            v{v.version}
            <Text
              style={v.estado === 'ACTIVA' ? styles.activa : styles.historica}
            >
              {'  '}
              {v.estado === 'ACTIVA'
                ? t('versiones.vigente')
                : t('versiones.historica')}
            </Text>
          </Text>
          <Text style={styles.detalle}>{v.motivo}</Text>
          <Text style={styles.detalle}>
            {v.vigente_hasta
              ? t('versiones.desde_hasta', {
                  desde: fecha(v.vigente_desde),
                  hasta: fecha(v.vigente_hasta),
                })
              : t('versiones.desde', { desde: fecha(v.vigente_desde) })}
          </Text>
          <Text style={styles.detalle}>
            {t('versiones.por')}
            <NombreUsuario uid={v.publicado_por} style={styles.detalle} />
            {t('versiones.huella', { hash: v.hash.slice(7, 15) })}
          </Text>
          {v.estado === 'HISTORICA' &&
            !soloLectura &&
            (reactivando === v.version ? (
              <View>
                <CampoMotivo value={motivo} onChange={setMotivo} />
                <View style={estilosAdmin.acciones}>
                  <Button
                    title={
                      enviando
                        ? t('versiones.reactivando')
                        : t('versiones.volver_a', { version: v.version })
                    }
                    onPress={() => reactivar(v.version)}
                    variant="primario"
                    disabled={enviando || validarMotivo(motivo) !== null}
                  />
                  <Button
                    title={t('comun:cancelar')}
                    onPress={() => setReactivando(null)}
                    variant="secundario"
                    disabled={enviando}
                  />
                </View>
              </View>
            ) : (
              <Button
                title={t('versiones.reactivar')}
                onPress={() => {
                  setReactivando(v.version)
                  setMotivo('')
                }}
                variant="secundario"
                size="sm"
                style={styles.botonReactivar}
              />
            ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  fila: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    gap: 2,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  activa: {
    fontSize: 12,
    color: COLOR.EXITO,
  },
  historica: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  detalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  botonReactivar: {
    marginTop: 8,
  },
})
