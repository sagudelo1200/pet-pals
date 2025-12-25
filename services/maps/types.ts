export interface Coordenadas {
  latitude: number
  longitude: number
}

export interface Viewport {
  northeast: Coordenadas
  southwest: Coordenadas
}

export interface SugerenciaAutocomplete {
  place_id: string
  titulo: string // Main text (ej: "Parque El Virrey")
  subtitulo: string // Secondary text (ej: "Bogotá, Colombia")
  descripcion_completa: string // Full description
}

export interface DetalleUbicacion {
  place_id: string
  direccion_formateada: string
  coordenadas: Coordenadas
  viewport?: Viewport
  componentes?: {
    calle?: string
    numero?: string
    barrio?: string
    ciudad?: string
    departamento?: string
    pais?: string
    codigo_postal?: string
  }
}

export interface IProveedorMapas {
  buscarSitios(_query: string): Promise<SugerenciaAutocomplete[]>
  obtenerDetalles(_placeId: string): Promise<DetalleUbicacion>
}
