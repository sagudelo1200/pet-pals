import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import ImagePicker from '@/components/ui/ImagePicker'
import { useArchivo } from '@/hooks/archivos/useArchivo'
import { ERRORES_ARCHIVO } from '@/logic/archivos/gestor'
import type { TipoPerfilArchivo } from '@/functions/src/compartido/archivos'

interface Props {
  /** Ruta de Storage donde se guarda (null = aún no se puede subir). */
  ruta: string | null
  perfil: TipoPerfilArchivo
  etiqueta: string
  /**
   * Si ya hay un archivo en esa ruta. Sin indicarlo, se busca: lo que ya estaba
   * subido se muestra al abrir. `false` evita buscar.
   */
  subido?: boolean
  /** Se subió un archivo nuevo. */
  onSubida?: () => void
  disabled?: boolean
}

const CLAVE_ERROR: Record<string, string> = {
  [ERRORES_ARCHIVO.IMAGEN_ILEGIBLE]: 'comun:archivos.error_imagen',
  [ERRORES_ARCHIVO.MUY_GRANDE]: 'comun:archivos.error_grande',
}

/**
 * Elegir o tomar una foto y subirla al instante (reducida y comprimida) a una
 * ruta de Storage. Sirve para cualquier uso: documentos, perfil, mascotas...
 */
export const CapturaImagen: React.FC<Props> = ({
  ruta,
  perfil,
  etiqueta,
  subido,
  onSubida,
  disabled = false,
}) => {
  const { t } = useTranslation()
  const { estado, error, subir, obtenerVista } = useArchivo(ruta, perfil)
  const [vista, setVista] = useState<string | undefined>(undefined)

  // Lo que ya estaba subido se muestra al abrir la pantalla
  useEffect(() => {
    if (subido === false || vista || !ruta) return undefined
    let activo = true
    void obtenerVista().then(url => {
      if (activo && url) setVista(url)
    })
    return () => {
      activo = false
    }
  }, [subido, vista, ruta, obtenerVista])

  const alElegir = async (
    uri: string,
    medidas?: { ancho: number; alto: number }
  ) => {
    setVista(uri)
    if (await subir(uri, medidas)) onSubida?.()
  }

  const mensaje =
    estado === 'error'
      ? t(CLAVE_ERROR[error ?? ''] ?? 'comun:archivos.error_subida')
      : undefined

  return (
    <View>
      <ImagePicker
        label={etiqueta}
        value={vista}
        onValueChange={alElegir}
        allowsEditing={false}
        disabled={disabled || !ruta || estado === 'subiendo'}
        errorText={mensaje}
        placeholder={t('comun:archivos.agregar')}
      />
      {estado === 'subiendo' && (
        <Text style={styles.estado}>{t('comun:archivos.subiendo')}</Text>
      )}
      {estado === 'subida' && (
        <Text style={[styles.estado, styles.ok]}>{t('comun:archivos.subida')}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  estado: { color: COLOR.SUBTEXTO, fontSize: 12, marginTop: -8, marginBottom: 12 },
  ok: { color: COLOR.EXITO },
})
