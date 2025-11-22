# Paseo

Resumen: Servicio de paseo que agrupa información sobre asignación, horario, duración, precio y estado operativo.

Uso rápido:

- Colección sugerida: `paseos`.
- Campos clave: `tipo_paseo`, `fecha_hora_inicio`, `duracion_estimada`, `precio`, `estado`.
- Soporta paseos individuales y múltiples (`es_multiple`, `cupo_maximo_mascotas`).

Contrato (TypeScript):

```ts
export interface Paseo extends BaseModel {
  id_cuidador?: string
  es_multiple?: boolean
  cupo_maximo_mascotas?: number
  mascotas_count?: number
  tipo_paseo: 'solicitado' | 'programado'
  fecha_hora_inicio: Date
  duracion_estimada: number
  precio: number
  estado:
    | 'pendiente'
    | 'confirmado'
    | 'en_progreso'
    | 'completado'
    | 'cancelado'
  ubicacion_inicio?: string
  ubicacion_fin?: string
  tracking_gps?: string
}
```

Ejemplo JSON (dominio):

```json
{
  "id": "paseo_100",
  "id_cuidador": "user_cuidador_01",
  "es_multiple": true,
  "cupo_maximo_mascotas": 3,
  "mascotas_count": 2,
  "tipo_paseo": "programado",
  "fecha_hora_inicio": "2025-11-12T10:00:00.000Z",
  "duracion_estimada": 60,
  "precio": 25000,
  "estado": "confirmado",
  "ubicacion_inicio": "Cra 45 #12-34",
  "ubicacion_fin": "Cra 45 #12-34",
  "tracking_gps": "tracking_doc_abc"
}
```

Relaciones y consideraciones:

- Subcolección `paseos/{paseoId}/mascotas` contiene `PaseoMascota` por cada participación.
- `id_cuidador` referencia a un `Usuario` con rol `cuidador`.
- `mascotas_count` es denormalizado para queries rápidas; mantenerlo consistente al añadir/remover mascotas.

Validaciones y casos límite:

- Si `es_multiple` = true, validar `cupo_maximo_mascotas` y que `mascotas_count` no lo supere.
- `fecha_hora_inicio` debe ser una fecha futura al crear paseos programados.
- `precio` debe ser >= 0.

Notas de implementación:

- Para tracking GPS usar referencias a documentos de tracking en `tracking_gps` en lugar de embedded blobs cuando los tracks son grandes.
- Mantener la lógica de transiciones de `estado` en un solo lugar (servicio/domino) para evitar inconsistencias.
