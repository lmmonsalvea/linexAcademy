# Requisitos detallados — Plataforma eLearning

Versión: 0.1
Fecha: 2026-08-16

## Contexto
Plataforma interna para ~200 empleados, en español, con funcionalidades de LMS, centro de conocimiento por áreas, gestión de RRHH (evaluaciones para ingresos y ascensos) y webinars mediante Microsoft Teams.

## Actores
- Superadmin (TI)
- Admin RRHH
- Admin Área (responsable por área funcional)
- Instructor
- Empleado (rol base; ver `roles_permisos.md` — no es un rol distinto de "Alumno", cualquier empleado puede tomar cursos o simplemente consultar documentación)
- Knowledge Manager (encargado del centro de conocimiento)

## Historias de usuario (priorizadas)

1) Registro / Login — implementado vía Microsoft/Entra ID SSO (no contraseña propia)
- Como empleado, quiero iniciar sesión con mi cuenta corporativa de Microsoft para acceder a la plataforma, sin crear ni recordar otra contraseña.
- Implementación real: Firebase Auth con el proveedor nativo `microsoft.com`, sobre el App Registration de Entra ID ya compartido en el proyecto `linexrewards-app` (tenant de Ultragroup) — ver `docs/org-context.md` y `.claude/skills/connect-entra-id-firebase-auth/`. No existe registro con contraseña ni correo de verificación propio: la identidad la garantiza Microsoft.
- Criterios de aceptación: solo se aprovisionan automáticamente cuentas con dominio `@ultragroupla.com`, `@linextravel.com` o `@linex-loyalty.com` (ver `roles_permisos.md`); cualquier otro dominio recibe un 403 al primer intento de login. El primer superadmin se asigna manualmente (`backend/scripts/bootstrap-superadmin.js`), el resto de roles vía el panel `/admin`.

2) Roles y permisos
- Como Admin Área, quiero asignar permisos y publicar documentos de mi área.
- Criterios: Admin Área puede crear/editar documentos de su área, asignar instructores y gestionar accesos a usuarios de su área.

3) Gestión de cursos
- Como Instructor, quiero crear cursos que contengan vídeos, SCORM/xAPI, PDFs y quizzes.
- Criterios: curso visible en catálogo según permisos; soporte para paquete SCORM; subir vídeos privados.

4) Evaluaciones RRHH
- Como Admin RRHH, quiero crear evaluaciones vinculadas a procesos de ingreso/ascenso que registren habilidades blandas y duras.
- Criterios: evaluaciones asignables a candidatos/empleados, resultados almacenados, exportable en CSV y visible para RRHH y el usuario evaluado.

5) Centro de conocimiento
- Como empleado, quiero acceder a documentos y procesos de la compañía filtrados por área.
- Criterios: cada área tiene su espacio; control de versiones; permisos administrados por Admin Área; búsqueda por título/tags.

6) Webinars con Teams
- Como Instructor/Admin, quiero programar un webinar con Teams y habilitar la grabación para acceso on-demand.
- Criterios: enlace a reunión Teams generado/adjuntado; subida automática de grabación (si permiso concedido) o subida manual.

7) Progreso y certificados
- Como Alumno, quiero ver mi progreso y descargar certificados en PDF al completar cursos.
- Criterios: progreso por módulo y por curso; certificado con logo y datos.

8) Informes y analytics
- Como Admin, quiero exportar reportes por curso, por usuario y por área.
- Criterios: filtros por fecha, área y curso; export CSV/PDF.

9) Integración y seguridad
- Como TI, quiero que la plataforma corra en Azure y use MongoDB para el centro de conocimiento.
- Criterios: Moodle en Docker (dev), producción en Azure; credenciales seguras en variables de entorno; backups programados.

## Requerimientos no funcionales
- Idioma: Español.
- Disponibilidad: objetivo 99% (producción).
- Escalabilidad: soportar crecimiento >200 usuarios.
- Accesibilidad: WCAG 2.1 nivel AA (objetivo en iteraciones posteriores).
- Logs y auditoría: cambios en permisos y evaluaciones auditables.

## Entregables MVP

- ~~Entorno dev local con Moodle + Postgres + Mongo~~ — reemplazado: backend
  consolidado (`backend/`) sobre Firestore + Firebase Auth, ver `README_DEV.md`.
- Frontend (login con Microsoft SSO, catálogo, vista curso, conocimientos por área) — implementado en `frontend/`.
- Soporte SCORM simple y reproducción de vídeo — módulos de curso soportan tipo `scorm`/`video` como enlace externo; no incluye un reproductor SCORM embebido (roadmap).
- Sistema de roles y permisos — implementado (incluye Admin RRHH y Admin Área), con panel de administración de roles en `/admin`.
- Integración manual con Teams (enlaces a reuniones y subida manual de grabaciones) — pendiente, no implementado en esta iteración.

---

Archivo creado para servir como base de requisitos y para la priorización de historias.
