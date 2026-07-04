// Tipos de navegación simplificados para Paw-Path

import { Mascota } from '@/models/Mascota'

// Stack principal de autenticación
export type AuthStackParamList = {
  Auth: undefined
  TutorApp: undefined
  CuidadorApp: undefined
  AdminApp: undefined
  ExplorerApp: undefined
  DetalleMascota: {
    mascotaId: string
    mascota?: Mascota
  }
  EdicionMascota: {
    mascotaId: string
  }

  PerfilCuidador: undefined
  ExcepcionSemanal: { isoSemana: string }
  CoberturaCuidador: undefined
  PaseoActivo: { paseoId: string }
  PaseoFinalizado: { paseoId: string }
  ControlPaseo: { paseoId: string }
  Chat: { paseoId: string }
}

// Flujo interno de autenticación (pantallas del stack de Auth)
export type AuthFlowParamList = {
  Bienvenida: undefined
  Ingresar: undefined
  Registro: undefined
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
  AdminHome: undefined
  TerritorioVivo: undefined
  MiCuenta: undefined
}

// Tabs para el rol de Explorador
export type ExplorerTabParamList = {
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
