# Especificación: Módulo de Exámenes y Evaluaciones

Versión: 0.1
Fecha: 2026-08-16

Objetivo: Diseñar un módulo de exámenes robusto y flexible que soporte evaluaciones para procesos de ingreso, ascenso y desarrollo interno, inspirado en TestGorilla y prácticas de plataformas como evolCampus.

Principios clave
- Fiabilidad y seguridad: integridad de resultados, trazabilidad y auditoría.
- Flexibilidad: múltiples tipos de test (técnicos, situacionales, psicométricos, habilidades blandas/duras).
- Integración con RRHH: plantillas reutilizables, workflows para procesos de selección y promoción.
- Escalabilidad: banco de preguntas, versiónamiento, y soporte para proctoring si es requerido.

## Funcionalidades principales

1) Banco de preguntas
- Categorías: habilidades duras, habilidades blandas, cognitivas, situacionales, técnicas por rol.
- Tipos de preguntas: opción múltiple, verdadero/falso, respuesta libre (texto), código (snippet), arrastrar y soltar, escenarios/roleplay (video respuesta).
- Metadatos: etiquetas, dificultad, tiempo sugerido, skills mapeadas, área responsable.

2) Plantillas de evaluación
- Creación de plantillas por RRHH: seleccionar preguntas desde banco, asignar pesos por sección, tiempo total, pasaje mínimo (%), y si requiere revisión manual.
- Reutilización en procesos: asociar plantilla a proceso de ingreso o ascenso.

3) Modalidades de ejecución
- Test automático: calificación automática para tipos objetivo (MCQ, VF, código básico con test cases limitados).
- Test mixto: combinación de autocalificado y revisión manual por evaluador.
- Test supervisado: sesiones con monitor (proctoring básico) o revisión por RRHH.

4) Proctoring y anti‑fraude (opcional)
- Niveles:
  - Básico: registro de IP, restricciones por dominio, marcar intentos repetidos.
  - Intermedio: webcam snapshot al inicio y fin (revisable por RRHH), deshabilitar copiar/pegar en la interfaz de examen.
  - Avanzado (opcional integración externa): proctoring vía terceros con detección de pantalla/voz.

5) Reportes y resultados
- Reporte por candidato: puntuación total, detalle por sección, tiempo empleado, respuestas abiertas y notas del evaluador.
- Reporte agregado por proceso/área: distribución de scores, promedios, fallas por ítem.
- Export formats: CSV, PDF.

6) Integración con RRHH y procesos
- Workflow: RRHH crea proceso → asigna plantilla → invita candidato/empleado → test completado → resultados → decisión (contratar/promover/reclamar).
- Roles: Solo `Admin RRHH` y `Superadmin` pueden ver resultados agregados; el evaluado puede ver su resultado si la política lo permite.

7) API y datos
- Endpoints REST para:
  - Crear/actualizar plantillas
  - Crear/consultar test instancia
  - Enviar respuestas y obtener resultado
  - Exportar reportes
- Logs de auditoría en DB: userId, testId, timestamps, IP, evento (start, submit, resume).

8) Seguridad y privacidad
- Datos personales y resultados cifrados en reposo según políticas internas.
- Retención definida por RRHH; exportable para auditoría.

9) UX y accesibilidad
- Interfaz clara para examinar preguntas; tiempo restante visible; guardar respuestas parcial; resumir preguntas completadas.
- Opciones de accesibilidad: fuente ajustable, contraste, lectura por TTS (futuro).

## Integraciones recomendadas
- Integración con Moodle: almacenar metadatos de curso/test; usar SCORM/xAPI para reportar resultados al LRS.
- Integración con TestGorilla (opcional): posibilidad de consumir tests externos por API si se quiere validar candidatos con herramientas especializadas.
- Integración con Teams: programar sesiones/proctoring si se usa modo supervisado.

## Requisitos técnicos mínimos
- Backend: endpoints REST + motor de ejecución para tests.
- Storage: banco de preguntas en MongoDB (fácil modelado de documentos), resultados en Postgres (relacionales) o en Mongo según preferencia. 
- xAPI support: emitir statements para LRS cuando aplique.

## MVP mínimo viable para exámenes
- Banco de preguntas básico con import/export CSV.
- Crear plantilla y ejecutar test autocalificado (MCQ + VF + respuesta libre simple).
- Reporte individual y export CSV.
- Auditoría básica (timestamps, userId, IP).

## Roadmap de funcionalidades avanzadas
1. Proctoring intermedio (webcam snapshots + bloqueo de copiar/pegar).  
2. Tests de código con ejecución sandbox y validación automática.  
3. Integración con TestGorilla para tests especializados.  
4. Analytics avanzado en LRS/Learning Locker y dashboards para RRHH.

---

Archivo generado como base para desarrollar el módulo de exámenes. Puedo convertir esto en historias de usuario detalladas y tareas técnicas si quieres que comencemos la implementación.
