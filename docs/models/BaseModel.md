# BaseModel

Resumen: Contrato base con los metadatos mínimos que comparten todas las entidades (id y auditoría de creación/actualización).

Uso rápido:

- Campos clave: `id`, `creado_en`, `actualizado_en`, `creado_por`, `actualizado_por`.
- Persistencia: Firestore usa `Timestamp`; en dominio usamos `Date` (convertir al leer/escribir).

Contrato (TypeScript):

```ts
export interface BaseModel {
  id: string
  creado_en: Date
  actualizado_en: Date
  creado_por: string
  actualizado_por: string
}
```

Ejemplo JSON (representación en la capa de dominio):

```json
{
  "id": "abc123",
  "creado_en": "2024-05-10T14:32:00.000Z",
  "actualizado_en": "2024-05-12T09:20:00.000Z",
  "creado_por": "user_01",
  "actualizado_por": "user_02"
}
```

Relaciones y notas breves:

- Sirve como base para todos los modelos en `models/`.
- Convertir `Timestamp` ↔ `Date` en la capa de persistencia (ver `services/firebase/converters.ts`).

Validaciones y recomendaciones:

- `id` debe ser único y estable (usar documentId en Firestore).
- `creado_en` y `actualizado_en` deben establecerse desde el servidor cuando sea posible para evitar diferencias horarias.
