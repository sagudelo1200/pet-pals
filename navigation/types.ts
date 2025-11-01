// Tipos de navegación simplificados para Pet Pals

// Stack principal de autenticación
export type AuthStackParamList = {
  Auth: undefined
  DuenoApp: undefined
  PaseadorApp: undefined
}

// Flujo interno de autenticación (pantallas del stack de Auth)
export type AuthFlowParamList = {
  Ingresar: undefined
  Registro: undefined
}

// Tabs principales de la aplicación
export type DuenoTabParamList = {
  Inicio: undefined
  Mascotas: undefined
  Paseos: undefined
  MiCuenta: undefined
  Colors: undefined
}

// Tabs para el rol de Paseador
export type PaseadorTabParamList = {
  Paseos: undefined
  MiCuenta: undefined
}
