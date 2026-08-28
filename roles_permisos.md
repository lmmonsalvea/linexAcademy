# Matriz de Roles y Permisos — Plataforma eLearning

Versión: 0.3
Fecha: 2026-08-28

## Roles (reducidos a los que realmente se usan en este alcance)

- **Superadmin**: control total, sin restricciones. Gestiona usuarios (roles, inactivar/eliminar, asignación de unidad/bloque), y puede crear/editar cualquier curso o contenido del centro de conocimiento.
- **Admin Área**: crea/edita cursos y publica documentos, áreas, bloques y equipos del centro de conocimiento.
- **Instructor**: crea/edita cursos **y** gestiona evaluaciones (banco de preguntas, plantillas, resultados agregados, exportes).
- **Empleado**: rol base de cualquier persona registrada. Ve su catálogo de cursos (los que le corresponden), avanza módulos, presenta evaluaciones y descarga certificados. No existe un rol "Alumno" separado.

Se eliminaron `Admin RRHH` y `Knowledge Manager` de este alcance (sin usuarios asignados a ellos al momento de quitarlos). Sus permisos se repartieron así:
- Gestión de evaluaciones (antes exclusiva de Admin RRHH) → ahora la tiene **Instructor** también, junto con Superadmin.
- Gestión de contenido del centro de conocimiento (antes también de Knowledge Manager) → la sigue teniendo **Admin Área**, junto con Superadmin.

El panel RRHH (`/rrhh`) está oculto por ahora (componente conservado en `frontend/src/pages/RRHHPanel.jsx`, sin ruta ni enlace en el menú) — no forma parte de este primer alcance.

## Permisos (resumen)

- Gestionar usuarios / roles / inactivar / eliminar: Superadmin
- Crear/editar cursos, asignarlos a unidad de negocio y bloque, ocultar módulos: Instructor, Admin Área, Superadmin
- Crear/editar evaluaciones (banco de preguntas, plantillas), ver resultados agregados: Instructor, Superadmin
- Publicar/renombrar áreas, bloques y equipos del centro de conocimiento: Admin Área, Superadmin
- Ver el progreso/certificado de otra persona: Instructor, Admin Área, Superadmin

## Identidad y autorización

La identidad es **Microsoft/Entra ID SSO real** (y también Google, ver más abajo) vía
Firebase Auth — proveedores nativos `microsoft.com` y `google.com`, ya configurados en el
proyecto compartido `linexrewards-app` (ver `docs/org-context.md` y
`.claude/skills/connect-entra-id-firebase-auth/`). Un login exitoso solo prueba
identidad; la autorización (rol dentro de linexAcademy) es responsabilidad de
este backend, no de Firebase/Entra ID.

**Nota de una corrección real:** el login con Microsoft dejó de funcionar en un
momento porque el backend exigía `email_verified` en el token — Google
siempre lo marca, pero las cuentas de trabajo/escuela de Microsoft/Entra ID
frecuentemente no lo marcan aunque la cuenta sea legítima. Se quitó esa
exigencia (`backend/src/middleware/auth.js`); el filtro real de acceso es la
lista de dominios permitidos, no ese campo.

El rol vive en Firestore (`users/{uid}.role`, base nombrada `linex-academy`)
con estos valores: `empleado` (por defecto), `instructor`, `admin_area`,
`superadmin`. En el primer login, el backend verifica el token de Firebase,
comprueba que el dominio del correo esté en la lista permitida
(`ultragroupla.com`, `linextravel.com`, `linex-loyalty.com`) y crea el
documento del usuario con rol `empleado`.

Panel de administración de roles: `/admin` (solo `superadmin`), respaldado por
`GET/PATCH /api/users`. Desde ahí también se puede **inactivar** (bloquea el
login, reversible), **eliminar** (borra la cuenta de Firebase Auth y su
registro, permanente) y asignar la **unidad de negocio / bloque** de cada
persona (`PATCH /api/users/:uid/assignment`). Ninguna de las dos acciones
destructivas se puede aplicar a la propia cuenta. El primer superadmin se
asigna fuera de la app, ver `backend/scripts/bootstrap-superadmin.js`.

## Cursos: asignación por unidad/bloque y matrícula automática

Ya no existe la auto-inscripción ("Inscribirme"): a un curso se le asignan
cero o más unidades de negocio (`assignedAreaIds`) y bloques
(`assignedBlocks`) al crearlo/editarlo — sin nada seleccionado, queda
transversal (abierto a toda la compañía). A partir de ahí, `backend/src/lib/enrollmentSync.js`
matricula automáticamente a quien corresponda, sin que la persona haga nada:

- Al crear o editar un curso: matricula a todas las personas cuya
  unidad/bloque coincida (o a todas si el curso es transversal).
- Al cambiar la unidad/bloque de una persona (`/admin`): la matricula en
  cualquier curso que ahora coincida.
- Al primer login de alguien nuevo: la matricula en los cursos transversales
  (sin unidad/bloque asignado aún, pero ya calificando por "abierto a
  todos").

Los módulos de un curso también se pueden **ocultar** individualmente (quedan
guardados, pero no los ven los estudiantes ni cuentan para el progreso o el
certificado) — útil para contenido en construcción sin tener que borrarlo.

## Centro de conocimiento: administración de la estructura

Superadmin y Admin Área pueden, además de publicar equipos (documentos):
- Renombrar una unidad de negocio (área).
- Renombrar un bloque (actualiza en bloque todos los equipos que lo usan —
  un bloque no es una entidad propia en Firestore, es un campo compartido).
- Renombrar un equipo de trabajo y/o moverlo a otro bloque o unidad de
  negocio distinto.

## Pendientes (todavía no implementados)

- Gestión manual de matrícula (excepciones puntuales fuera de la asignación por unidad/bloque).
- Auditoría persistente de cambios de rol/estructura más allá de los campos `roleUpdatedBy`/`roleUpdatedAt`.
- Envío real de correo de "actualización de curso" (el mecanismo ya existe en `backend/src/lib/mailer.js`, pendiente de credenciales SMTP).

---

Este documento sirve como base para implementar la matriz de permisos en el LMS y en el módulo del centro de conocimiento.
