/**
 * ResumenDeMascota
 * Lo que se sabe de una mascota en diez segundos: quién es, qué funciona,
 * qué evitar, qué tener en cuenta y las alertas. Lo arma el servidor a partir
 * de lo que tutor y cuidadores han ido viendo; este componente solo lo
 * muestra.
 *
 * Lo usan el panel del cuidador (solo lectura) y la ficha del tutor, que
 * además pasa `onDecidir`: así el tutor confirma lo sensible que se
 * observó ("Es así" / "No es así") y puede corregir cualquier aprendizaje.
 */
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import type { Expediente } from '@/models/Expediente'
import type { ItemResumen } from '@/functions/src/compartido/expediente'

export type DecisionDelTutor = 'confirmado' | 'rechazado'

interface Props {
  nombre: string
  /** undefined = aún no hay expediente de esta mascota. */
  expediente?: Expediente
  /** Avisa "primer paseo con {nombre}". */
  primerPaseo?: boolean
  /** La ficha (quién es, salud) ya la conoce el tutor: se puede ocultar. */
  mostrarFicha?: boolean
  /** Dentro de una sección que ya dice el nombre se puede omitir. */
  mostrarNombre?: boolean
  /** Sin esto es solo lectura; con esto el tutor confirma o corrige. */
  onDecidir?: (_clave: string, _decision: DecisionDelTutor) => void
  /** Deshabilita las acciones mientras se guarda una decisión. */
  ocupada?: boolean
}

