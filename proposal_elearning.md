# Propuesta inicial: Plataforma eLearning — Ultragroup / Linex Travel

Fecha: 2026-08-16

## Resumen ejecutivo

Objetivo: Construir una plataforma eLearning interna para ~200 empleados (solo uso interno) que soporte vídeo, SCORM/xAPI, PDFs, quizzes y webinars, con autenticación por correo corporativo y diseño alineado al manual de marca.

Recomendación inicial: Implementar un MVP sobre **Moodle self-hosted** (rápido, soporta SCORM/xAPI y plugins) y un **frontend React** personalizado para adaptar la experiencia y aplicar la guía de marca. Usar hosting en Azure (opción dev local para aprobación) y servicios de vídeo gestionado (Vimeo/Cloudflare Stream) para streaming seguro.

---

## Supuestos del proyecto
- Usuarios: ~200 empleados internos.
- Contenido: vídeos, SCORM/xAPI, PDFs, quizzes, webinars.
- Idioma: Español (UI y notificaciones).
- Autenticación: registro con correo corporativo (@ultragroupla.com, @linextravel.com) y verificación por email.
- Hosting: inicialmente local/desarrollo para aprobación; producción en Azure (opcionalmente otra nube).

---

## Requisitos funcionales (alto nivel)
- Registro y login con verificación por correo corporativo.
- Roles: Admin, Instructor, Alumno.
- Gestión de cursos: creación, SCORM/xAPI, subida de vídeos y recursos (PDFs), módulos y evaluación.
- Reproductor de vídeo seguro (privado) y control de accesos.
- Quizzes y evaluaciones con calificaciones y certificados básicos.
- Progreso por usuario y por curso; panel de usuario y dashboard de administración.
- Webinars en vivo (integración BigBlueButton o Zoom) y grabación on-demand.
- Exportes de informes y soporte xAPI → LRS opcional.

---

## Recomendación técnica (stack)
- LMS base: **Moodle** (self-hosted). Razones: amplio soporte SCORM/xAPI, comunidad, plugins para LRS/SCORM/SSO, flexible y coste de licencia nulo.
- Frontend: **React** (Create React App / Vite) + UI library (Chakra UI o Tailwind CSS) para acelerar componentes y aplicar manual de marca.
- Backend adicional: Moodle REST API para consumo desde front; microservicios ligeros Node.js/Python si es necesario para integraciones.
- Base de datos: PostgreSQL (gestionada para producción).
- Storage: Blob storage (Azure Blob / S3) para assets y vídeos (si no se usa Vimeo).
- Streaming vídeo: **Vimeo Pro/Business** o **Cloudflare Stream** (seguro, con control de dominio y tokenización). Alternativa: servir desde Blob+CDN.
- Webinars: **BigBlueButton** (self-hosted, open source) o integración con Zoom (si ya cuentan con licencia).
- Analytics: integrarlo con LRS (Learning Locker) para xAPI y/o with Google Analytics para métricas de plataforma.

---

## Comparativa rápida: Moodle vs Open edX vs SaaS
- Moodle (recomendado): Gratis, maduro para SCORM/xAPI, flexible, rápido de deploy y personalizar. Requiere mantenimiento infra y algo de desarrollo para frontend moderno.
- Open edX: Más robusto y escalable para experiencias complejas, pero mayor complejidad operativa y curva de adopción.
- SaaS (TalentLMS/Docebo): Rápido a lanzar, menos mantenimiento, pero costos recurrentes y menos personalizable; difícil replicar UX muy personalizado.

Recomendación: Moodle self-hosted para equilibrar coste, control y velocidad de entrega.

---

## Opciones de hosting y estimación de costes (orientativo)

1) Desarrollo local / On-premises (fase de aprobación)
- Descripción: desplegar todo en máquinas locales o en una VM local para demostración.
- Coste: básicamente horas de desarrollo; infra mínima (sin coste cloud).
- Uso: demo y pruebas internas.

