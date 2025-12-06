// Tipos de navegación simplificados para Pet Pals

import { Mascota } from '@/models/Mascota'

// Stack principal de autenticación
export type AuthStackParamList = {
  Auth: undefined
  TutorApp: undefined
  CuidadorApp: undefined
  AdminApp: undefined
  DetalleMascota: {
    mascotaId: string
    mascota?: Mascota
  }
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
  Mascotas: undefined
  Paseos: undefined
  MiCuenta: undefined
  Colors: undefined
}

// Tabs para el rol de Cuidador
export type CuidadorTabParamList = {
  Paseos: undefined
  MiCuenta: undefined
}
