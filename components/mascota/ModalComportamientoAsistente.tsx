import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  atributosComportamiento,
  NivelComportamiento,
} from '@/logic/mascotas/comportamientoAsistente'
import {
  ModalAsistenteGenerico,
  ConfiguracionModalAsistente,
} from '@/components/mascota/ModalAsistenteGenerico'
import type { Mascota } from '@/models/Mascota'

// Importar imágenes SVG
import ParqueGrandeSvg from '@/assets/imgs/undraw/parque_grande.svg'
import JugandoConPerroSvg from '@/assets/imgs/undraw/jugando_con_perro.svg'
import DiaOrdinarioSvg from '@/assets/imgs/undraw/dia_ordinario.svg'
import ParadaBusSvg from '@/assets/imgs/undraw/parada_de_bus.svg'

// Mapeo de imágenes por atributo
const IMAGENES_POR_ATRIBUTO: Record<string, any> = {
  nivel_energia: ParqueGrandeSvg,
  socializacion: JugandoConPerroSvg,
  ansiedad: DiaOrdinarioSvg,
  reactividad: ParadaBusSvg,
}

// Configuración específica para comportamiento
const getConfigComportamiento = (t: any): ConfiguracionModalAsistente => ({
  atributos: atributosComportamiento as any,
  imagenesPorAtributo: IMAGENES_POR_ATRIBUTO,
  titulo: t('mascotas:asistente.titulo'),
  columnasOpciones: 1,
  obtenerValor: (atributo, mascota) => {
    const val = mascota[atributo.key as keyof Mascota]
    if (val === 'bajo' || val === 'medio' || val === 'alto') {
      return val as NivelComportamiento
    }
    return undefined
  },
  construirPayload: (valores: Record<string, any>) => {
    // Los valores de comportamiento se guardan directamente en la mascota
    return valores as Partial<Mascota>
  },
})

interface ModalComportamientoAsistenteProps {
  visible: boolean
  petName: string
  mascotaId: string
  initialBehaviorData?: Partial<Mascota>
  onClose: () => void
  // eslint-disable-next-line
  onCompleted?: (savedData: Partial<Mascota>) => void
}

/**
 * Wrapper del modal genérico especializado para comportamiento
 */
export const ModalComportamientoAsistente: React.FC<
  ModalComportamientoAsistenteProps
> = ({
  visible,
  petName,
  mascotaId,
  initialBehaviorData,
  onClose,
  onCompleted,
}) => {
  const { t } = useTranslation()
  const CONFIG_COMPORTAMIENTO = getConfigComportamiento(t)

  return (
    <ModalAsistenteGenerico
      visible={visible}
      petName={petName}
      mascotaId={mascotaId}
      initialData={initialBehaviorData}
      config={CONFIG_COMPORTAMIENTO}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  )
}
