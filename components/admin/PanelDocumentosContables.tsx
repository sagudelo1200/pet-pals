/**
 * PanelDocumentosContables
 * Documentos de Paw-Path que no se pudieron reflejar en el sistema contable
 * (Siigo). El documento ya existe en Paw-Path; aquí solo se reintenta el envío.
 * Con `soloLectura` (contador) muestra los documentos más recientes y su
 * estado de envío, sin acciones.
 */
import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { collection, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/firebase.config'
import { COLOR } from '@/constants'
import { Button, Card } from '@/components/ui'
import { useCollection } from '@/hooks'
import { formatearCOP } from '@/logic/comercial'
import {
  ServicioEconomia,
  mensajeErrorEconomia,
} from '@/services/firebase/economia'
import type { DocumentoContable } from '@/models/operacionesEconomicas'
import { NombreUsuario } from './NombreUsuario'
import { useTranslation } from 'react-i18next'

const RECIENTES = 20

export const PanelDocumentosContables: React.FC<{ soloLectura?: boolean }> = ({
  soloLectura = false,
}) => {
  const { t } = useTranslation('admin')
  const [reenviando, setReenviando] = useState<string | null>(null)
  const consulta = useMemo(
    () =>
      soloLectura
        ? query(
            collection(db, 'documentos_contables'),
            orderBy('fecha', 'desc'),
            limit(RECIENTES)
          )
        : query(
            collection(db, 'documentos_contables'),
            where('envio.estado', '==', 'ERROR')
          ),
    [soloLectura]
  )
  const { data } = useCollection<any>(consulta, { listen: true })
  const documentos = data as unknown as DocumentoContable[]

  const reenviar = async (id: string) => {
    setReenviando(id)
    try {
      const { estado } = await ServicioEconomia.reenviarDocumento({
        documentoId: id,
      })
      if (estado !== 'ENVIADO') {
        Alert.alert(
          t('documentos.sin_enviar'),
          t('documentos.quedo_en_estado', { estado })
        )
      }
    } catch (e) {
      Alert.alert(t('documentos.error'), mensajeErrorEconomia(e))
    } finally {
      setReenviando(null)
    }
  }

  if (documentos.length === 0) {
    return (
      <Text style={styles.vacio}>
        {soloLectura ? t('documentos.vacio_lectura') : t('documentos.vacio')}
      </Text>
    )
  }

  return (
    <View>
      {documentos.map(d => (
        <Card key={d.id} style={styles.card}>
          <Text style={styles.titulo}>
            {t(`documentos.tipos.${d.tipo}`)} · {formatearCOP(d.total)}
          </Text>
          <Text style={styles.detalle}>
            {soloLectura ? (
              <>
                {`${d.id} · `}
                <NombreUsuario uid={d.tercero.uid} style={styles.detalle} />
                {t('documentos.envio', { estado: d.envio.estado })}
              </>
            ) : (
              t('documentos.intentos', {
                id: d.id,
                count: d.envio.intentos,
              })
            )}
          </Text>
          {d.envio.error && <Text style={styles.error}>{d.envio.error}</Text>}
          {!soloLectura && (
            <Button
              title={
                reenviando === d.id
                  ? t('documentos.reintentando')
                  : t('documentos.reintentar')
              }
              onPress={() => reenviar(d.id)}
              variant="contorno"
              disabled={reenviando === d.id}
            />
          )}
        </Card>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.TEXTO,
  },
  detalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
  error: {
    fontSize: 12,
    color: COLOR.ERROR,
  },
  vacio: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
})
