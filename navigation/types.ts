// Tipos de navegación simplificados para Paw-Path

import { Mascota } from '@/models/Mascota'
import type { TipoServicio } from '@/functions/src/compartido/servicios'

// Stack principal de autenticación
export type AuthStackParamList = {
  Auth: undefined
  TutorApp: undefined
  CuidadorApp: undefined
  AdminApp: undefined
  ExplorerApp: undefined
  ContadorApp: undefined
  DetalleMascota: {
    mascotaId: string
    mascota?: Mascota
  }
  EdicionMascota: {
    mascotaId: string
  }

  AdminZonas: undefined
  EditorZona: { zonaId?: string }
  DetalleHabilitacion: { id: string }
  MiHabilitacion: { servicio: TipoServicio; abrirPerfil?: boolean }

  PerfilCuidador: undefined
  ExcepcionSemanal: { isoSemana: string }
  CoberturaCuidador: undefined
  PaseoActivo: { paseoId: string }
  PaseoFinalizado: { paseoId: string }
  CuidadorEvaluaTutor: { paseoId: string }
  ObservacionMascota: { paseoId: string }
  ControlPaseo: { paseoId: string }
  Chat: { paseoId: string }
  Notificaciones: undefined
  PreferenciasNotificaciones: undefined
}

// Flujo interno de autenticación (pantallas del stack de Auth)
export type AuthFlowParamList = {
  Bienvenida: undefined
  Ingresar: undefined
  Registro: undefined
  VerificarEmail: { email: string; uid: string }
}

// Tabs principales de la aplicación
export type TutorTabParamList = {
  Inicio: undefined
  Mascotas: { refresh?: number } | undefined
  Paseos:
    | {
        abrirSolicitar?: boolean
        mascotaId?: string
        forzarMascotaInicial?: boolean
      }
    | undefined
  MiCuenta: undefined
  Colors: undefined
}

// Tabs para el rol de Cuidador
export type CuidadorTabParamList = {
  Dashboard: undefined
  Solicitudes: undefined
  Agenda: undefined
  MiCuenta: undefined
}

// Tabs para el rol de Admin
export type AdminTabParamList = {
  AdminAjustes: undefined
  AdminHabilitaciones: undefined
  AdminEconomia: undefined
  TerritorioVivo: undefined
  MiCuenta: undefined
}

// Tabs para el rol de Contador (solo lectura de la economía)
export type ContadorTabParamList = {
  ContadorEconomia: undefined
  MiCuenta: undefined
}

// Tabs para el rol de Explorador
export type ExplorerTabParamList = {
  ExplorerRoot: undefined
  InicioExplorador: undefined
  MapaTerritorial: undefined
  HistorialExploraciones: undefined
  MiCuenta: undefined
  ExplorarLibremente: undefined
  ResumenExploracion: {
    eventos: any[]
    tiempoTotal: string
    mascotasObservadas: number
    huellas: number
  }
}
