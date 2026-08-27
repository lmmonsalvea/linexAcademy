# Matriz de Roles y Permisos — Plataforma eLearning

Versión: 0.1
Fecha: 2026-08-16

## Roles principales
- `Superadmin` (TI): control total, despliegue, backups, gestión de integraciones.
- `Admin RRHH`: crea evaluaciones, accede a resultados de procesos de ingreso/ascenso, genera reportes RRHH.
- `Admin Área`: responsable por el contenido y permisos de su área; publica documentos en el centro de conocimiento; asigna instructores.
- `Instructor`: crea cursos, añade recursos (vídeo, SCORM, PDF), crea quizzes y califica actividades.
- `Knowledge Manager`: gestiona el centro de conocimiento, estructura áreas, controla versiones y metadatos.
- `Empleado`: rol base de cualquier persona registrada. Puede consultar el centro de conocimiento, ver el catálogo de cursos, inscribirse, completar módulos/evaluaciones y descargar sus certificados. Buscar documentación no requiere estar inscrito en ningún curso — "Alumno" no es un rol aparte, es simplemente un Empleado que además está tomando cursos.

## Permisos (resumen)

- Gestionar usuarios: Superadmin
- Gestionar roles: Superadmin
- Crear/editar cursos: Instructor, Admin Área (según política)
- Publicar documentos (centro de conocimiento): Admin Área, Knowledge Manager
- Asignar permisos de documentos: Admin Área, Knowledge Manager
- Crear evaluaciones RRHH: Admin RRHH
- Ver resultados de evaluaciones: Admin RRHH, Superadmin, el usuario evaluado
- Programar webinars: Instructor, Admin Área
- Gestionar integraciones (Teams, LRS): Superadmin

## Regla de delegación por área
- Cada área tiene un `Admin Área` que puede:
  - Crear/editar documentos de su área.
  - Asignar instructores y revisar contenidos propuestos.
  - Conceder permisos de lectura/escritura a usuarios de su área.

## Flujo de aprobación de documentos
1. Instructor o colaborador sube documento a borradores del área.
2. Admin Área revisa y aprueba para publicar en el centro de conocimiento.
3. Knowledge Manager puede cambiar metadatos y publicar globalmente si aplica.

## Notas sobre RRHH y evaluaciones
- Las evaluaciones vinculadas a ingresos y ascensos deben quedar registradas con auditoría (fecha, evaluador, puntuaciones, observaciones).
- RRHH podrá crear plantillas de evaluación (habilidades blandas/duras) y asignarlas a procesos.

## Accesos y seguridad
- Autenticación inicial por correo con verificación; en futuro SSO/SSO2 configurable.
- Logs de cambios en permisos y documentos disponibles para Superadmin y RRHH según política.

## Estado de implementación

La identidad ya no es un JWT propio: el login es **Microsoft/Entra ID SSO real** vía
Firebase Auth (proveedor nativo `microsoft.com`, ya configurado en el proyecto
compartido `linexrewards-app` — ver `docs/org-context.md` y
`.claude/skills/connect-entra-id-firebase-auth/`). Un login exitoso solo prueba
identidad; la autorización (rol dentro de linexAcademy) es responsabilidad de
este backend, no de Firebase/Entra ID.

El rol vive en Firestore (`users/{uid}.role`, base nombrada `linex-academy`)
con estos valores: `empleado` (por defecto), `instructor`, `admin_area`,
`admin_rrhh`, `knowledge_manager`, `superadmin`. En el primer login, el
backend (`backend/src/middleware/auth.js`) verifica el token de Firebase,
comprueba que el dominio del correo esté en la lista permitida
(`ultragroupla.com`, `linextravel.com`, `linex-loyalty.com`) y crea el
documento del usuario con rol `empleado` — de ahí en adelante cada request
vuelve a leer ese documento, no hay nada que decodificar del lado del cliente.

Un único backend consolidado (`backend/`, antes 4 microservicios separados)
aplica los mismos permisos que antes:

- Cursos: crear cursos/módulos requiere `instructor`, `admin_area` o `superadmin`. Inscripción, progreso y certificado usan la identidad del token; ver el progreso de otra persona requiere `instructor`, `admin_area`, `admin_rrhh` o `superadmin`.
- Centro de conocimiento: publicar áreas/documentos y nuevas versiones requiere `admin_area`, `knowledge_manager` o `superadmin`. Las lecturas ahora requieren sesión iniciada (ver "Pendientes resueltos" abajo).
- Evaluaciones: crear/listar preguntas y plantillas, y exportar resultados, requiere `admin_rrhh` o `superadmin` (antes el banco de preguntas con las respuestas correctas era legible por cualquier usuario autenticado — corregido). Enviar respuestas y ver el propio resultado usan la identidad del token; ver el resultado de otro requiere `admin_rrhh` o `superadmin`.

Panel de administración de roles: `/admin` (solo `superadmin`), respaldado por
`GET/PATCH /api/users`. El primer superadmin se asigna fuera de la app, ver
`backend/scripts/bootstrap-superadmin.js` — es un problema de arranque
inevitable (nadie puede asignarse el primer rol de administrador dentro de un
sistema donde solo un administrador puede asignar roles).

## Pendientes resueltos en esta iteración

- Navegación oculta sin sesión iniciada — `/` muestra la portada pública (`Landing`) hasta iniciar sesión, y todas las rutas de la app están protegidas por `ProtectedRoute`.
- Panel de administración para asignar/cambiar roles (`/admin`).
- Las lecturas del centro de conocimiento y de las evaluaciones ahora requieren sesión iniciada (antes eran públicas sin autenticación).

## Pendientes (todavía no implementados)

- Delegación de permisos por área más granular (hoy `admin_area` es un rol global, no está atado a un área específica en los datos).
- Auditoría persistente de cambios de rol y de permisos de documentos más allá del campo `roleUpdatedBy`/`roleUpdatedAt`.

---

Este documento sirve como base para implementar la matriz de permisos en el LMS y en el módulo del centro de conocimiento.
