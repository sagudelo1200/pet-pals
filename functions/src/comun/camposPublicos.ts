import * as admin from 'firebase-admin'

export function construirDatosPerfil(uid: string, usuarioData: any) {
  return {
    id: uid,
    nombre: usuarioData.nombre || null,
    foto: usuarioData.foto || null,
    verificacion: usuarioData.verificado ? 'verificado' : 'pendiente',
    rating_promedio: 0,
    cantidad_paseos_realizados: 0,
    creado_en: admin.firestore.FieldValue.serverTimestamp(),
    actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
    creado_por: uid,
    actualizado_por: uid,
  }
}

export function construirActualizacion(nuevo: any, uid: string) {
  const actualizar: Record<string, any> = {}
  if ('nombre' in nuevo) actualizar.nombre = nuevo.nombre || null
  if ('foto' in nuevo) actualizar.foto = nuevo.foto || null
  if ('verificado' in nuevo)
    actualizar.verificacion = nuevo.verificado ? 'verificado' : 'pendiente'

  if (Object.keys(actualizar).length === 0) return null

  actualizar.actualizado_en = admin.firestore.FieldValue.serverTimestamp()
  actualizar.actualizado_por = uid
  return actualizar
}
