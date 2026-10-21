import React, { useContext } from 'react'
import {
  View,
  Platform,
  StyleProp,
  ViewStyle,
  ScrollView,
  ScrollViewProps,
} from 'react-native'
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs'
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context'
import { COLOR } from '@/constants'
import AjusteTeclado from './AjusteTeclado'

interface ScreenProps {
  children: React.ReactNode
  /** Cuando es true, el contenido es scrollable (ScrollView) */
  scroll?: boolean
  /** Props a pasar al ScrollView interno cuando scroll=true */
  scrollProps?: Partial<ScrollViewProps>
  /** Estilo aplicado al contenedor (o contentContainerStyle si scroll=true) */
  contentContainerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
  /**
   * Ajusta el contenido para que el teclado no tape los campos. Solo en
   * pantallas con campos de texto propios (los modales manejan su teclado).
   */
  teclado?: boolean
  /** Offset vertical del ajuste de teclado (solo con teclado=true) */
  keyboardVerticalOffset?: number
  /**
   * Botón flotante (ej: FAB). Screen lo coloca abajo a la derecha, encima de
   * la barra de pestañas, y no se mueve con el scroll ni con el teclado.
   */
  floating?: React.ReactNode
}

// Margen al final del contenido scrollable
const MARGEN_INFERIOR = 24
// Distancia del botón flotante a la barra (o al borde) y al lado derecho
const MARGEN_FLOTANTE = 16
const MARGEN_FLOTANTE_LATERAL = 20

/**
 * Contenedor base de pantallas.
 *
 * - No envuelve el contenido en un área táctil: así los ScrollView/FlatList
 *   no compiten por el gesto. El teclado se cierra al deslizar o al tocar
 *   una zona vacía del scroll (keyboardDismissMode / keyboardShouldPersistTaps).
 * - Dentro de las pestañas, el contenido termina encima de la barra (que es
 *   absoluta), así ningún elemento queda tapado y cada pantalla no tiene que
 *   reservar ese espacio a mano.
 * - El ajuste de teclado (KeyboardAvoidingView) solo se activa con
 *   teclado=true: con edge-to-edge (Expo 54) Android ya no redimensiona la
 *   app al abrir el teclado, pero en pantallas sin campos propios ese ajuste
 *   solo reacciona a teclados de modales y deja el contenido desplazado.
 */
const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  scrollProps,
  contentContainerStyle,
  style,
  teclado = false,
  keyboardVerticalOffset,
  floating,
}) => {
  const insets = useSafeAreaInsets()
  // Fuera de un navegador de pestañas el contexto es undefined
  const alturaPestanas = useContext(BottomTabBarHeightContext) ?? 0
  const enPestanas = alturaPestanas > 0
  // La barra de pestañas ya cubre el borde inferior seguro
  const bordes: Edge[] = enPestanas
    ? ['top', 'left', 'right']
    : ['top', 'left', 'right', 'bottom']

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: MARGEN_INFERIOR },
        contentContainerStyle,
      ]}
      {...(scrollProps || {})}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentContainerStyle as any]}>{children}</View>
  )

  const cuerpo = (
    <View style={{ flex: 1, marginBottom: alturaPestanas }}>{content}</View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: COLOR.BASE }}>
      <SafeAreaView
        edges={bordes}
        style={[
          {
            flex: 1,
            backgroundColor: COLOR.BASE,
          },
          style,
        ]}
      >
        {teclado ? (
          <AjusteTeclado
            behavior="padding"
            keyboardVerticalOffset={
              keyboardVerticalOffset ?? (Platform.OS === 'ios' ? 80 : 0)
            }
            style={{ flex: 1 }}
          >
            {cuerpo}
          </AjusteTeclado>
        ) : (
          cuerpo
        )}
      </SafeAreaView>

      {/* Capa propia: no depende del teclado ni del scroll */}
      {floating && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: MARGEN_FLOTANTE_LATERAL,
            bottom:
              (enPestanas ? alturaPestanas : insets.bottom) + MARGEN_FLOTANTE,
          }}
        >
          {floating}
        </View>
      )}
    </View>
  )
}

export default Screen
