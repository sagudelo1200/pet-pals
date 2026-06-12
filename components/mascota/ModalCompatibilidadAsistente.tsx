import React from 'react'
import { useTranslation } from 'react-i18next'
import { atributosCompatibilidad } from '@/logic/mascotas/compatibilidadAsistente'
import {
  ModalAsistenteGenerico,
  ConfiguracionModalAsistente,
} from '@/components/mascota/ModalAsistenteGenerico'
import type { Mascota, CompatibilidadPaseo } from '@/models/Mascota'

// Importar imágenes SVG
import PaseadorPerrosSvg from '@/assets/imgs/undraw/paseador_perros.svg'
import PaseoTranquiloSvg from '@/assets/imgs/undraw/paseo_tranquilo.svg'
import PerroSvg from '@/assets/imgs/undraw/perro.svg'
import DiaEnElParqueSvg from '@/assets/imgs/undraw/dia_en_el_parque.svg'

// Mapeo de imágenes por atributo
const IMAGENES_POR_ATRIBUTO: Record<string, any> = {
  ritmo: PaseadorPerrosSvg,
  compania: PaseoTranquiloSvg,
  tolerancia: PerroSvg,
  tamaño_compatible: DiaEnElParqueSvg,
}

// Configuración específica para compatibilidad
const getConfigCompatibilidad = (t: any): ConfiguracionModalAsistente => ({
  atributos: atributosCompatibilidad as any,
  imagenesPorAtributo: IMAGENES_POR_ATRIBUTO,
  titulo: t('mascotas:asistente.titulo_compatibilidad'),
  columnasOpciones: 2, // Grid de 2 columnas sin scroll vertical
  obtenerValor: (atributo, mascota) => {
    // Los valores de compatibilidad están anidados en tutor
    return mascota.compatibilidad_paseo?.tutor?.[
      atributo.key as 'ritmo' | 'compania' | 'tolerancia' | 'tamaño_compatible'
    ]
  },
  construirPayload: (valores: Record<string, any>) => {
    // Construir estructura anidada con timestamp
    const payload: Partial<Mascota> = {
      compatibilidad_paseo: {
        tutor: {
          ...valores,
          timestamp: Date.now(),
        },
      } as CompatibilidadPaseo,
    }
    return payload
  },
})

interface ModalCompatibilidadAsistenteProps {
  visible: boolean
  petName: string
  mascotaId: string
  initialCompatibilidadData?: Partial<Mascota>
  onClose: () => void
  // eslint-disable-next-line
  onCompleted?: (savedData: Partial<Mascota>) => void
}

/**
 * Wrapper del modal genérico especializado para compatibilidad de paseo
 */
export const ModalCompatibilidadAsistente: React.FC<
  ModalCompatibilidadAsistenteProps
> = ({
  visible,
  petName,
  mascotaId,
  initialCompatibilidadData,
  onClose,
  onCompleted,
}) => {
  const { t } = useTranslation()
  const CONFIG_COMPATIBILIDAD = getConfigCompatibilidad(t)

  return (
    <ModalAsistenteGenerico
      visible={visible}
      petName={petName}
      mascotaId={mascotaId}
      initialData={initialCompatibilidadData}
      config={CONFIG_COMPATIBILIDAD}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  )
}
