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

const fecha = (v?: VersionApp<unknown>['vigente_desde']) =>
  v ? v.toDate().toLocaleString('es-CO') : '—'

export const PanelVersiones: React.FC<{ tipo: string; soloLectura?: boolean }> = ({
  tipo,
  soloLectura = false,
}) => {
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
        '✅ Reactivada',
        r.nueva
          ? `El contenido de la v${version} rige ahora como v${r.version}.`
          : 'Ese contenido ya es el vigente.'
      )
      setReactivando(null)
      setMotivo('')
    } catch (e) {
      Alert.alert('❌ No se reactivó', mensajeErrorCallable(e))
    } finally {
      setEnviando(false)
    }
  }

  if (error) return <Text style={estilosAdmin.errores}>{error}</Text>
  if (!versiones.length) {
    return <Text style={estilosAdmin.ayuda}>Aún no hay versiones publicadas.</Text>
  }

  return (
    <View>
      {versiones.map(v => (
        <View key={v.version} style={styles.fila}>
          <Text style={styles.titulo}>
            v{v.version}
            <Text style={v.estado === 'ACTIVA' ? styles.activa : styles.historica}>
              {'  '}
              {v.estado === 'ACTIVA' ? 'VIGENTE' : 'HISTÓRICA'}
            </Text>
          </Text>
          <Text style={styles.detalle}>{v.motivo}</Text>
          <Text style={styles.detalle}>
            Desde {fecha(v.vigente_desde)}
            {v.vigente_hasta ? ` hasta ${fecha(v.vigente_hasta)}` : ''}
          </Text>
          <Text style={styles.detalle}>
            Por <NombreUsuario uid={v.publicado_por} style={styles.detalle} /> ·
            huella {v.hash.slice(7, 15)}
          </Text>
          {v.estado === 'HISTORICA' &&
            !soloLectura &&
            (reactivando === v.version ? (
              <View>
                <CampoMotivo value={motivo} onChange={setMotivo} />
                <View style={estilosAdmin.acciones}>
                  <Button
                    title={enviando ? 'Reactivando…' : `Volver a la v${v.version}`}
                    onPress={() => reactivar(v.version)}
                    variant="primario"
                    disabled={enviando || validarMotivo(motivo) !== null}
                  />
                  <Button
                    title="Cancelar"
                    onPress={() => setReactivando(null)}
                    variant="secundario"
                    disabled={enviando}
                  />
                </View>
              </View>
            ) : (
              <Button
                title="Reactivar"
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
