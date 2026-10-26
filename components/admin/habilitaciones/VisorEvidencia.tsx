import React, { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { COLOR } from '@/constants'
import { Button } from '@/components/ui'
import {
  evidenciaHabilitacion,
} from '@/services/firebase/habilitaciones'
import { mensajeErrorCallable } from '@/services/firebase/callable'
import type { ArchivoEvidencia } from '@/functions/src/compartido/habilitacion'

interface Props {
  habilitacionId: string
  requisito: string
}

/**
 * Los archivos que subió la persona para un requisito. Se piden al servidor
 * solo cuando el equipo los quiere ver (son privados y pesan).
 */
export const VisorEvidencia: React.FC<Props> = ({
  habilitacionId,
  requisito,
}) => {
  const [archivos, setArchivos] = useState<ArchivoEvidencia[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const r = await evidenciaHabilitacion({ id: habilitacionId, requisito })
      setArchivos(r.archivos)
    } catch (e) {
      setError(mensajeErrorCallable(e))
    } finally {
      setCargando(false)
    }
  }

  if (!archivos) {
    return (
      <View style={styles.contenedor}>
        <Button
          title="Ver archivos"
          icon="image"
          variant="contorno"
          size="sm"
          loading={cargando}
          onPress={cargar}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    )
  }

  return (
    <View style={styles.contenedor}>
      {cargando && <ActivityIndicator color={COLOR.PRIMARIO} />}
      {archivos.map(a => (
        <View key={a.archivo} style={styles.archivo}>
          <Text style={styles.nombre}>{a.archivo}</Text>
          {!a.existe || !a.base64 ? (
            <Text style={styles.error}>No se subió este archivo</Text>
          ) : a.contentType?.startsWith('image/') ? (
            <Image
              source={{ uri: `data:${a.contentType};base64,${a.base64}` }}
              style={styles.imagen}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.detalle}>
              Archivo {a.contentType}: no se puede mostrar aquí
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: { gap: 8, marginTop: 8 },
  archivo: { gap: 4 },
  nombre: {
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  imagen: {
    width: '100%',
    aspectRatio: 1.4,
    backgroundColor: COLOR.BASE,
    borderRadius: 8,
  },
  detalle: { color: COLOR.SUBTEXTO, fontSize: 12 },
  error: { color: COLOR.ERROR, fontSize: 12 },
})
