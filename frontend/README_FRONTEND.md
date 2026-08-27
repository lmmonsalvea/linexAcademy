Frontend dev (React + Vite)

Requisitos: Node.js 20+ y npm.

Instalar dependencias:

```bash
cd "c:\Users\lmmonsalvea\OneDrive - Ultragroup\Escritorio\eLearning\frontend"
npm install
cp .env.example .env.local   # completar VITE_FIREBASE_API_KEY / VITE_FIREBASE_APP_ID
```

Levantar servidor dev:

```bash
npm run dev
```

Por defecto Vite muestra el servidor en `http://localhost:5173`.

Para ver el progreso del front:
- Arranca `npm run dev` y abre `http://localhost:5173`.
- Los cambios en `src/` recargan automáticamente (hot reload).
- Las llamadas a backend usan `VITE_API_BASE_URL` (por defecto `http://localhost:8081`, el backend consolidado en `../backend`) con el token de Firebase Auth adjunto automáticamente — ver `src/utils/api.js`.

Para producción:

```bash
npm run build
npm run preview
```


