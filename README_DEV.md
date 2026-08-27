# linexAcademy — entorno de desarrollo

Plataforma interna de eLearning para Linex Travel / UltraGroup, desplegada sobre
la infraestructura compartida de la organización (proyecto Firebase/GCP
`linexrewards-app`, ver `docs/org-context.md`).

## Arquitectura

- **Frontend**: React + Vite (`frontend/`), servido como sitio estático desde
  **Firebase Hosting**.
- **Backend**: Express (`backend/`), un único servicio consolidado (ya no 4
  microservicios separados) desplegado en **Cloud Run**.
- **Base de datos**: Firestore, base nombrada `linex-academy` dentro del
  proyecto compartido `linexrewards-app` (no la base `(default)` — ver
  `docs/org-context.md`, cada app del proyecto tiene la suya).
- **Autenticación**: Firebase Auth con el proveedor nativo de Microsoft, sobre
  el App Registration de Entra ID ya configurado en `linexrewards-app` para el
  tenant de Ultragroup (dominios `ultragroupla.com`, `linextravel.com`,
  `linex-loyalty.com`). No hay registro con contraseña — el login es SSO
  corporativo real. Ver `.claude/skills/connect-entra-id-firebase-auth/`.

El prototipo anterior (Moodle + Postgres + Mongo + JWT propio, 4 servicios
separados) fue reemplazado por completo; su lógica de negocio se migró a este
backend, pero el código viejo ya no existe (queda en el historial de git del
primer commit si hace falta consultarlo).

## Requisitos

- Node.js 20+, `gh`, `firebase-tools` (ver `docs/required-tools.md`).
- `gcloud` CLI — necesario para desplegar el backend en Cloud Run (no
  requerido solo para desarrollo local).
- Acceso al proyecto Firebase `linexrewards-app` (`firebase login`).

## Desarrollo local

1. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env   # ajustar si hace falta
   gcloud auth application-default login   # una vez, para que el Admin SDK tenga credenciales
   npm run dev
   ```
   Escucha en `http://localhost:8081`.

2. **Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local   # completar VITE_FIREBASE_API_KEY / VITE_FIREBASE_APP_ID desde
                                  # Firebase Console > linexrewards-app > Project settings > tu app web
   npm run dev
   ```
   Abre `http://localhost:5173`.

3. **Datos de ejemplo** (opcional, siembra cursos/documentos/preguntas en
   Firestore directamente):
   ```bash
   cd backend
   node scripts/seed-demo-data.js
   ```

4. **Primer superadmin**: inicia sesión una vez con tu cuenta corporativa
   (quedas como `empleado` por defecto), luego:
   ```bash
   cd backend
   node scripts/bootstrap-superadmin.js tu.correo@ultragroupla.com
   ```
   Desde ahí, usa el panel `/admin` para asignar el resto de roles.

## Despliegue

### Backend (Cloud Run)

```bash
cd backend
gcloud run deploy linexacademy-backend \
  --source . \
  --region=us-east4 \
  --project=linexrewards-app \
  --allow-unauthenticated \
  --set-env-vars=FIRESTORE_DATABASE_ID=linex-academy,CORS_ORIGINS=https://<tu-dominio-de-hosting>
```

El servicio usa Application Default Credentials en Cloud Run automáticamente
— no hay clave de service account que gestionar (ver
`docs/org-context.md`, `iam.disableServiceAccountKeyCreation`). La cuenta de
servicio del servicio necesita permisos de Firestore/Auth sobre el proyecto
(`roles/datastore.user` como mínimo) — ver `.claude/skills/manage-team-permissions/`.

### Frontend (Firebase Hosting)

```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting --project=linexrewards-app
```

### Base de datos y reglas

Ya provisionadas: base Firestore nombrada `linex-academy` y reglas
`firestore.rules` (deny-all — todo el acceso pasa por el backend, ningún
cliente habla directo con Firestore). Para volver a desplegar las reglas tras
un cambio:
```bash
firebase deploy --only firestore:rules --project=linexrewards-app
```

## Pendiente de configurar manualmente (requiere decisiones/permisos que no se automatizan desde aquí)

Ver el mensaje de la conversación donde se generó este cambio para el
checklist exacto — en resumen: habilitar Identity Platform en
`linexrewards-app` si no está, agregar el dominio de Hosting a "Authorized
domains" en Firebase Auth, crear el servicio de Cloud Run la primera vez, y
asignar el primer superadmin.

## API (backend, todo bajo `/api`, requiere `Authorization: Bearer <Firebase ID token>`)

- `GET /api/session/me` — perfil + rol del usuario autenticado.
- `GET /api/users`, `PATCH /api/users/:uid/role` — administración de roles (superadmin).
- `GET/POST /api/courses`, `GET /api/courses/:id`, `POST /api/courses/:id/modules`,
  `POST /api/courses/:id/enroll`, `POST /api/courses/:id/progress`,
  `GET /api/courses/:id/progress/:uid`, `GET /api/courses/:id/certificate`.
- `GET/POST /api/knowledge/areas`, `GET/POST /api/knowledge/areas/:id/documents`,
  `GET /api/knowledge/documents/:id`, `POST /api/knowledge/documents/:id/version`,
  `GET /api/knowledge/search?q=`.
- `GET/POST /api/exams/questions`, `GET/POST /api/exams/templates`,
  `POST /api/exams/tests`, `POST /api/exams/tests/:id/submit`,
  `GET /api/exams/tests/:id/result`, `GET /api/exams/tests?mine=true`,
  `GET /api/exams/tests/:id/export.csv`, `GET /api/exams/tests/report?templateId=`.