const Seccion: React.FC<{
  titulo: string
  items: ItemResumen[]
  onCorregir?: (_clave: string) => void
  ocupada?: boolean
}> = ({ titulo, items, onCorregir, ocupada }) => {
  const { t } = useTranslation(['paseos'])
  if (items.length === 0) return null
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {items.map(i => (
        <View key={i.clave} style={styles.fila}>
          <Text style={styles.viñeta}>•</Text>
          <View style={styles.cuerpo}>
            <Text style={styles.texto}>
              {i.texto}
              <Text style={styles.estado}>
                {`  ${t(`paseos:resumen.estado.${i.estado}`)}`}
              </Text>
            </Text>
            {onCorregir && (
              <Pressable
                onPress={() => onCorregir(i.clave)}
                disabled={ocupada}
                hitSlop={8}
              >
                <Text style={styles.corregir}>
                  {t('paseos:resumen.no_es_asi')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

export const ResumenDeMascota: React.FC<Props> = ({
  nombre,
  expediente,
  primerPaseo,
  mostrarFicha = true,
  mostrarNombre = true,
  onDecidir,
  ocupada,
}) => {
  const { t } = useTranslation(['paseos'])
  const r = expediente?.resumen
  const alertas = r?.alertas ?? []
  const porConfirmar = onDecidir ? (r?.por_confirmar ?? []) : []
  const enRevision = new Set(porConfirmar.map(i => i.clave))
  const sinRevisar = (items: ItemResumen[]) =>
    items.filter(i => !enRevision.has(i.clave))
  const corregir = onDecidir
    ? (clave: string) => onDecidir(clave, 'rechazado')
    : undefined
  const sinAprendizajes =
    !r ||
    r.que_funciona.length + r.que_evitar.length + r.ten_en_cuenta.length === 0

  return (
    <View style={styles.tarjeta}>
      {mostrarNombre && <Text style={styles.nombre}>{nombre}</Text>}
      {mostrarFicha && !!expediente?.quien_es && (
        <Text style={styles.quienEs}>{expediente.quien_es}</Text>
      )}

      {alertas.length > 0 && (
        <View style={[styles.seccion, styles.alertas]}>
          <Text style={[styles.tituloSeccion, styles.tituloAlerta]}>
            {t('paseos:resumen.alertas')}
          </Text>
          {alertas.map(a => (
            <Text key={`${a.clave}-${a.fecha_ms}`} style={styles.textoAlerta}>
              ⚠️ {a.texto}
            </Text>
          ))}
        </View>
      )}

      {porConfirmar.length > 0 && (
        <View style={[styles.seccion, styles.revisar]}>
          <Text style={styles.tituloSeccion}>
            {t('paseos:resumen.revisa_esto')}
          </Text>
          <Text style={styles.ayuda}>{t('paseos:resumen.revisa_ayuda')}</Text>
          {porConfirmar.map(i => (
            <View key={i.clave} style={styles.itemRevisar}>
              <Text style={styles.texto}>{i.texto}</Text>
              <View style={styles.botones}>
                <Pressable
                  style={[styles.boton, styles.botonSi]}
                  onPress={() => onDecidir?.(i.clave, 'confirmado')}
                  disabled={ocupada}
                >
                  <Text style={styles.botonSiTexto}>
                    {t('paseos:resumen.es_asi')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.boton, styles.botonNo]}
                  onPress={() => onDecidir?.(i.clave, 'rechazado')}
                  disabled={ocupada}
                >
                  <Text style={styles.botonNoTexto}>
                    {t('paseos:resumen.no_es_asi')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {mostrarFicha &&
        (expediente?.salud_declarada ?? []).map(linea => (
          <Text key={linea} style={styles.salud}>
            🩺 {linea}
          </Text>
        ))}

      {r && (
        <>
          <Seccion
            titulo={t('paseos:resumen.que_funciona')}
            items={sinRevisar(r.que_funciona)}
            onCorregir={corregir}
            ocupada={ocupada}
          />
          <Seccion
            titulo={t('paseos:resumen.que_evitar')}
            items={sinRevisar(r.que_evitar)}
            onCorregir={corregir}
            ocupada={ocupada}
          />
          <Seccion
            titulo={t('paseos:resumen.ten_en_cuenta')}
            items={sinRevisar(r.ten_en_cuenta)}
            onCorregir={corregir}
            ocupada={ocupada}
          />
        </>
      )}

      {sinAprendizajes && (
        <Text style={styles.vacio}>
          {onDecidir
            ? t('paseos:resumen.conociendo', { nombre })
            : t('paseos:resumen.sin_datos', { nombre })}
        </Text>
      )}

      {primerPaseo && (
        <Text style={styles.primerPaseo}>
          {t('paseos:resumen.primer_paseo', { nombre })}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: COLOR.BLOQUE,
    borderColor: COLOR.BORDE,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  nombre: { fontSize: 17, fontWeight: '700', color: COLOR.TEXTO },
  quienEs: { fontSize: 13, color: COLOR.SUBTEXTO, marginTop: 2 },
  seccion: { marginTop: 12 },
  tituloSeccion: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.SUBTEXTO,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fila: { flexDirection: 'row', marginTop: 3 },
  viñeta: { color: COLOR.PRIMARIO, marginRight: 6, fontSize: 15 },
  cuerpo: { flex: 1 },
  texto: { fontSize: 15, color: COLOR.TEXTO, lineHeight: 21 },
  estado: { fontSize: 11, color: COLOR.SUBTEXTO },
  corregir: { fontSize: 12, color: COLOR.SUBTEXTO, marginTop: 2 },
  alertas: {
    backgroundColor: `${COLOR.ERROR}15`,
    borderColor: COLOR.ERROR,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  tituloAlerta: { color: COLOR.ERROR },
  textoAlerta: { fontSize: 14, color: COLOR.TEXTO, marginTop: 2 },
  revisar: {
    borderColor: COLOR.PRIMARIO,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  ayuda: { fontSize: 12, color: COLOR.SUBTEXTO, marginBottom: 6 },
  itemRevisar: { marginTop: 8 },
  botones: { flexDirection: 'row', gap: 8, marginTop: 6 },
  boton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  botonSi: { backgroundColor: COLOR.PRIMARIO, borderColor: COLOR.PRIMARIO },
  botonSiTexto: { color: COLOR.BASE, fontWeight: '700', fontSize: 14 },
  botonNo: { borderColor: COLOR.BORDE },
  botonNoTexto: { color: COLOR.TEXTO, fontWeight: '600', fontSize: 14 },
  salud: { fontSize: 13, color: COLOR.TEXTO, marginTop: 8 },
  vacio: { fontSize: 13, color: COLOR.SUBTEXTO, marginTop: 12, lineHeight: 19 },
  primerPaseo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.PRIMARIO,
    marginTop: 12,
    lineHeight: 19,
  },
})
