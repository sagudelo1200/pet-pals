import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLOR } from '@/constants'
import {
  CATALOGO_CONFIGURACION,
  type AreaConfiguracion,
} from '@/functions/src/compartido/configuracion'
import {
  escucharHistorialConfiguracion,
  type CambioConfiguracion,
} from '@/services/firebase/configuracion'
import { aEditable } from '@/logic/configuracion/formulario'
import { NombreUsuario } from './NombreUsuario'
import { estilosAdmin } from './estilosAdmin'

const CANTIDAD = 5

/** Últimos cambios de un área: qué cambió, quién, cuándo y por qué. */
export const HistorialConfiguracion: React.FC<{ area: AreaConfiguracion }> = ({
  area,
}) => {
  const [cambios, setCambios] = useState<CambioConfiguracion[]>([])
  useEffect(
    () => escucharHistorialConfiguracion(area, CANTIDAD, setCambios),
    [area]
  )

  if (!cambios.length) {
    return <Text style={estilosAdmin.ayudaCampo}>Sin cambios registrados.</Text>
  }
  const valores = CATALOGO_CONFIGURACION[area].valores as Record<
    string,
    { titulo: string }
  >

  return (
    <View>
      {cambios.map(c => (
        <View key={c.id} style={styles.fila}>
          {Object.entries(c.cambios).map(([clave, { antes, despues }]) => (
            <Text key={clave} style={styles.cambio}>
              {valores[clave]?.titulo ?? clave}: {String(aEditable(antes))} →{' '}
              {String(aEditable(despues))}
            </Text>
          ))}
          {c.motivo ? <Text style={styles.detalle}>{c.motivo}</Text> : null}
          <Text style={styles.detalle}>
            {c.en?.toDate().toLocaleString('es-CO')} ·{' '}
            <NombreUsuario uid={c.autor} style={styles.detalle} />
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  fila: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
    gap: 2,
  },
  cambio: {
    fontSize: 13,
    color: COLOR.TEXTO,
  },
  detalle: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
})
