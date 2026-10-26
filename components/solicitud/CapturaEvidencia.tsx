import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { CapturaImagen } from '@/components/archivos/CapturaImagen'
import { rutaDeDestino } from '@/logic/evidencias/evidencia'

interface Props {
  servicio: string
  requisito: string
  /** Nombre del archivo en el catálogo (frente, reverso, certificado...). */
  archivo: string
  etiqueta: string
  /** Si ya hay un archivo subido; sin indicarlo, se busca. */
  subido?: boolean
  onSubida?: () => void
  disabled?: boolean
}

/**
 * Un archivo de evidencia de una solicitud de servicio: el catálogo decide la
 * ruta (y si el archivo se pide); subir y mostrar lo hace CapturaImagen.
 */
export const CapturaEvidencia: React.FC<Props> = ({
  servicio,
  requisito,
  archivo,
  ...resto
}) => {
  const { user } = useAuth()
  const ruta = rutaDeDestino({ uid: user?.uid ?? '', servicio, requisito, archivo })
  return <CapturaImagen ruta={ruta} perfil="evidencia" {...resto} />
}