2) Azure - opción económica (small production)
- Componentes: 1 VM (B2ms/B4ms) para Moodle + Managed PostgreSQL Basic + Blob Storage + CDN + Backup.
- Estimación mensual: aprox. USD 150–400/mes (depende de tamaño de VM, tráfico de vídeo y backups).

3) Azure - opción producción escalable
- Componentes: AKS (Kubernetes) o App Services + Azure Database for PostgreSQL (general purpose) + Blob Storage + CDN + Redis cache + Managed backups.
- Estimación mensual: aprox. USD 400–1,200+/mes (según tráfico vídeo y concurrencia de webinars).

4) SaaS (ej. TalentLMS / Docebo)
- Coste mensual: desde USD 200/mes en planes básicos hasta USD 1,000+/mes para opciones con más usuarios y características.
- Ventaja: sin mantenimiento infra; desventaja: menos control y limitaciones de personalización.

Notas: los costes de vídeo (Vimeo/Cloudflare) suelen añadirse: Vimeo Pro/Business desde USD 20–200/mes según plan y consumo; Cloudflare Stream pricing variable por minutos y almacenamiento.

---

## Alcance MVP (priorizado)
Duración estimada: 6–10 semanas (equipo pequeño: 1-2 devs backend, 1 frontend, 0.5 QA, 0.5 PM)

- Semana 1: Setup dev local, instalar Moodle, configurar DB y storage, crear plantilla de curso.
- Semanas 2–4: Desarrollo frontend (login, catálogo cursos, vista curso, reproductor), integración de Moodle REST API, subida de vídeo y SCORM tests.
- Semana 5: Evaluaciones, quizzes y certificados, panel admin básico, pruebas iniciales.
- Semana 6: Webinars (BB or Zoom integration), LRS básico (opcional), QA y ajustes de marca.
- Semana 7–10: Buffer para ajustes, accesibilidad, migración de contenido y preparación de despliegue en Azure.

Estimación esfuerzo: 240–400 horas (aprox. 6–10 semanas equipo pequeño).

---

## Activos de marca y materiales necesarios (inmediato)
- Logos en SVG/PNG (Linex Travel y UltraGroup) — versión con y sin co-branding.
- Paleta de colores y hex codes (los incluí en el manual; confirmar valores finales).
- Tipografía Geist en formatos web o alternativo (si no se puede, usar Calibri como fallback). Confirmar licencia.
- Guía de uso de iconografía y fotografías (proporcionaste manual — necesito archivos fuente si los tienes: AI/PSD/SVG).
- Ejemplo de contenido: 1 curso piloto (guion, vídeo + 1 quiz + recursos PDF).

---

## Riesgos y consideraciones
- Mantenimiento infra: self-hosted requiere parcheo y backups periódicos.
- Streaming de vídeo y webinars pueden generar costes mayores si hay alto consumo o grabaciones.
- SCORM/xAPI: probarle con paquetes reales para validar reproductor y LRS.

---

## Decisiones pendientes (necesito que elijas)
1. Confirmar LMS: Moodle (recomendado) o prefieres evaluar Open edX / SaaS.  
2. ¿Hosting final en Azure? ¿Quieres estimación de coste más detallada para un plan concreto?  
3. Confirmar proveedor vídeo: Vimeo/Cloudflare/servir desde Blob.  
4. ¿Grabar webinars y dejar on-demand? (Sí/No)

---

## Próximos pasos que propongo (elige 1 para avanzar)
- A: Preparar Documento de Requisitos detallado (user stories + criterios de aceptación) — listo para firmar.  
- B: Preparar comparativa de costes Azure (small vs production) y comparativa SaaS (TalentLMS) con números más precisos.  
- C: Maquetar una pantalla de inicio (mockup) en React usando tu manual de marca (necesito activos: logos, colores, tipografía).  
- D: Provisionar entorno dev local (Moodle + Postgres + storage) para demo rápido (podemos usar Docker).  

---

Si quieres, empiezo con **A: Documento de requisitos** (creo el archivo `requisitos_elearning.md`) o con **D: Provisionar entorno dev local** y te muestro la demo. ¿Cuál prefieres?  
