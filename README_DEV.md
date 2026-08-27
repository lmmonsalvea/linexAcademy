# Entorno de desarrollo local — Plataforma eLearning

Estos pasos configuran un entorno local mínimo para desarrollo y pruebas: Moodle (bitnami), PostgreSQL, MongoDB y un servicio simple para el centro de conocimiento.

Requisitos: Docker y Docker Compose instalados en tu máquina.

Iniciar el entorno:

```bash
cd "c:\Users\lmmonsalvea\OneDrive - Ultragroup\Escritorio\eLearning"
docker compose up -d --build
```

Servicios:
- Moodle: http://localhost:8080 (usuario `admin` y contraseña `adminpassword` por defecto en dev)
- Knowledge Center API: http://localhost:3000
- PostgreSQL: puerto local 5432 (dentro del contenedor postgres)
- MongoDB: puerto local 27017

Notas:
- Este entorno es para desarrollo/demo únicamente. Cambia credenciales y variables de entorno antes de pasar a producción.
- Para integración con Teams (Graph API) necesitarás registrar una aplicación en Azure AD y proporcionar credenciales de aplicación; por seguridad no se colocan en este repo.

Detener el entorno:

```bash
docker compose down
```

Ejecutar servicios sin Docker (opcional, útil si Docker no está instalado):

1) Auth Service
```bash
cd auth_service
npm install
npm start
```

2) Exams Service
```bash
cd exams_service
npm install
npm start
```

3) Knowledge Center
```bash
cd knowledge_center
npm install
npm start
```

Arranca el frontend (ver `frontend/README_FRONTEND.md`) y abre `http://localhost:5173`.

APIs disponibles en desarrollo:

- Knowledge Center:
	- `GET /areas` — listar áreas
	- `POST /areas` — crear área
	- `GET /areas/:id/documents` — listar documentos por área
	- `POST /areas/:id/documents` — crear documento
	- `GET /search?q=...` — búsqueda simple por título/contenido

- Exams Service (dev):
	- `POST /questions` — crear pregunta (body: text, type, options, answer)
	- `GET /questions` — listar preguntas
	- `POST /templates` — crear plantilla
	- `GET /templates` — listar plantillas
	- `POST /tests` — crear instancia de test (body: templateId, userId)
	- `POST /tests/:id/submit` — enviar respuestas
	- `GET /tests/:id/result` — ver resultado

- Auth Service (dev):
	- `POST /register` — registrar usuario (dev devuelve verifyToken)
	- `GET /verify?token=...` — verificar cuenta (dev)
	- `POST /login` — autenticarse, devuelve JWT
	- `GET /me` — obtener datos del token

