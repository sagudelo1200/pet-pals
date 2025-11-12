# Valoracion

Resumen: Registro de la calificación y comentario sobre un paseo; se usa para reputación y métricas.

Uso rápido:

- Colección: `valoraciones`.
- Campos obligatorios: `id_paseo`, `id_paseador`, `rating`, `fecha`.

Contrato (TypeScript):

```ts
export interface Valoracion extends BaseModel {
  id_paseo: string
  id_paseador: string

  rating: number
  comentario?: string
  fecha: Date
}
```

Ejemplo JSON:

```json
{
  "id": "val_100",
  "id_paseo": "paseo_100",
  "id_paseador": "user_paseador_01",
  "rating": 5,
  "comentario": "Excelente servicio, puntual y cuidadoso con mi mascota.",
  "fecha": "2025-11-12T12:30:00.000Z",
  "creado_en": "2025-11-12T12:30:00.000Z"
}
```

Relaciones y recomendaciones:

- `id_paseo` → `Paseo` valorado.
- `id_paseador` → `Usuario` que recibió la valoración.
- Calcular `rating_promedio` en backend o mediante funciones programadas para evitar lecturas costosas y datos inconsistentes.

Validaciones y casos borde:

- `rating` debe ser un entero entre 1 y 5.
- Evitar duplicados: definir política (ej. un usuario sólo puede valorar un paseo una vez).

Notas de implementación:

- Mantener `creado_en` y `fecha` coherentes (usar servidor para timestamps si es necesario).
