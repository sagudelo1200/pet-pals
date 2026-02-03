import { ServicioUsuario } from '@/services/firebase'
import { Usuario, RolUsuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
  eliminarUbicacionRef,
} from '@/logic/ubicaciones/referencias'
import { CrudResult } from '@/services/firebase/comun'
import { GestorPerfilPublico } from './perfilPublico'

// Códigos de error usados internamente por este gestor.
// Devuelven códigos (no mensajes) para que la capa que llama pueda mapear a i18n.
export const CODIGOS_ERROR_USUARIO = {
  NO_ENCONTRADO: 'USUARIO_NO_ENCONTRADO',
} as const

export const GestorUsuarios = {
  obtenerClaveI18nErrorUsuario(error?: string | null) {
    if (!error) return null
    switch (error) {
      case CODIGOS_ERROR_USUARIO.NO_ENCONTRADO:
        return 'usuarios:errores.usuario_no_encontrado'
      default:
        return null
    }
  },

  async agregarRol(
    uid: string,
    nuevoRol: RolUsuario,
    datosBase?: { nombre?: string; foto?: string }
  ): Promise<CrudResult<void>> {
    try {
      const userRes = await ServicioUsuario.obtenerPorId(uid)
      if (!userRes.success || !userRes.data)
        return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

      const usuario = userRes.data
      const rolesActuales = usuario.roles || []

      // Si ya tiene el rol, no hacer nada
      if (rolesActuales.includes(nuevoRol)) {
        return { success: true }
      }

      // Agregar el nuevo rol
      const nuevosRoles = [...rolesActuales, nuevoRol]

      // Actualizar usuario
      const resUsuario = await ServicioUsuario.actualizar(uid, {
        roles: nuevosRoles,
      })

      if (!resUsuario.success)
        return { success: false, error: resUsuario.error }

      // Si el nuevo rol es cuidador, crear perfil público si no existe
      if (nuevoRol === 'cuidador') {
        const perfilRes = await GestorPerfilPublico.obtenerPorId(uid)
        if (!perfilRes.success) {
          await GestorPerfilPublico.inicializarPerfil(uid, {
            nombre: datosBase?.nombre || usuario.nombre || 'Usuario',
            foto: datosBase?.foto || usuario.foto || '',
            verificacion: 'pendiente',
            rating_promedio: 0,
            total_valoraciones: 0,
            tarifa_por_hora: 15000,
          } as any)
        }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async actualizarPerfilCompleto(
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
  },

  async agregarUbicacion(
    userId: string,
    ubicacionId: string,
    alias?: string,
    coordenadas?: { latitude: number; longitude: number },
    direccion_formateada?: string
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
        coordenadas,
        direccion_formateada
      )

      return ServicioUsuario.actualizar(userId, {
        ubicaciones: lista,
        id_ubicacion_principal: idPrincipal,
      })
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async fijarUbicacionPrincipal(
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
        id_ubicacion_principal: idPrincipal,
      })
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async eliminarUbicacion(
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
        id_ubicacion_principal: idPrincipal ?? undefined,
      })
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },
}
