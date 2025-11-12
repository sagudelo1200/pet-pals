# PerfilPublico

Resumen: Vista pública del usuario pensada para mostrar confianza, experiencia y disponibilidad sin exponer datos sensibles.

Uso rápido:

- Ubicación: colección `perfiles_publicos` o subdocumento del `Usuario` según diseño.
- Campos de interés: `nombre`, `foto`, `biografia`, `zonas_servicio`, `rating_promedio`, `verificacion`.

Contrato (TypeScript):

```ts
export interface PerfilPublico extends BaseModel {
  nombre: string
  foto?: string
  biografia?: string
  experiencia?: string
  zonas_servicio?: string[]
  disponibilidad?: string
  mascotas_aceptadas?: string[]
  max_mascotas?: number
  valoraciones?: string[]
  rating_promedio?: number
  cantidad_paseos_realizados?: number
  verificacion: 'pendiente' | 'verificado' | 'rechazado'
}
```

Ejemplo JSON:

```json
{
  "id": "perfil_01",
  "nombre": "Camila Pérez",
  "foto": "https://cdn.example.com/camila.jpg",
  "biografia": "Paseadora certificada con 3 años de experiencia.",
  "experiencia": "Certificación ABC, experiencia en entrenamiento básico",
  "zonas_servicio": ["El Poblado", "Laureles"],
  "disponibilidad": "Lunes a Viernes 8:00-18:00",
  "mascotas_aceptadas": ["perro"],
  "max_mascotas": 4,
  "valoraciones": ["val_100", "val_101"],
  "rating_promedio": 4.8,
  "cantidad_paseos_realizados": 240,
  "verificacion": "verificado"
}
```

Relaciones y recomendaciones:

- Vinculado a `Usuario`: no duplicar información crítica (correo, documento) en el perfil público.
- `valoraciones` contiene IDs de `Valoracion`; calcular `rating_promedio` en backend o función periódica para evitar inconsistencias.

Validaciones y casos prácticos:

- `verificacion` controla visibilidad o filtros especiales; manejar transiciones (pendiente → verificado → rechazado) con auditoría.
- `max_mascotas` y `zonas_servicio` deberían usarse para filtros de búsqueda.

Notas de implementación:

- Preferir sincronización eventual (background job) desde `Usuario` a `PerfilPublico` para evitar bloqueos en operaciones de usuario.
