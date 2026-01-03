import { ServicioUsuario } from '@/services/firebase'
import { Usuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
} from '@/helpers/logicaUbicacion'
import { CrudResult } from '@/services/firebase/comun'

// Códigos de error usados internamente por este gestor.
// Devuelven códigos (no mensajes) para que la capa que llama pueda mapear a i18n.
export const CODIGOS_ERROR_USUARIO = {
  NO_ENCONTRADO: 'USUARIO_NO_ENCONTRADO',
} as const

export function obtenerClaveI18nErrorUsuario(error?: string | null) {
  if (!error) return null
  switch (error) {
    case CODIGOS_ERROR_USUARIO.NO_ENCONTRADO:
      return 'usuarios:errores.usuario_no_encontrado'
    default:
      return null
  }
}

export async function actualizarPerfilCompleto(
  uid: string,
  datosUsuario: Partial<Usuario>
): Promise<CrudResult<void>> {
  try {
    // Preparar datos para usuario
    const datosUsuarioDb: Partial<Usuario> = { ...datosUsuario }

    // Preparar perfil publicable si aplica
    const datosPerfilPublico: Partial<PerfilPublico> = {}
    if (datosUsuario.nombre) datosPerfilPublico.nombre = datosUsuario.nombre
    if (datosUsuario.foto) datosPerfilPublico.foto = datosUsuario.foto

    // Delegar al servicio para commit atómico de DB (servicio solo escribe)
    return await ServicioUsuario.commitPerfilBatch(
      uid,
      datosUsuarioDb,
      datosPerfilPublico
    )
  } catch (e: any) {
    return { success: false, error: String(e) }
  }
}

export async function agregarUbicacion(
  userId: string,
  ubicacionId: string,
  alias?: string,
  coordenadas?: { latitude: number; longitude: number }
): Promise<CrudResult<Usuario>> {
  try {
    const userRes = await ServicioUsuario.obtenerPorId(userId)
    if (!userRes.success || !userRes.data)
      return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

    const usuario = userRes.data
    const { lista, idPrincipal } = agregarUbicacionRef(
      usuario.ubicaciones || [],
      ubicacionId,
      alias,
      coordenadas
    )

    return ServicioUsuario.actualizar(userId, {
      ubicaciones: lista,
      ubicacion_principal_id: idPrincipal,
    })
  } catch (e: any) {
    return { success: false, error: String(e) }
  }
}

export async function fijarUbicacionPrincipal(
  userId: string,
  ubicacionId: string
): Promise<CrudResult<Usuario>> {
  try {
    const userRes = await ServicioUsuario.obtenerPorId(userId)
    if (!userRes.success || !userRes.data)
      return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

    const usuario = userRes.data
    const { lista, idPrincipal } = fijarPrincipalRef(
      usuario.ubicaciones || [],
      ubicacionId
    )

    return ServicioUsuario.actualizar(userId, {
      ubicaciones: lista,
      ubicacion_principal_id: idPrincipal,
    })
  } catch (e: any) {
    return { success: false, error: String(e) }
  }
}

export async function eliminarUbicacion(
  userId: string,
  ubicacionId: string
): Promise<CrudResult<Usuario>> {
  try {
    const userRes = await ServicioUsuario.obtenerPorId(userId)
    if (!userRes.success || !userRes.data)
      return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

    const usuario = userRes.data
    const { lista, idPrincipal } = eliminarUbicacionRef(
      usuario.ubicaciones || [],
      ubicacionId
    )

    return ServicioUsuario.actualizar(userId, {
      ubicaciones: lista,
      ubicacion_principal_id: idPrincipal ?? undefined,
    })
  } catch (e: any) {
    return { success: false, error: String(e) }
  }
}
