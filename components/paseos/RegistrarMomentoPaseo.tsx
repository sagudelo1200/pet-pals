import React, { useEffect, useState } from 'react'
import {
  Alert,
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { ServicioPaseo } from '@/services/firebase'
import { listarNombres } from '@/logic/paseos/nombresMascotas'
import {
  ATAJOS_DE_MOMENTO,
  GRUPOS_DEL_MENU,
  armarMomento,
  claveDeEtiqueta,
  pideConfirmacion,
  seguimientoDe,
  type SeleccionDeSeguimiento,
} from '@/logic/paseos/momentos'
import {
  CAUSAS_DEL_NERVIOSISMO,
  DETALLES_DEL_CONFLICTO,
  FORMAS_DE_CALMARLO,
  momentoPorClave,
  momentosDelGrupo,
  type GrupoMomento,
  type OpcionSeguimiento,
} from '@/functions/src/compartido/expediente'

interface RegistrarMomentoPaseoProps {
  visible: boolean
  paseoId: string
  ubicacionActual?:
    { latitude?: number; longitude?: number } | { lat?: number; lng?: number }
  /** Mascotas del paseo: con más de una, el cuidador elige a cuál le pasó */
  mascotas?: Array<{ id: string; nombre: string }>
  /** Último lugar registrado en el paseo: da contexto a lo que pase después */
  ultimoLugar?: string
  /** Pantalla con la que abre (por defecto el menú principal). */
  pantallaInicial?: GrupoMomento | 'principal'
  onClose: () => void
  onGuardado?: () => void
}

type Pantalla = 'principal' | GrupoMomento | 'seguimiento'

/** Fila de opciones de una pregunta de seguimiento (una sola elegible). */
const FilaDeOpciones: React.FC<{
  titulo: string
  opciones: readonly OpcionSeguimiento[]
  prefijoI18n: string
  elegida?: string
  onElegir: (_clave: string | undefined) => void
  deshabilitado: boolean
}> = ({ titulo, opciones, prefijoI18n, elegida, onElegir, deshabilitado }) => {
  const { t } = useTranslation(['paseos'])
  return (
    <View style={styles.selectorMascotas}>
      <Text style={styles.selectorTitulo}>{titulo}</Text>
      <View style={styles.selectorChips}>
        {opciones.map(o => {
          const activa = elegida === o.clave
          return (
            <Pressable
              key={o.clave}
              style={[styles.chipMascota, activa && styles.chipMascotaActivo]}
              onPress={() => onElegir(activa ? undefined : o.clave)}
              disabled={deshabilitado}
            >
              <Text
                style={[
                  styles.chipMascotaTexto,
                  activa && styles.chipMascotaTextoActivo,
                ]}
              >
                {t(`${prefijoI18n}.${o.clave}`)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const RegistrarMomentoPaseo: React.FC<RegistrarMomentoPaseoProps> = ({
  visible,
  paseoId,
  ubicacionActual,
  mascotas = [],
  ultimoLugar,
  pantallaInicial = 'principal',
  onClose,
  onGuardado,
}) => {
  const { t } = useTranslation(['paseos', 'comun'])
  const [pantalla, setPantalla] = useState<Pantalla>('principal')
  const [guardando, setGuardando] = useState(false)
  const [nota, setNota] = useState('')
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [seleccion, setSeleccion] = useState<SeleccionDeSeguimiento>({})
  // [] = todo el grupo. Solo se elige cuando el paseo tiene varias mascotas
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const variasMascotas = mascotas.length > 1

  // Al abrirse, empieza en la pantalla pedida (p. ej. directo en Emergencia)
  useEffect(() => {
    if (visible) setPantalla(pantallaInicial)
  }, [visible, pantallaInicial])

  const alternarMascota = (id: string) =>
    setSeleccionadas(prev => {
      const siguiente = prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
      // Todas elegidas equivale a "Todos"
      return siguiente.length === mascotas.length ? [] : siguiente
    })

  const reset = () => {
    setPantalla('principal')
    setNota('')
    setPendiente(null)
    setSeleccion({})
    setSeleccionadas([])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const guardarMomento = async (
    clave: string,
    elegido: SeleccionDeSeguimiento = {}
  ) => {
    setGuardando(true)
    try {
      // Normalizar ubicación a formato {lat, lng}
      let ubicacionNormalizada: { lat: number; lng: number } | undefined
      if (ubicacionActual) {
        const lat =
          'latitude' in ubicacionActual &&
          ubicacionActual.latitude !== undefined
            ? ubicacionActual.latitude
            : 'lat' in ubicacionActual
              ? (ubicacionActual as any).lat
              : undefined
        const lng =
          'longitude' in ubicacionActual &&
          ubicacionActual.longitude !== undefined
            ? ubicacionActual.longitude
            : 'lng' in ubicacionActual
              ? (ubicacionActual as any).lng
              : undefined
        if (lat !== undefined && lng !== undefined) {
          ubicacionNormalizada = { lat, lng }
        }
      }

      // Calcular hora local en el cliente (zona horaria correcta)
      const horaLocal = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })

      // Un solo perro: el momento es suyo sin preguntar. Varios: lo elegido
      // ([] = todos).
      const elegidas =
        mascotas.length === 1
          ? mascotas
          : mascotas.filter(m => seleccionadas.includes(m.id))

      const res = await ServicioPaseo.registrarMomento(
        paseoId,
        armarMomento(clave, ultimoLugar, elegido),
        {
          nota: nota.trim() || undefined,
          ubicacion: ubicacionNormalizada,
          horaLocal,
          mascotaIds: elegidas.map(m => m.id),
          nombresMascotas: variasMascotas
            ? listarNombres(elegidas.map(m => m.nombre))
            : undefined,
        }
      )

      if (res.success) {
        reset()
        onGuardado?.()
        onClose()
      }
    } catch (err) {
      console.error('[RegistrarMomentoPaseo] Error:', err)
    } finally {
      setGuardando(false)
    }
  }

  /** Un toque en un momento: va directo, pide seguimiento o confirma. */
  const elegirMomento = (clave: string) => {
    const definicion = momentoPorClave(clave)
    if (!definicion) return
    if (seguimientoDe(clave)) {
      setPendiente(clave)
      setSeleccion({})
      setPantalla('seguimiento')
      return
    }
    if (pideConfirmacion(definicion)) {
      Alert.alert(
        t('paseos:momentos.confirmar_emergencia.titulo'),
        t('paseos:momentos.confirmar_emergencia.mensaje'),
        [
          { text: t('comun:boton.cancelar'), style: 'cancel' },
          {
            text: t('paseos:momentos.confirmar_emergencia.confirmar'),
            style: 'destructive',
            onPress: () => {
              void guardarMomento(clave)
            },
          },
        ]
      )
      return
    }
    void guardarMomento(clave)
  }

  if (!visible) return null

  const volver = (
    <Pressable
      style={styles.btnVolver}
      onPress={() => {
        setPendiente(null)
        setSeleccion({})
        setPantalla('principal')
      }}
    >
      <FontAwesome5
        solid
        name="chevron-left"
        size={20}
        color={COLOR.PRIMARIO}
      />
      <Text style={styles.textVolver}>
        {t('paseos:momentos.acciones.volver')}
      </Text>
    </Pressable>
  )

  const campoNota = (
    <View style={styles.selectorMascotas}>
      <Text style={styles.selectorTitulo}>
        {t('paseos:momentos.nota.etiqueta')}
      </Text>
      <TextInput
        style={styles.inputNota}
        value={nota}
        onChangeText={setNota}
        placeholder={t('paseos:momentos.nota.placeholder')}
        placeholderTextColor={COLOR.SUBTEXTO}
        maxLength={200}
        editable={!guardando}
      />
    </View>
  )

  const seguimiento = pendiente ? seguimientoDe(pendiente) : undefined

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={handleClose}>
        <View style={styles.container}>
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* ¿A QUIÉN LE PASÓ? Solo con varias mascotas; vacío = todos */}
            {variasMascotas && (
              <View style={styles.selectorMascotas}>
                <Text style={styles.selectorTitulo}>
                  {t('paseos:momentos.a_quien')}
                </Text>
                <View style={styles.selectorChips}>
                  <Pressable
                    style={[
                      styles.chipMascota,
                      seleccionadas.length === 0 && styles.chipMascotaActivo,
                    ]}
                    onPress={() => setSeleccionadas([])}
                    disabled={guardando}
                  >
                    <Text
                      style={[
                        styles.chipMascotaTexto,
                        seleccionadas.length === 0 &&
                          styles.chipMascotaTextoActivo,
                      ]}
                    >
                      {t('paseos:momentos.todos')}
                    </Text>
                  </Pressable>
                  {mascotas.map(m => {
                    const activo = seleccionadas.includes(m.id)
                    return (
                      <Pressable
                        key={m.id}
                        style={[
                          styles.chipMascota,
                          activo && styles.chipMascotaActivo,
                        ]}
                        onPress={() => alternarMascota(m.id)}
                        disabled={guardando}
                      >
                        <Text
                          style={[
                            styles.chipMascotaTexto,
                            activo && styles.chipMascotaTextoActivo,
                          ]}
                        >
                          {m.nombre}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}

            {/* PANTALLA PRINCIPAL: atajos + los cuatro grupos */}
            {pantalla === 'principal' && (
              <>
                <View style={styles.atajosContainer}>
                  {ATAJOS_DE_MOMENTO.map(clave => (
                    <Pressable
                      key={clave}
                      style={styles.atajo}
                      onPress={() => elegirMomento(clave)}
                      disabled={guardando}
                    >
                      <Text style={styles.textoAtajo}>
                        {t(claveDeEtiqueta(clave))}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {GRUPOS_DEL_MENU.map(grupo => (
                  <Pressable
                    key={grupo}
                    style={[
                      styles.opcion,
                      grupo === 'emergencia' && styles.opcionCritica,
                    ]}
                    onPress={() => setPantalla(grupo)}
                  >
                    <View style={styles.textoOpcion}>
                      <Text
                        style={[
                          styles.etiquetaOpcion,
                          grupo === 'emergencia' &&
                            styles.textoSubopcionCritico,
                        ]}
                      >
                        {t(`paseos:momentos.grupos.${grupo}.titulo`)}
                      </Text>
                      <Text style={styles.detalleOpcion}>
                        {t(`paseos:momentos.grupos.${grupo}.subtitulo`)}
                      </Text>
                    </View>
                    <FontAwesome5
                      solid
                      name="chevron-right"
                      size={24}
                      color={
                        grupo === 'emergencia' ? COLOR.ERROR : COLOR.PRIMARIO
                      }
                    />
                  </Pressable>
                ))}
              </>
            )}

            {/* LISTA DE UN GRUPO */}
            {pantalla !== 'principal' && pantalla !== 'seguimiento' && (
              <>
                {volver}
                <Text style={styles.tituloSubmenu}>
                  {t(`paseos:momentos.grupos.${pantalla}.titulo`)}
                </Text>
                {campoNota}
                {momentosDelGrupo(pantalla).map(m => {
                  const critico = m.gravedad === 'critica'
                  return (
                    <Pressable
                      key={m.clave}
                      style={[
                        styles.subopcion,
                        critico && styles.subopcionCritica,
                      ]}
                      onPress={() => elegirMomento(m.clave)}
                      disabled={guardando}
                    >
                      <Text
                        style={[
                          styles.textoSubopcion,
                          critico && styles.textoSubopcionCritico,
                        ]}
                      >
                        {t(claveDeEtiqueta(m.clave))}
                      </Text>
                    </Pressable>
                  )
                })}
              </>
            )}

            {/* SEGUIMIENTO OPCIONAL: ¿con qué? ¿qué lo calmó? ¿cómo fue? */}
            {pantalla === 'seguimiento' && pendiente && (
              <>
                {volver}
                <Text style={styles.tituloSubmenu}>
                  {t(claveDeEtiqueta(pendiente))}
                </Text>

                {seguimiento === 'causa_y_calma' && (
                  <>
                    <FilaDeOpciones
                      titulo={t('paseos:momentos.seguimientos.causa.titulo')}
                      opciones={CAUSAS_DEL_NERVIOSISMO}
                      prefijoI18n="paseos:momentos.seguimientos.causa.opciones"
                      elegida={seleccion.causa}
                      onElegir={causa => setSeleccion({ ...seleccion, causa })}
                      deshabilitado={guardando}
                    />
                    <FilaDeOpciones
                      titulo={t('paseos:momentos.seguimientos.calma.titulo')}
                      opciones={FORMAS_DE_CALMARLO}
                      prefijoI18n="paseos:momentos.seguimientos.calma.opciones"
                      elegida={seleccion.calmo_con}
                      onElegir={calmo_con =>
                        setSeleccion({ ...seleccion, calmo_con })
                      }
                      deshabilitado={guardando}
                    />
                  </>
                )}

                {seguimiento === 'detalle_del_conflicto' && (
                  <FilaDeOpciones
                    titulo={t('paseos:momentos.seguimientos.conflicto.titulo')}
                    opciones={DETALLES_DEL_CONFLICTO}
                    prefijoI18n="paseos:momentos.seguimientos.conflicto.opciones"
                    elegida={seleccion.detalle_del_conflicto}
                    onElegir={detalle_del_conflicto =>
                      setSeleccion({ ...seleccion, detalle_del_conflicto })
                    }
                    deshabilitado={guardando}
                  />
                )}

                {campoNota}

                <Pressable
                  style={styles.btnGuardar}
                  onPress={() => void guardarMomento(pendiente, seleccion)}
                  disabled={guardando}
                >
                  <Text style={styles.textBtnGuardar}>
                    {t('paseos:momentos.acciones.guardar')}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.btnOmitir}
                  onPress={() => void guardarMomento(pendiente)}
                  disabled={guardando}
                >
                  <Text style={styles.textBtnOmitir}>
                    {t('paseos:momentos.acciones.omitir')}
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Pressable
              style={styles.btnCerrar}
              onPress={handleClose}
              disabled={guardando}
            >
              <Text style={styles.textBtnCerrar}>
                {guardando
                  ? t('paseos:momentos.acciones.guardando')
                  : t('paseos:momentos.acciones.cerrar')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLOR.BASE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flexDirection: 'column',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },

  /* SELECTORES (mascotas y seguimientos) */
  selectorMascotas: {
    marginBottom: 16,
  },
  selectorTitulo: {
    color: COLOR.SUBTEXTO,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipMascota: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
    backgroundColor: COLOR.BLOQUE,
  },
  chipMascotaActivo: {
    backgroundColor: COLOR.PRIMARIO,
    borderColor: COLOR.PRIMARIO,
  },
  chipMascotaTexto: {
    color: COLOR.TEXTO,
    fontSize: 14,
    fontWeight: '600',
  },
  chipMascotaTextoActivo: {
    color: 'white',
  },
  inputNota: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLOR.TEXTO,
  },

  /* ATAJOS RÁPIDOS */
  atajosContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  atajo: {
    flex: 1,
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  textoAtajo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.BASE,
    textAlign: 'center',
  },

  /* GRUPOS */
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.BLOQUE,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  opcionCritica: {
    borderWidth: 1,
    borderColor: COLOR.ERROR,
  },
  textoOpcion: {
    flex: 1,
  },
  etiquetaOpcion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  detalleOpcion: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },

  /* NAVEGACIÓN SUBMENU */
  btnVolver: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  textVolver: {
    fontSize: 16,
    color: COLOR.PRIMARIO,
    fontWeight: '600',
    marginLeft: 4,
  },

  /* SUBMENU */
  tituloSubmenu: {
    fontSize: 20,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
  },
  subopcion: {
    backgroundColor: COLOR.SECUNDARIO,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${COLOR.TEXTO}15`,
  },
  subopcionCritica: {
    backgroundColor: `${COLOR.ERROR}15`,
    borderColor: COLOR.ERROR,
  },
  textoSubopcion: {
    fontSize: 15,
    color: COLOR.TEXTO,
    fontWeight: '500',
  },
  textoSubopcionCritico: {
    color: COLOR.ERROR,
    fontWeight: '600',
  },

  /* SEGUIMIENTO */
  btnGuardar: {
    backgroundColor: COLOR.PRIMARIO,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  textBtnGuardar: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.BASE,
  },
  btnOmitir: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  textBtnOmitir: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },

  /* FOOTER */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.BASE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLOR.BLOQUE,
  },
  btnCerrar: {
    backgroundColor: COLOR.INACTIVO,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textBtnCerrar: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
})

export default RegistrarMomentoPaseo
