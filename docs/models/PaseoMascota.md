# PaseoMascota

Resumen: Registro que liga una mascota a un paseo, con estado por mascota y códigos de verificación físicos.

Uso rápido:

- Ubicación recomendada: subcolección `paseos/{paseoId}/mascotas`.
- Campos clave: `id_paseo`, `id_mascota`, `id_usuario`, `estado_mascota`.

Contrato (TypeScript):

```ts
export interface PaseoMascota extends BaseModel {
  id_paseo: string
  id_mascota: string
  id_usuario: string
  observaciones?: string
  codigo_recogida?: string
  codigo_entrega?: string
  estado_mascota: 'pendiente' | 'en_paseo' | 'entregada' | 'cancelada'
}
```

Ejemplo JSON (dominio):

```json
{
  "id": "paseomasc_001",
  "id_paseo": "paseo_100",
  "id_mascota": "masc_001",
  "id_usuario": "user_tutor_01",
  "observaciones": "Necesita correa extra resistente",
  "codigo_recogida": "RCG-4521",
  "codigo_entrega": "ENT-7833",
  "estado_mascota": "en_paseo",
  "creado_en": "2025-11-12T09:50:00.000Z",
  "actualizado_en": "2025-11-12T10:15:00.000Z"
}
```

Relaciones y recomendaciones:

- `id_paseo` → `Paseo` padre.
- `id_mascota` → `Mascota` participante (denormalizado para reglas y auditoría).
- `id_usuario` → tutor de la mascota; útil para reglas de seguridad.

Validaciones y casos prácticos:

- `codigo_recogida` y `codigo_entrega` son opcionales pero recomendados para trazabilidad física.
- `estado_mascota` define el flujo por mascota; normalizar transiciones en la lógica de dominio.

Notas de implementación:

- Al modelar como subcolección se optimizan consultas por paseo y se facilita el uso de reglas de seguridad basadas en `request.resource.data`.
