# Mascota

Resumen: Modelo que describe a una mascota: identidad, características físicas, salud y preferencias de paseo.

Uso rápido:

- Colección sugerida: `mascotas`.
- Campos obligatorios en dominio: `id`, `nombre`, `especie`.
- Fechas: Firestore almacena `Timestamp`; convertir a `Date` al leer.

Contrato (TypeScript):

```ts
export interface Mascota extends BaseModel {
  nombre: string
  foto?: string
  especie: 'perro'
  raza?: string
  fecha_nacimiento?: Date
  genero?: 'macho' | 'hembra'
  tamano?: 'muy pequeño' | 'pequeño' | 'mediano' | 'grande' | 'gigante'
  peso?: number
  esterilizado?: boolean
  vacunas?: { nombre: string; fecha?: Date }[]
  condiciones_salud?: string[]
  condiciones_comportamiento?: string[]
  historial_medico?: string
  nivel_energia?: 'bajo' | 'medio' | 'alto'
  activo?: boolean
  preferencias_paseo?: string[]
  descripcion?: string
}
```

Ejemplo JSON (válido en dominio):

```json
{
  "id": "masc_001",
  "nombre": "Luna",
  "foto": "https://cdn.example.com/luna.jpg",
  "especie": "perro",
  "raza": "Labrador",
  "fecha_nacimiento": "2020-08-12T00:00:00.000Z",
  "genero": "hembra",
  "tamano": "grande",
  "peso": 28.5,
  "esterilizado": true,
  "vacunas": [{ "nombre": "Rabia", "fecha": "2021-09-01T00:00:00.000Z" }],
  "condiciones_salud": ["alergia_al_polvo"],
  "nivel_energia": "medio",
  "activo": true,
  "preferencias_paseo": ["correa corta"],
  "descripcion": "Muy sociable con otros perros"
}
```

Relaciones clave:

- Propietario: un `Usuario` posee (o referencia) la `Mascota`.
- Participaciones: aparece en `PaseoMascota` por cada paseo realizado.

Validaciones y casos límite:

- `peso` debe ser >= 0 cuando esté presente.
- `fecha_nacimiento` opcional: si está presente, calcular edad para reglas de negocio.
- `vacunas[].fecha` opcional: cuando exista validar formato ISO/Date.

Notas de implementación:

- No denormalizar información sensible del dueño en `Mascota` salvo cuando sea necesario para reglas de consulta.
- Usar los converters de la capa de persistencia para transformar `Timestamp` ↔ `Date`.
