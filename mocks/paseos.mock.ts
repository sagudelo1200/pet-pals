import { Paseo, PaseoStatus } from '../models/Paseo'

export const MOCK_TUTOR = {
  id: 'tutor_1',
  nombre: 'Santiago',
  apellido: 'Agudelo',
}

export const MOCK_MASCOTAS = [
  {
    id: 'pet_1',
    nombre: 'Luna',
    raza: 'Criollo',
    edad: 3,
    imagen:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200',
    color: 'Negro',
  },
  {
    id: 'pet_2',
    nombre: 'Kiko',
    raza: 'Beagle',
    edad: 2,
    imagen:
      'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&q=80&w=200',
    color: 'Tricolor',
  },
  {
    id: 'pet_3',
    nombre: 'Coco',
    raza: 'Affenpinscher',
    edad: 1,
    imagen:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200',
    color: 'Blanco',
  },
  {
    id: 'pet_4',
    nombre: 'Luna',
    raza: 'Criollo',
    edad: 3,
    imagen:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200',
    color: 'Negro',
  },
  {
    id: 'pet_5',
    nombre: 'Luna',
    raza: 'Criollo',
    edad: 3,
    imagen:
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200',
    color: 'Negro',
  },
]

export const MOCK_CUIDADORES = [
  {
    id: 'care_1',
    nombre: 'Ana M.',
    calificacion: 4.9,
    insignias: ['verificado', 'veterinaria'],
    distancia: '0.5 km',
    tarifa: 25000,
    imagen:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'care_2',
    nombre: 'Carlos R.',
    calificacion: 4.7,
    insignias: ['experto'],
    distancia: '1.2 km',
    tarifa: 20000,
    imagen:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'care_3',
    nombre: 'Luisa F.',
    calificacion: 4.5,
    insignias: [],
    distancia: '2.0 km',
    tarifa: 18000,
    imagen:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
  },
]

export const MOCK_PASEO_PENDIENTE: Paseo = {
  id: 'paseo_mock_1',
  creado_en: new Date(),
  actualizado_en: new Date(),
  creado_por: 'tutor_1',
  actualizado_por: 'tutor_1',
  tipo_paseo: 'solicitado',
  fecha_hora_inicio: new Date(Date.now() + 3600000), // En 1 hora
  duracion_estimada: 60,
  precio: 25000,
  estado: PaseoStatus.PENDIENTE,
  ubicacion_inicio: 'Calle 123 #45-67',
  ubicacion_fin: 'Parque Principal',
  cupo_maximo_mascotas: 1,
  mascotas_count: 1,
}
