/**
 * PanelEntregasPorRevisar
 * Cola del equipo para dos casos que no se resuelven solos:
 * - Entregas sin confirmar: el cuidador finalizó y el tutor no ingresó su
 *   código (o se bloqueó). El equipo cierra a favor del cuidador (se genera el
 *   cobro y el tutor puede reclamar) o abre una disputa.
 * - Reclamos abiertos: el tutor dijo "no estoy de acuerdo" sobre un cobro
 *   cerrado por el equipo. El equipo mantiene o anula el cobro.
 * Cada decisión pide un motivo y queda registrada.
 */
import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { collection, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { COLOR } from '@/constants'
import { Button, Card } from '@/components/ui'
import { useCollection } from '@/hooks'
import { formatearCOP } from '@/logic/comercial'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import {
  resolverEntregaPendiente,
  resolverReclamoCobro,
} from '@/services/firebase/entrega'
import { validarMotivo } from '@/functions/src/compartido/versionables'
import { NombreUsuario } from './NombreUsuario'
import { estilosAdmin } from './estilosAdmin'

const HORA_MS = 60 * 60 * 1000
const aMs = (v: any): number => v?.toMillis?.() ?? new Date(v).getTime()
const hace = (v: any) =>
  `hace ${Math.max(0, Math.floor((Date.now() - aMs(v)) / HORA_MS))} h`

/** Motivo obligatorio + acciones de una decisión del equipo. */
const Decision: React.FC<{
  acciones: Array<{
    titulo: string
    variante?: 'primario' | 'contorno'
    onPress: (_motivo: string) => Promise<void>
  }>
}> = ({ acciones }) => {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const motivoValido = validarMotivo(motivo) === null

  const ejecutar = async (accion: (_m: string) => Promise<void>) => {
    setEnviando(true)
    try {
      await accion(motivo.trim())
      setMotivo('')
    } catch (e) {
      Alert.alert('❌ No se pudo', mensajeErrorCallable(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <View>
      <TextInput
        style={[estilosAdmin.input, styles.motivo]}
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Motivo de la decisión (queda registrado)"
        placeholderTextColor={COLOR.SUBTEXTO}
        maxLength={300}
      />
      <View style={styles.acciones}>
        {acciones.map(a => (
          <Button
            key={a.titulo}
            title={a.titulo}
            variant={a.variante ?? 'primario'}
            disabled={enviando || !motivoValido}
            onPress={() => ejecutar(a.onPress)}
          />
        ))}
      </View>
    </View>
  )
}

export const PanelEntregasPorRevisar: React.FC = () => {
  const porRevisar = useMemo(
    () =>
      query(
        collection(db, 'operaciones'),
        where('requiere_revision', '==', true)
      ),
    []
  )
  const reclamos = useMemo(
    () =>
      query(
        collection(db, 'obligaciones'),
        where('reclamo.estado', '==', 'ABIERTO')
      ),
    []
  )
  const { data: paseosData } = useCollection<any>(porRevisar, { listen: true })
  const { data: reclamosData } = useCollection<any>(reclamos, { listen: true })

  // La marca puede quedar de un paseo que el tutor confirmó después
  const paseos = (paseosData as any[]).filter(p => p.estado === 'FINALIZADO')
  const abiertos = reclamosData as any[]

  return (
    <View>
      <Text style={estilosAdmin.label}>Entregas sin confirmar</Text>
      {paseos.length === 0 ? (
        <Text style={estilosAdmin.ayuda}>No hay entregas por revisar</Text>
      ) : (
        paseos.map(p => (
          <Card key={p.id} style={styles.card}>
            <Text style={styles.titulo}>
              {p.mascota_nombre_visual || 'Paseo'}
            </Text>
            <Text style={styles.detalle}>
              Tutor: <NombreUsuario uid={p.creado_por} style={styles.detalle} />
              {p.id_cuidador ? ' · Cuidador: ' : ''}
              {p.id_cuidador && (
                <NombreUsuario uid={p.id_cuidador} style={styles.detalle} />
              )}
            </Text>
            <Text style={styles.detalle}>
              Finalizado {hace(p.fecha_fin_real ?? p.requiere_revision_desde)}
              {p.foto_entrega_grupo ? ' · con foto del grupo' : ' · sin foto'}
            </Text>
            <Decision
              acciones={[
                {
                  titulo: 'Cerrar a favor del cuidador',
                  onPress: async motivo => {
                    await resolverEntregaPendiente({
                      paseoId: p.id,
                      decision: 'cerrar_a_favor_cuidador',
                      motivo,
                    })
                  },
                },
                {
                  titulo: 'Abrir disputa',
                  variante: 'contorno',
                  onPress: async motivo => {
                    await resolverEntregaPendiente({
                      paseoId: p.id,
                      decision: 'abrir_disputa',
                      motivo,
                    })
                  },
                },
              ]}
            />
          </Card>
        ))
      )}

      <Text style={estilosAdmin.label}>Reclamos de cobro</Text>
      {abiertos.length === 0 ? (
        <Text style={estilosAdmin.ayuda}>No hay reclamos abiertos</Text>
      ) : (
        abiertos.map(o => (
          <Card key={o.id} style={styles.card}>
            <Text style={styles.titulo}>{formatearCOP(o.valor)}</Text>
            <Text style={styles.detalle}>
              Tutor: <NombreUsuario uid={o.deudor} style={styles.detalle} /> ·{' '}
              {hace(o.reclamo?.en)}
            </Text>
            <Text style={styles.detalle}>“{o.reclamo?.motivo}”</Text>
            <Decision
              acciones={[
                {
                  titulo: 'Mantener cobro',
                  onPress: async motivo => {
                    await resolverReclamoCobro({
                      obligacionId: o.id,
                      decision: 'mantener',
                      motivo,
                    })
                  },
                },
                {
                  titulo: 'Anular cobro',
                  variante: 'contorno',
                  onPress: async motivo => {
                    await resolverReclamoCobro({
                      obligacionId: o.id,
                      decision: 'anular',
                      motivo,
                    })
                  },
                },
              ]}
            />
          </Card>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: 12, marginTop: 8 },
  titulo: { fontSize: 15, fontWeight: '700', color: COLOR.TEXTO },
  detalle: { fontSize: 12, color: COLOR.SUBTEXTO, marginTop: 2 },
  motivo: { marginTop: 10 },
  acciones: { marginTop: 10, gap: 8 },
})
