Frontend dev (React + Vite)

Requisitos: Node.js 18+ y npm.

Instalar dependencias:

```bash
cd "c:\Users\lmmonsalvea\OneDrive - Ultragroup\Escritorio\eLearning\frontend"
npm install
```

Levantar servidor dev:

```bash
npm run dev
```

Por defecto Vite muestra el servidor en `http://localhost:5173`.

Para ver el progreso del front:
- Arranca `npm run dev` y abre `http://localhost:5173`.
- Los cambios en `src/` recargan automáticamente (hot reload).
- Las llamadas a backend usan `http://localhost:3000` (knowledge_center), `http://localhost:4000` (exams_service), `http://localhost:5000` (auth_service) y `http://localhost:7000` (courses_service).

Para producción:

```bash
npm run build
npm run preview
```


