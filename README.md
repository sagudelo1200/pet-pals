# Pet Pals

Pet Pals implementa un sistema cuyo **core** es coordinar un **servicio** (solicitud → asignación → ejecución → cierre) y, durante la ejecución, habilitar **seguimiento en tiempo real**.

Este README describe el **dominio** (conceptos, estados y flujos) y luego muestra el **caso de uso** concreto de Pet Pals. No incluye instalación, marketing ni promesas futuras.

## Core / dominio

### Roles

- **Tutor**: quien solicita el servicio.
- **Cuidador**: quien ejecuta el servicio.

### Entidades

- **Mascota**: unidad atendida por el servicio (en Pet Pals, una mascota).
- **Paseo**: la unidad central del sistema. Define actores, estado y registro de eventos.

### Estados del servicio (paseo)

Un paseo típico recorre estos estados:

- **PENDIENTE**: solicitud creada; aún no está asignada.
- **CONFIRMADO**: asignado a un cuidador.
- **EN_CAMINO**: el cuidador inicia el acercamiento al punto de inicio.
- **EN_PROGRESO**: ejecución activa; aquí aplica seguimiento en tiempo real.
- **FINALIZADO**: el cuidador marca el fin de la ejecución.
- **COMPLETADO**: cierre final cuando aplica.

Referencia detallada: [docs/paseos/state-machine.md](docs/paseos/state-machine.md)

### Flujo fundamental

1. El tutor crea una solicitud.
2. Un cuidador acepta y queda asignado.
3. El cuidador avanza el servicio por estados.
4. Durante la ejecución, el tutor puede observar el avance (seguimiento).
5. El servicio se finaliza y queda registrado.

### Seguimiento en tiempo real

Durante una ejecución activa, el sistema puede publicar/consumir ubicación para mostrar el avance.

- El seguimiento está asociado al **servicio activo** (no es rastreo permanente).
- En la práctica funciona en dos modos:
  - **Foreground**: la app está en pantalla.
  - **Background**: la app no está visible.

### Datos (alto nivel)

Pet Pals separa “estado del servicio” y “coordenadas en vivo” en dos almacenes:

- **Firestore**: entidades del dominio y trazabilidad (eventos).
- **Realtime Database**: ubicación en tiempo real durante servicios activos.

En lenguaje simple:

- Firestore guarda qué pasa y con quién.
- RTDB guarda dónde va el ejecutor ahora.

## Caso de uso: Pet Pals

### Para tutores

1. Inicias sesión.
2. Registras mascotas.
3. Solicitas un paseo.
4. Un cuidador acepta el paseo.
5. Sigues el estado y, cuando está activo, el seguimiento.
6. Se finaliza y queda registrado.

### Para cuidadores

1. Inicias sesión.
2. Gestionas tu perfil público.
3. Ves solicitudes.
4. Aceptas una solicitud.
5. Avanzas por estados (en camino → en progreso → finalizado).
6. Durante la ejecución, compartes ubicación para seguimiento.

## Cómo está organizado el código (mapa rápido)

- `screens/`: pantallas por rol.
- `components/`: UI reutilizable.
- `context/`: estado global (auth/rol/mascotas).
- `hooks/`: orquestación (sincronización, tracking, queries).
- `logic/`: reglas del dominio (paseos, auth, ubicaciones, usuarios).
- `services/`: acceso a Firebase.
- `models/`: modelos de dominio.

## Qué existe hoy (honesto con el repo)

- Registro e inicio de sesión (incluye Google).
- Roles y navegación por rol (Tutor / Cuidador).
- Gestión de mascotas.
- Solicitud y gestión de paseos.
- Control por estados del paseo.
- Mapa y seguimiento durante un paseo activo.
- Perfil público del cuidador (edición de datos básicos).

## Qué está incompleto

- **Cancelación** del paseo (flujo no cerrado end-to-end).
- **Valoraciones/rating** (persistencia + cálculo y presentación final).
- **Chat** (no está listo para producción).
- **Admin** (placeholder).

## Documentación interna

- [docs/flows/FLUJO_DE_PASEO.md](docs/flows/FLUJO_DE_PASEO.md)
- [docs/flows/solicitar-paseo.md](docs/flows/solicitar-paseo.md)
- [docs/paseos/state-machine.md](docs/paseos/state-machine.md)
- [docs/models/README.md](docs/models/README.md)
