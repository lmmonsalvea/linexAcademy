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

## Estado de implementación (MVP)

El rol vive en `auth_service` (campo `role` del usuario, incluido en el JWT) con estos valores: `empleado` (por defecto), `instructor`, `admin_area`, `admin_rrhh`, `knowledge_manager`, `superadmin`. Cada microservicio valida el JWT y el rol de forma independiente (no hay un servicio de autorización centralizado todavía):

- `courses_service`: crear cursos/módulos requiere `instructor`, `admin_area` o `superadmin`. Inscripción, progreso y certificado usan la identidad del token (no se puede actuar en nombre de otro usuario); ver el progreso de otra persona requiere `instructor`, `admin_area`, `admin_rrhh` o `superadmin`.
- `knowledge_center`: publicar áreas/documentos y nuevas versiones requiere `admin_area`, `knowledge_manager` o `superadmin`. Las lecturas (catálogo, búsqueda) siguen abiertas.
- `exams_service`: crear preguntas/plantillas y exportar resultados requiere `admin_rrhh` o `superadmin`. Enviar respuestas y ver el propio resultado usan la identidad del token; ver el resultado de otro requiere `admin_rrhh` o `superadmin`.

No existe aún un panel de administración para asignar/cambiar roles — por ahora se eligen al registrarse (pantalla de Registro), lo cual es aceptable solo para desarrollo/pruebas.

## Pendientes (registrados, no implementados aún)
- Ocultar la navegación (Cursos/Centro de conocimiento/Evaluaciones) cuando no hay sesión iniciada, mostrando solo una portada con descripción de la plataforma; mostrar las secciones una vez autenticado.
- Panel de administración para asignar y cambiar roles (hoy se elige libremente al registrarse).
- Restringir también las lecturas (catálogo, documentos) a usuarios autenticados, si se decide que ni siquiera la portada pública debe exponer contenido.

---

Este documento sirve como base para implementar la matriz de permisos en el LMS y en el módulo del centro de conocimiento.
