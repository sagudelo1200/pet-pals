# Usuario

Resumen: Representa la cuenta de una persona en la plataforma: datos de contacto, roles, dirección y estado operativo.

Uso rápido:

- Colección sugerida: `usuarios`.
- Campos críticos: `nombre`, `correo`, `celular`, `roles`, `verificado`, `estado`.
- Roles: `tutor`, `cuidador`, `admin` (un usuario puede tener varios roles).

Contrato (TypeScript):

```ts
export interface Usuario extends BaseModel {
  nombre: string
  foto?: string
  correo: string
  celular: string
  fecha_nacimiento?: Date
  direccion?: {
    calle?: string
    numero?: string
    barrio?: string
    comuna?: string
    ciudad?: string
    departamento?: string
    pais?: string
    codigo_postal?: string
    coordenadas?: { lat: number; lng: number }
    referencia?: string
    descripcion?: string
  }
  zona?: string
  roles: ('tutor' | 'cuidador' | 'admin')[]
  documento_identidad?: {
    tipo: 'NUIP' | 'CC' | 'CE' | 'Pasaporte'
    numero: string
  }
  verificado: boolean
  estado: 'activo' | 'inactivo' | 'baneado'
}
```

Ejemplo JSON (dominio):

```json
{
  "id": "user_tutor_01",
  "nombre": "Andrés Gómez",
  "foto": "https://cdn.example.com/andres.jpg",
  "correo": "andres@example.com",
  "celular": "+573001112233",
  "fecha_nacimiento": "1990-03-15T00:00:00.000Z",
  "direccion": {
    "calle": "Cll 10",
    "numero": "45A",
    "barrio": "Laureles",
    "ciudad": "Medellín",
    "coordenadas": { "lat": 6.2442, "lng": -75.5812 }
  },
  "zona": "Laureles",
  "roles": ["tutor"],
  "verificado": true,
  "estado": "activo",
  "creado_en": "2024-01-10T12:00:00.000Z",
  "actualizado_en": "2024-06-04T08:30:00.000Z"
}
```

Relaciones y notas prácticas:

- Un `Usuario` puede tener varias `Mascota`.
- `id_cuidador` en `Paseo` referencia a un `Usuario` con rol `cuidador`.
- Mantener separación clara entre datos privados (`correo`, `documento_identidad`) y públicos (`PerfilPublico`).

Validaciones y consideraciones de seguridad:

- `correo` y `celular` deben ser únicos o validados según política de la app.
- `documento_identidad` almacenar sólo tras consentimiento y control de acceso estricto.

Notas de implementación:

- Para búsquedas geográficas usar `direccion.coordenadas` y una estrategia de indexación compatible con Firestore/algolia según necesidad.
